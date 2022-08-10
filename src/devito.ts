import chalk from '@stagas/chalk'
import { transformSync } from '@swc-node/core'
import { arg } from 'decarg'
import { eachDep, EachDepOptions } from 'each-dep'
import { buildSync } from 'esbuild'
import { queue } from 'event-toolkit'
import { discoverFileWithSuffixes } from 'everyday-node'
import * as fs from 'fs'
import gracefulShutdown from 'http-graceful-shutdown'
import * as http2 from 'http2'
import makeCert from 'make-cert'
import { AddressInfo } from 'net'
import * as os from 'os'
import * as path from 'path'
import SSE from 'sse'
import { contentType } from './util'

export class DevitoOptions {
  @arg('<file>', 'Entry point file.') file!: string
  @arg('--root', 'Root directory') root = '.'
  @arg('--port', 'Port') port = 3000
  @arg('--watch', 'Watch for changes') watch = true
  @arg('--quiet', 'Silence output') quiet = false

  entrySource?: string
  alias?: EachDepOptions['alias']
  depCache = new Map() as EachDepOptions['cache']
  forceExit = false

  constructor(options: Partial<DevitoOptions> = {}) {
    Object.assign(this, options)
  }

  get rootPath() {
    return path.resolve(this.root)
  }

  get entryFile() {
    return this.entrySource ? this.file : fs.realpathSync(this.file)
  }
}

export async function devito(partialOptions: Partial<DevitoOptions>) {
  const options = new DevitoOptions(partialOptions)

  const file = await discoverFileWithSuffixes(options.file, ['.ts', '.tsx', '.js', '.jsx', '.md'])
  if (!file) throw new Error('File not found')
  options.file = file

  const log = (...args: any[]) => !options.quiet && console.log(...args)
  const print = (s: string) => log(`${new Date().toLocaleTimeString()} ${s}`)

  // sse clients that will reload when files change or the server (re)starts
  const sseClients = new Set<any>()
  function reload() {
    for (const client of sseClients) {
      client.send('reload')
    }
  }

  // read swc config https://swc.rs/docs/configuration/swcrc
  const swc = Object.assign(
    JSON.parse(fs.readFileSync(path.join(options.rootPath, '.swcrc'), 'utf-8')),
    {
      module: { type: 'es6' },
      sourceMaps: 'inline',
    }
  )

  // https keys
  const keys = makeCert('localhost')

  // entry file
  const entryFile = options.entryFile

  // dependencies cache
  const depCache: EachDepOptions['cache'] = new Map()

  // headers
  let headers: http2.OutgoingHttpHeaders = {
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=604800, immutable',
    ':status': 200,
  }

  // open markdown files
  if (entryFile.endsWith('.md')) {
    headers = {
      'access-control-allow-origin': '*',
      ':status': 200,
    }
    const MarkdownIt = (await import('markdown-it')).default
    const html = MarkdownIt({ html: true }).render(fs.readFileSync(entryFile, 'utf-8'), {})
    const cssPath = require.resolve('github-markdown-css')
    depCache.set(cssPath, { ids: [], source: fs.readFileSync(cssPath, 'utf-8') })
    depCache.set(entryFile, {
      ids: [['github-markdown-css', cssPath]],
      source: `
        import 'github-markdown-css'
        document.body.classList.add('markdown-body')
        document.body.style = 'max-width: 830px; margin: 0 auto;'
        document.body.innerHTML = ${JSON.stringify(html)}
      `,
    })
  }

  // traverse dependencies
  const analyze = async (entryFile: string, entrySource?: string) => {
    const deps = new Set<string>()
    for await (
      const dep of eachDep(entryFile, {
        entrySource,
        external: true,
        alias: options.alias,
        cache: depCache,
      })
    ) {
      deps.add(dep)
    }
  }
  await analyze(options.entryFile, options.entrySource)

  // transform extensions
  const exts = /\.tsx?$/

  // importmap
  const importmap: Record<string, string> = {}

  const watchers: fs.FSWatcher[] = []
  const updateCache = (rootFilter = '/', force = false) => {
    for (const [depPath, dep] of depCache) {
      if (!depPath.startsWith(rootFilter)) continue
      if (force || !dep.source) dep.source = fs.readFileSync(depPath, 'utf-8')

      const { dir, ext } = path.parse(depPath)
      if (ext === '.css') {
        dep.source = `
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(dep.source)};
          document.head.appendChild(style);
        `
      } else if (ext === '.json') {
        dep.source = `
          const json = ${dep.source};
          export default json;
        `
      } else {
        for (const [id, importPath] of dep.ids ?? []) {
          if (!importPath.startsWith(rootFilter)) continue

          if (id.startsWith('.')) {
            const relativePath = path.relative(dir, importPath)
            dep.source = dep.source.replaceAll(
              `'${id}'`,
              `'${(!relativePath.startsWith('.') ? './' : '') + relativePath}'`
            )
          } else {
            importmap[id] = `/@fs${importPath}`
          }
          try {
            depCache.set(importPath + '.map', { source: fs.readFileSync(importPath + '.map', 'utf-8'), ids: [] })
          } catch {}
        }
        if (exts.test(depPath)) {
          ;({ code: dep.source } = transformSync(dep.source, depPath, { swc }))
        }
      }
    }
    log(depCache.size, 'dependencies cached')

    if (options.watch) {
      watchers.splice(0).forEach(x => x.close())
      const watchDirs = new Set([...depCache.keys()].map(x => path.dirname(x)))
      for (const dir of watchDirs) {
        watchers.push(fs.watch(
          dir,
          queue.debounce(50).not.first.not.next.last(() => {
            updateCache(dir, true)
            reload()
          })
        ))
      }
      log(watchDirs.size, 'directories watching')
    }
  }

  updateCache()

  const pushFromMap = (stream: http2.ServerHttp2Stream, map: Map<string, { source?: string }>, key: string) => {
    const pushHeaders: http2.OutgoingHttpHeaders = {
      [http2.constants.HTTP2_HEADER_PATH]: `/@fs${key}`,
    }

    stream.pushStream(pushHeaders, (error, pushStream) => {
      if (error) {
        !options.quiet && console.error(error)
        return
      }
      pushStream.respond({
        ...headers,
        'content-type': 'application/javascript',
      })
      pushStream.on('error', error => {
        log('errored push stream', error)
      })
      pushStream.end(map.get(key)!.source)
    })
  }

  const server = http2.createSecureServer(
    keys,
    async function onRequest(req, res) {
      print(`${req.method === 'GET' ? chalk.grey(req.method) : req.method} ${req.url}`)

      req.stream.on('error', error => {
        log('errored', error)
      })

      if (req.method === 'POST') {
        if (req.url === '/?error') {
          let data = ''
          req.stream.setEncoding('utf-8')
          req.stream.on('data', (chunk: string) => {
            data += chunk
          })
          req.stream.on('end', () => {
            if (data.includes('resolve module specifier')) {
              // TODO: these are randomly discovered scripts that
              //  were not detected when analyzing. The browser reports
              //  a missing script and we try to fetch it and trigger reload

              // const [, id] = data.split('"')
              // // log('need to import:', id, 'from', options.root)
              // const importMetaUrl = `file://${options.rootPath}/`

              // try {
              //   const result = await importMetaResolve(id, importMetaUrl)
              //   if (id === '.') {
              //     log(req.url)
              //   }
              //   // log(req.url, importMetaUrl, id, result)
              //   // log(id, result)
              //   if (id in importmap) {
              //     // log('already in')
              //     reload()
              //     return
              //   }
              //   importmap[id] = '/@fs' + result.split('file://').pop()
              //   reload()
              // } catch (error) {
              //   // log('MODULE ERROR', req.url, importMetaUrl, id)
              // }
            } else if (data.includes('does not provide an export')) {
              const [, id, , name] = data.split('\'')
              log('cjs:', id)
              importmap[id] = importmap[id] + '?esm=' + name + ',' + id
              reload()
            }
            res.stream.end('ok')
          })
          return
        }
      }

      if (req.url === '/favicon.ico') {
        res.stream.respond({ ':status': 404 })
        res.stream.end()
        return
      }

      if (req.url.startsWith('/@fs')) {
        const depPath = req.url.slice(4)
        const [file, query] = depPath.split('?')

        if (depCache.has(depPath)) {
          res.stream.respond({
            ...headers,
            'content-type': 'application/javascript',
            ':status': 200,
          })
          res.stream.end(depCache.get(depPath)!.source)
        } else if (query?.startsWith('esm=')) {
          const [name, id] = query.split('esm=')[1].split(',')
          const result = buildSync({
            entryPoints: [file],
            bundle: true,
            footer: {
              js: name === 'default' ? '' : `;export { default as ${name} } from '${id}';`,
            },
            format: 'esm',
            sourcemap: 'inline',
            write: false,
          })

          const [bundle] = result.outputFiles || []
          const contents = bundle.text
          depCache.set(depPath, { source: contents, ids: [] })
          res.stream.respond({
            ...headers,
            'content-type': 'application/javascript',
            'content-size': bundle.text.length,
            ':status': 200,
          })
          res.stream.end(contents)
        } else if (depCache.has(file)) {
          res.stream.respond({
            ...headers,
            'content-type': 'application/javascript',
            ':status': 200,
          })
          res.stream.end(depCache.get(file)!.source)
        } else {
          // NOTE: workers and other realms dependencies are bundled
          // along with their dependencies because we cannot share/resolve
          // importmaps with those in a clean way yet.
          if (/worker|worklet|processor|iframe/.test(file)) {
            const result = buildSync({
              entryPoints: [file],
              bundle: true,
              format: 'esm',
              sourcemap: 'inline',
              write: false,
            })
            const [bundle] = result.outputFiles || []
            const contents = bundle.text
            depCache.set(file, { source: contents, ids: [] })
            res.stream.respond({
              ...headers,
              'content-type': 'application/javascript',
              'content-size': bundle.text.length,
              ':status': 200,
            })
            res.stream.end(contents)
          } else {
            res.stream.respondWithFile(depPath, {
              ...headers,
              ...contentType(depPath),
              ':status': 200,
            })
          }
        }
        return
      }

      // any other file that wasn't handled yet, serve directly from root
      if (req.url !== '/') {
        res.stream.respondWithFile(path.join(options.rootPath, req.url), {
          ...headers,
          ...contentType(req.url),
          ':status': 200,
        })
        return
      }

      // main server entry
      if (req.url === '/') {
        // push the dependencies
        for (const depPath of depCache.keys()) {
          pushFromMap(res.stream, depCache, depPath)
        }

        // enable live-reload
        res.stream.pushStream({
          [http2.constants.HTTP2_HEADER_PATH]: '/live-reload.js',
        }, (error, pushStream) => {
          if (error) {
            !options.quiet && console.error(error)
            return
          }
          pushStream.respond({
            ...headers,
            'content-type': 'application/javascript',
            ':status': 200,
          })
          pushStream.end(`
            es = new EventSource('/onreload');
            ${options.quiet ? '' : `es.onopen = () => console.warn('live-reload started')`}
            es.onmessage = () => es.onmessage = () => location = location;
          `)
          return
        })

        // send html
        res.stream.respond({
          ...headers,
          'content-type': 'text/html',
          ':status': 200,
        })

        res.stream.end(/*html*/ `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="icon"
      href="data:image/svg+xml,%3Csvg viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='50' cy='47.2' r='34'%0Afill='transparent' stroke='%23fff' stroke-width='7.5' /%3E%3C/svg%3E"
      type="image/svg+xml"
    />
    <title>${path.relative(options.rootPath, entryFile)}</title>
    <style>
      html, body {
        margin: 0;
        padding: 0;
      }

      body {
        --light: #eee;
        --dark: #222;
        --color: var(--dark);
        --background: var(--light);
        color: var(--color);
        background: var(--background)
      }

      @media (prefers-color-scheme: dark) {
        body:not(.light) {
          --color: var(--light);
          --background: var(--dark);
        }
      }
    </style>
  </head>
  <body>
    <main></main>

    <!-- dependencies -->
    <script type="importmap">
      {
        "imports": ${JSON.stringify(importmap)}
      }
    </script>

    <!-- devito runtime -->
    <script>
      // Detect errors and report them to the server.
      // This is used to discover dependencies that were not detected
      // during analyzing and also commonjs modules that can't be
      // imported and need to be transpiled to esm.
      window.addEventListener('error', error => {
        fetch('/?error', { method: 'POST', body: error.message })
      })

      // print current dependency importmap in console for inspection
      ${
          options.quiet ? '' : `
      console.log(
        Object.keys(${JSON.stringify(importmap)}).length,
        ${JSON.stringify(importmap)}
      )
      `
        }
    </script>

    <!-- live-reload script, magically provided by the server -->
    <script src="/live-reload.js"></script>

    <!-- entry point -->
    <script src="/@fs${entryFile}" type="module"></script>
  </body>
</html>`)
      }
    }
  )

  // start SSE handler
  const sse = new SSE(server, { path: '/onreload' })
  sse.on('connection', (client: any) => {
    sseClients.add(client)
    client.send('change')
    client.once('close', () => {
      sseClients.delete(client)
    })
    print('SSE /onreload')
  })

  // start listening
  await new Promise<void>(resolve => server.listen(options.port, 'localhost', resolve))
  const addr = server.address() as AddressInfo
  const url = `https://localhost:${addr.port}`
  log('server listening', { root: options.rootPath.replace(os.homedir(), '~'), addr, url })

  const close = gracefulShutdown(server, { forceExit: options.forceExit })

  return { devito: server, url, analyze, updateCache, close }
}
