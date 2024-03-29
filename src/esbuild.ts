import { BuildContext, BuildResult, Metafile, context } from 'esbuild'
import alias from 'esbuild-plugin-alias'
import * as fs from 'fs'
import * as path from 'path'
import { Deferred, debounce } from 'utils'
import { FS_PREFIX, esbuildCommonOptions, readFile } from './core.ts'
import { hmr, importMetaUrl, importResolve, logger, markdown, pipe } from './esbuild-plugins.ts'
import { exists } from 'node-utils'

export interface EsbuildOptions {
  entryFile: string
  entrySource?: string
  entryResolveDir?: string
  rootPath: string
  bundle: boolean
  alias?: Record<string, string>
  inlineSourceMaps?: boolean
  disableSourceMaps?: boolean
  hmr?: boolean
  d2?: boolean
  esm?: boolean
  watch: boolean
  homedir: string
  logger: boolean
}

/**
 * Watch an esbuild metafile for changes in its inputs, and call `cb` whenever they
 * change with a set of filenames that changed.
 */
export function watchMetafile(
  homedir: string,
  watchers: fs.FSWatcher[],
  metafile: Metafile,
  cb: (changed: Set<string>) => void,
) {
  const debounced = debounce(200, cb)
  const changed = new Set<string>()

  function collect(pathname: string) {
    changed.add(pathname)
    debounced(changed)
  }

  function onchange(dirname: string, filename: string) {
    const target = path.join(dirname, filename).replace(homedir, '').slice(1)
    if (!filename.endsWith('.map') && filenames.has(target)) {
      collect(target)
    }
  }

  watchers.splice(0).forEach(x => x.close())

  const filenames = new Set(Object.keys(metafile.inputs))
  const watchDirs = new Set([...filenames].map(x => path.dirname(x)))

  for (const dir of watchDirs) {
    const dirname = path.join(homedir, dir)
    watchers.push(
      fs.watch(
        dirname,
        (_, filename) => {
          if (filename) onchange(dirname, filename)
        }
      )
    )
  }
  return watchDirs
}

export class Esbuild {
  constructor(public options: EsbuildOptions) {
    this.deferred.promise.catch(() => { })
  }

  bundle: Record<string, Uint8Array> = {}
  stats: Record<string, { mtime: Date; size: number }> = {}

  onchange?: (files: Set<string>) => void
  onbeforerebuild?: () => void

  watchers: fs.FSWatcher[] = []
  watch() {
    if (this.options.watch) {
      const watchDirs = watchMetafile(
        this.options.homedir,
        this.watchers,
        this.result!.metafile!,
        async files => {
          this.onchange?.(files)
          this.rebuild()
        }
      )
      return watchDirs.size
    }
    return 0
  }

  ctx?: BuildContext
  result?: BuildResult
  async build() {
    if (this.ctx) {
      this.ctx.dispose()
    }

    if (this.options.entrySource) {
      const deferred = Deferred<string>()
      const accessTime = performance.now()
      deferred.resolve(this.options.entrySource)
      readFile.cache.set(this.options.entryFile, { deferred, accessTime })
    }

    try {
      let tsconfig: string = path.join(this.options.rootPath, 'tsconfig.json')
      if (!(await exists(tsconfig))) tsconfig = ''

      const plugins = [] as any

      plugins.push(logger)
      if (!this.options.bundle) plugins.push(importResolve)
      if (this.options.hmr) plugins.push(hmr)
      if (!this.options.esm || this.options.bundle) plugins.push(importMetaUrl)

      this.ctx = await context({
        ...esbuildCommonOptions,
        entryPoints: [this.options.entryFile],
        bundle: this.options.bundle,
        tsconfig,
        // incremental: this.options.entrySource ? false : true,
        sourceRoot: `/${FS_PREFIX}`,
        outfile: path.join(this.options.homedir, 'bundle.js'),
        sourcemap: this.options.disableSourceMaps ? false : this.options.inlineSourceMaps ? 'inline' : 'linked',
        absWorkingDir: this.options.homedir,
        plugins: [
          plugins.length > 1
            ? pipe({
              filter: /\.m?[jt]sx?$/,
              plugins,
              logger: this.options.logger
            })
            : plugins[0],
          markdown,
          this.options.alias && alias(this.options.alias),
        ].filter(Boolean),
      })

      const result = await this.ctx.rebuild().catch(console.warn)

      if (result) {
        this.result = result
        return this.result
      }
    } catch (error) {
      console.error(error)
    }
  }

  running = false
  deferred = Deferred<void>()
  defer() {
    if (!this.deferred.hasSettled) {
      this.deferred.reject(new Error('Interrupted old build for new build'))
    }
    this.deferred = Deferred()
    this.deferred.promise.catch(console.error)
  }

  consume = (result: BuildResult | void) => {
    if (!result?.outputFiles) {
      this.deferred.reject(new Error('No files generated'))
      return
    }

    try {
      if (this.result) this.result.metafile = result.metafile
      const mtime = new Date()
      for (const file of result.outputFiles) {
        const pathname = file.path.replace(this.options.homedir, '')
        this.bundle[pathname] = file.contents
        this.stats[pathname] = {
          mtime,
          size: file.contents.length,
        }
      }

      // prevent not found errors when no css was produced by esbuild
      if (!this.bundle['/bundle.css']) {
        this.bundle['/bundle.css'] = new Uint8Array()
        this.stats['/bundle.css'] = {
          mtime,
          size: 0,
        }
      }
    } catch { }

    this.deferred.resolve()
  }

  rebuild: () => Promise<void> = debounce(200, async () => {
    if (this.options.entrySource) {
      const deferred = Deferred<string>()
      const accessTime = performance.now()
      deferred.resolve(this.options.entrySource)
      readFile.cache.set(this.options.entryFile, { deferred, accessTime })
    }

    this.defer()
    this.onbeforerebuild?.()

    // TODO: display the .catch() error in the client
    if (this.options.entrySource) {
      this.build().then(this.consume).catch(this.consume)
    } else {
      this.ctx!.rebuild().then(this.consume).catch(this.consume)
    }
  })
}

export async function createEsbuild(options: EsbuildOptions) {
  const esbuild = new Esbuild(options)
  await esbuild.build().catch(console.warn)
  return esbuild
}
