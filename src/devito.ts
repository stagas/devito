import chalk from '@stagas/chalk'
import { transformSync } from '@swc-node/core'
import { arg } from 'decarg'
import { eachDep, EachDepOptions } from 'each-dep'
import { buildSync } from 'esbuild'
import { queue } from 'event-toolkit'
import * as fs from 'fs'
import * as http2 from 'http2'
import makeCert from 'make-cert'
import mime from 'mime-types'
import { AddressInfo } from 'net'
import * as os from 'os'
import * as path from 'path'
import SSE from 'sse'

export class DevitoOptions {
  @arg('<file>', 'Entry point file.') file!: string
  @arg('--root', 'Root directory') root = '.'
  @arg('--port', 'Port') port = 3000

  get rootPath() {
    return path.resolve(this.root)
  }

  get entryFile() {
    return fs.realpathSync(this.file)
  }
}

export async function devito(options: DevitoOptions) {
  const print = (s: string) => console.log(`${new Date().toLocaleTimeString()} ${s}`)

  const clients = new Set<any>()

  function refresh() {
    for (const client of clients) {
      client.send('refresh')
    }
  }

  const swc = Object.assign(
    JSON.parse(fs.readFileSync(path.join(options.rootPath, '.swcrc'), 'utf-8')),
    {
      module: { type: 'es6' },
      sourceMaps: 'inline',
    }
  )

  const keys = makeCert('localhost')

  // discover dependencies
  const depCache: EachDepOptions['cache'] = new Map()
  const entryFile = options.entryFile
  const deps = new Set<string>()
  for await (const dep of eachDep(entryFile, { external: true, cache: depCache })) {
    deps.add(dep)
  }

  const exts = /\.tsx?$/
  const importmap: Record<string, string> = {}

  const updateCache = (rootFilter = '/', force = false) => {
    for (const [depPath, dep] of depCache) {
      if (!depPath.startsWith(rootFilter)) continue
      if (force) dep.source = fs.readFileSync(depPath, 'utf-8')

      const { dir, ext } = path.parse(depPath)
      if (ext === '.css') {
        dep.source = `
          const style = document.createElement('style');
          style.textContent = ${JSON.stringify(dep.source)};
          document.head.appendChild(style);
        `
      } else if (ext === '.json') {
        dep.source = `
          export default ${JSON.stringify(dep.source)};
        `
      } else {
        for (const [id, importPath] of dep.ids) {
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
  }

  updateCache()

  const dirs = new Set([...depCache.keys()].map(x => path.dirname(x)))
  for (const dir of dirs) {
    fs.watch(
      dir,
      queue.debounce(50).not.first.not.next.last(() => {
        updateCache(dir, true)
        refresh()
      })
    )
  }

  console.log(depCache.size, 'dependencies cached')
  console.log(dirs.size, 'directories watching')

  const headers = {
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'access-control-allow-origin': '*',
    'cache-control': 'public, max-age=604800, immutable',
    ':status': 200,
  }

  const pushFromMap = (stream: http2.ServerHttp2Stream, map: Map<string, { source: string }>, key: string) => {
    const pushHeaders: http2.OutgoingHttpHeaders = {
      [http2.constants.HTTP2_HEADER_PATH]: `/@fs${key}`,
    }

    stream.pushStream(pushHeaders, (error, pushStream) => {
      if (error) {
        console.error(error)
        return
      }
      pushStream.respond({
        ...headers,
        'content-type': 'application/javascript',
      })
      pushStream.on('error', error => {
        console.log('errored push stream', error)
      })
      pushStream.end(map.get(key)!.source)
    })
  }

  const server = http2.createSecureServer(
    keys,
    async function onRequest(req, res) {
      print(`${req.method === 'GET' ? chalk.grey(req.method) : req.method} ${req.url}`)

      req.stream.on('error', error => {
        console.log('errored', error)
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
              //  a missing script and we try to fetch it and trigger refresh

              // const [, id] = data.split('"')
              // // console.log('need to import:', id, 'from', options.root)
              // const importMetaUrl = `file://${options.rootPath}/`

              // try {
              //   const result = await importMetaResolve(id, importMetaUrl)
              //   if (id === '.') {
              //     console.log(req.url)
              //   }
              //   // console.log(req.url, importMetaUrl, id, result)
              //   // console.log(id, result)
              //   if (id in importmap) {
              //     // console.log('already in')
              //     refresh()
              //     return
              //   }
              //   importmap[id] = '/@fs' + result.split('file://').pop()
              //   refresh()
              // } catch (error) {
              //   // console.log('MODULE ERROR', req.url, importMetaUrl, id)
              // }
            } else if (data.includes('does not provide an export')) {
              const [, id, , name] = data.split('\'')
              console.log('cjs:', id)
              importmap[id] = importmap[id] + '?esm=' + name + ',' + id
              refresh()
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
          const contentType = mime.contentType(path.basename(file)) || 'application/octet-stream'
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
              'content-type': contentType,
              ':status': 200,
            })
          }
        }
        return
      }

      if (req.url !== '/') {
        res.stream.respondWithFile(path.join(options.rootPath, req.url), {
          ...headers,
          'content-type': mime.contentType(path.basename(req.url)) || 'application/octet-stream',
          ':status': 200,
        })
        return
      }

      if (req.url === '/') {
        for (const depPath of depCache.keys()) {
          pushFromMap(res.stream, depCache, depPath)
        }

        res.stream.pushStream({
          [http2.constants.HTTP2_HEADER_PATH]: '/reload.js',
        }, (error, pushStream) => {
          if (error) {
            console.error(error)
            return
          }

          pushStream.respond({
            ...headers,
            'content-type': 'application/javascript',
            ':status': 200,
          })
          pushStream.end(`
            es = new EventSource('/onchange');
            es.onopen = () => console.warn('live-reload started')
            es.onmessage = () => es.onmessage = () => location = location;
          `)
          return
        })

        res.stream.respond({
          ...headers,
          'content-type': 'text/html',
          ':status': 200,
        })

        res.stream.end(/* html */ `<!DOCTYPE html>
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
    <script src="/reload.js"></script>
    <script type="importmap">
      {
        "imports": ${JSON.stringify(importmap)}
      }
    </script>

    <script>
      console.log(Object.keys(${JSON.stringify(importmap)}).length, ${JSON.stringify(importmap)})
      window.addEventListener('error', error => {
        fetch('/?error', { method: 'POST', body: error.message })
      })
    </script>
    <script src="/@fs${entryFile}" type="module"></script>
  </body>
</html>`)
      }
    }
  )

  const sse = new SSE(server, { path: '/onchange' })
  sse.on('connection', (client: any) => {
    clients.add(client)
    client.send('change')
    client.once('close', () => {
      clients.delete(client)
    })
    print('SSE /onchange')
  })

  server.listen(options.port, 'localhost', () => {
    const addr = server.address() as AddressInfo
    const url = `https://localhost:${addr.port}`
    console.log({ root: options.rootPath.replace(os.homedir(), '~'), addr })
    console.log('server listening:', url)
  })
}
