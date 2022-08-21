import chalk from '@stagas/chalk'
import { arg } from 'decarg'
import { discoverFileWithSuffixes } from 'everyday-node'
import * as fs from 'fs'
import { ServerOptions } from 'https'
import makeCert from 'make-cert'
import * as os from 'os'
import * as path from 'path'
import qrcode from 'qrcode-terminal'

import { getNetworkAddress } from './core'
import { createEsbuild, Esbuild } from './esbuild'
import { createEsbuildPluginCaches } from './esbuild-plugins'
import { createHttpsServer } from './https-server'
import { requestHandler } from './request-handler'
import { SSE } from './sse'
import { hr, logOptions, print } from './util'

export class DevitoOptions {
  @arg('<file>', 'Entry point file.') file!: string
  @arg('--root', 'Root directory') root = '.'
  @arg('--host', 'Hostname') hostname = 'devito.test'
  @arg('--port', 'Starting port') startPort = 3000
  @arg('--ip', 'IP address') ipAddress = '0.0.0.0'
  @arg('--cert', 'Certificates path') cert: string | ServerOptions = process.env.SSL_CERTS_DEVITO
    ?? path.join(os.homedir(), '.ssl-certs', 'devito.test')
  /** `homedir` is the common ancestor used to resolve dependency paths relative to,
   * in order for sourcemaps to work and also the "open in editor" feature
   * when clicking at the filename in devtools console output.
   */
  @arg('--homedir', 'Home dir, common ancestor of all dependencies') homedir = '~'
  @arg('--editor', 'Editor to open files in') editor = 'code'
  @arg('--bundle', 'Serve bundled') bundle = true
  @arg('--inlineSourceMaps', 'Inline sourcemaps') inlineSourceMaps = false
  @arg('--cache', 'Caching') cache = true
  @arg('--watch', 'Watch for changes') watch = true
  @arg('--quiet', 'Silence output') quiet = false

  port = this.startPort
  entrySource?: string
  entryResolveDir?: string

  alias?: Record<string, string>

  extraAnalyzePaths: string[] = []

  constructor(options: Partial<DevitoOptions> = {}) {
    Object.assign(this, options)
    if (this.homedir === '~') this.homedir = os.homedir()
    if (this.file?.endsWith('/')) this.file = this.file.slice(0, -1)
  }

  get rootPath() {
    return path.resolve(this.root)
  }

  get entryFile() {
    return this.entrySource ? path.resolve(process.cwd(), this.file) : fs.realpathSync(this.file)
  }
}

export async function devito(partialOptions: Partial<DevitoOptions>) {
  const options = new DevitoOptions(partialOptions)

  const exts = ['.ts', '.mts', '.tsx', '.mtsx', '.mjs', '.mjsx', '.jsx', '.js', '.md', '.html']

  options.file = options.entrySource
    ? options.file
    : (await discoverFileWithSuffixes(options.file, [...exts, ...exts.map(x => '/index' + x)])) || options.file

  Object.assign(logOptions, options)

  createEsbuildPluginCaches(options)
  let esbuild: Esbuild | undefined
  if (!options.file.endsWith('.html')) {
    esbuild = await createEsbuild(options)
  }

  const sse = SSE()

  const keys: ServerOptions = typeof options.cert === 'object'
    ? options.cert
    : options.cert === 'auto'
    ? makeCert(options.hostname)
    : {
      cert: fs.readFileSync(options.cert + '.pem'),
      key: fs.readFileSync(options.cert + '-key.pem'),
    }

  const { server, request } = createHttpsServer(keys)

  requestHandler(request, esbuild, sse, options)

  options.port = await server.tryListen(options)

  hr(chalk.blue)
  const localAddress = `https://${options.hostname}:${options.port}`
  const networkAddress = getNetworkAddress(options)
  logOptions.localAddress = localAddress
  if (!options.quiet) {
    qrcode.generate(networkAddress, { small: true })
  }
  print('LSN', chalk.yellow.underline(localAddress))
  print('LSN', chalk.yellow.underline(networkAddress))
  print('OPN', options.file)

  return {
    url: localAddress,
    options,
    esbuild,
    async close() {
      esbuild?.result?.rebuild?.dispose()
      server.promises.close()
    },
  }
}
