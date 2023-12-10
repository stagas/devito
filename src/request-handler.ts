import chalk from '@stagas/chalk'
import { eachDep, EachDepOptions } from 'each-dep'
import { contentType, etag, fsStats, HttpContext, print, serveStatic, startTask } from 'easy-https-server'
import { build } from 'esbuild'
import alias from 'esbuild-plugin-alias'
import { discoverFileWithSuffixes, exists } from 'everyday-node'
import * as fs from 'fs'
import { OutgoingHttpHeaders } from 'http'
import openInEditor from 'open-in-editor'
import { applySourceMaps } from 'apply-sourcemaps'
import { serveD2, sseD2 } from './d2'
import * as os from 'os'
import * as path from 'path'
import civetPlugin from '@danielx/civet/esbuild-plugin'

import {
  clearDevitoCaches,
  createResourceCache,
  esbuildCommonOptions,
  forgetFile,
  FS_PREFIX,
  isWorker,
  // link,
  ResourceCache,
} from './core'
import { DevitoOptions } from './devito'
import { Esbuild, watchMetafile } from './esbuild'
import { css, hmr, importMetaUrl, importResolve, logger, pipe } from './esbuild-plugins'
import { mainHtml } from './main-html'
import { SSE } from './sse'
import { d2Plugin } from './d2-plugin'

const suffixes = [
  '.ts',
  '.tsx',
  '.mts',
  '.mjs',
  '.js',
  '.jsx',
  '.cjs',
  '.civet',
  '/index.ts',
  '/index.tsx',
  '/index.mts',
  '/index.mjs',
  '/index.js',
  '/index.jsx',
  '/index.cjs',
]

export let esbuildCache: ResourceCache<Uint8Array>

export async function requestHandler(
  request: AsyncIterable<HttpContext>,
  esbuild: Esbuild | undefined,
  sse: ReturnType<typeof SSE>,
  options: DevitoOptions,
) {
  const commonHeaders: OutgoingHttpHeaders = {
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-embedder-policy': 'require-corp',
    'access-control-allow-origin': '*',
  }

  //
  // analyze
  //

  // analyze dependencies cache
  const analyzeCache: EachDepOptions['cache'] = new Map()

  // traverse dependencies
  const analyze = async (entryFile: string, entrySource?: string) => {
    const deps = new Set<string>()
    for await (
      const dep of eachDep(entryFile, {
        entrySource,
        external: true,
        alias: options.alias,
        cache: analyzeCache,
      })
    ) {
      deps.add(dep)
    }
  }

  if (!options.bundle) {
    await analyze(options.entryFile, options.entrySource)
    for (const p of options.extraAnalyzePaths) {
      await analyze(p)
    }
  }

  // esbuild

  if (esbuild) {
    esbuild.onchange = async (files: Set<string>) => {
      print(chalk.cyan('INF'), 'changed')
      const forgetFiles = [...files].map(x => path.join(options.homedir, x))
      forgetFiles.forEach(forgetFile)
    }
    esbuild.onbeforerebuild = () => {
      sse.broadcast({
        type: 'update',
        payload: ['/bundle.js', '/bundle.css'],
      })
    }
    esbuild.defer()
    esbuild.consume(esbuild.result)
  }

  const esbuildWatchers = new Map<string, fs.FSWatcher[]>()

  // const busy = new Set()

  esbuildCache = createResourceCache(
    fsStats,
    async (pathname: string) => {
      let tsconfig: string | undefined = path.join(options.rootPath, 'tsconfig.json')
      if (!(await exists(tsconfig))) tsconfig = void 0

      // if (busy.has(pathname)) {
      //   throw new Error('Busy')
      // }

      // busy.add(pathname)

      const format = (
        options.esm
        || pathname.includes('dom-recorder')
      )
        && !isWorker(pathname)
        ? 'esm'
        : 'iife'

      const bundle = isWorker(pathname) || options.bundle

      const plugins = [] as any

      plugins.push(logger)
      if (!bundle) plugins.push(importResolve)
      if (options.hmr) plugins.push(hmr)
      if (options.d2) plugins.push(d2Plugin)
      if (format !== 'esm' || bundle) plugins.push(importMetaUrl)

      if (isWorker(pathname)) clearDevitoCaches()

      // try {
      const result = await build({
        ...esbuildCommonOptions,
        format,
        bundle,
        entryPoints: [pathname],
        sourceRoot: `/${FS_PREFIX}`,
        sourcemap: options.disableSourceMaps ? false : esbuildCommonOptions.sourcemap,
        absWorkingDir: options.homedir,
        tsconfig,
        plugins: [
          civetPlugin(),
          plugins.length > 1
            ? pipe({
              filter: /\.m?[jt]sx?$/,
              plugins,
              logger: options.logger
            })
            : plugins[0],
          css,
          options.alias && alias(options.alias),
        ].filter(Boolean),
      })

      const [res] = result.outputFiles!

      if (options.watch) {
        let watchers = esbuildWatchers.get(pathname)
        if (!watchers) esbuildWatchers.set(pathname, watchers = [])

        watchMetafile(
          options.homedir,
          watchers,
          result.metafile!,
          (pathnames: Set<string>) => {
            const forgetFiles = [
              pathname,
              ...[...pathnames]
                .map(p => path.join(options.homedir, p)),
            ]

            forgetFiles.forEach(forgetFile)

            sse.broadcast({
              type: 'update',
              payload: [...pathnames].map(x => `/${FS_PREFIX}/${x}`),
            })
          }
        )
      }

      return res.contents
      // } finally {
      //   busy.delete(pathname)
      // }
    }
  )

  const report = () => {
    if (esbuild)
      print(
        'INF',
        Object.keys(esbuild.result?.metafile?.inputs ?? {}).length,
        'files bundled',
        esbuild.watchers.length,
        'dirs watching',
        sse.clients.size,
        'clients connected'
      )
  }

  // store

  const store = new Map<string, string>()

  // caches

  const caches = new Map<string, { 'cache-control': string; etag: string }>()

  const cache = (s: string) => options.cache ? s : 'no-store'

  caches.set('/', {
    'cache-control': cache('public, max-age=720'),
    etag: etag({ mtime: new Date(), size: 0 }),
  })

  caches.set('/devito.js', {
    'cache-control': cache('public, max-age=720'),
    etag: etag({ mtime: new Date(), size: 1 }),
  })

  caches.set('/devito-sw.js', {
    'cache-control': cache('public, max-age=720'),
    etag: etag({ mtime: new Date(), size: 2 }),
  })

  // open in editor middleware

  const editor = openInEditor.configure({
    editor: options.editor,
    dotfiles: 'allow',
  })

  async function respond(req: HttpContext['req'], res: HttpContext['res']) {
    const ifNoneMatch = req.headers['if-none-match'] ?? ''

    let pathname = req.url.split('?')[0]

    function serveEntryPoint() {
      startTask(true)

      const cacheControl = caches.get('/')!

      const headers = {
        ...commonHeaders,
        ...cacheControl,
      }

      if (ifNoneMatch && ifNoneMatch === cacheControl.etag) {
        res.writeHead(304, headers)
        res.end()
        return
      }

      const title = path.relative(options.rootPath, options.entryFile)
      const payload = mainHtml(title, options)

      res.writeHead(200, {
        ...headers,
        'content-type': 'text/html',
        'content-size': Buffer.byteLength(payload),
      })

      res.end(payload)

      return
    }

    // KV store
    if (pathname === '/store') {
      const key = req.url.split('?key=')[1]
      if (req.method === 'POST') {

        let data = ''
        req.setEncoding('utf-8')
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          store.set(key, data)
          res.writeHead(201)
          res.end()
        })
        return
      }

      else if (req.method === 'GET') {
        if (store.has(key)) {
          const json = store.get(key)!
          res.writeHead(200, {
            'content-type': 'application/json',
            'content-size': Buffer.byteLength(json)
          })
          res.end(json)
        }
        else {
          res.writeHead(404)
          res.end()
        }
        return
      }

      else {
        res.writeHead(405)
        res.end()
      }
    }

    // applySourceMaps
    if (pathname === '/apply-sourcemaps') {
      if (req.method === 'POST') {

        let data = ''
        req.setEncoding('utf-8')
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', async () => {
          const json = await applySourceMaps(data)
          res.writeHead(200, {
            'content-type': 'application/json',
            'content-size': Buffer.byteLength(json)
          })
          res.end(json)
        })
        return
      }
      else {
        res.writeHead(405)
        res.end()
      }
    }

    if (req.method === 'POST') {
      //
      // POST /@fs/file[:line[:col]]
      //
      // Opens file in editor.
      //

      const fsPath = req.url.slice(FS_PREFIX.length + 1)
      const filename = path.join(os.homedir(), fsPath)

      if (req.url.startsWith(`/${FS_PREFIX}/`) && (await exists(filename.split(':')[0]))) {
        try {
          await editor.open(filename)
        }
        catch (error) {
          res.writeHead(500)
          res.end((error as Error).message)
          return
        }
        res.writeHead(200, {
          'content-type': 'text/html'
        })
        res.end('<script>window.close()</script>')
        return
      }

      print('404', filename.replace(os.homedir(), `/${FS_PREFIX}`))
      res.writeHead(404)
      res.end()
      return
    }

    if (pathname === '/apply-sourcemaps') {
      const queryString = decodeURIComponent(req.url.split('?')[1])
      const payload = await applySourceMaps(queryString, url => url)

      res.writeHead(200, {
        'content-type': 'text/plain',
        'content-size': Buffer.byteLength(payload),
      })

      res.end(payload)

      return
    }

    //
    // GET /onreload
    //

    if (req.url === '/onreload') {
      sse.start(req, res)
      return
    }

    //
    // GET /favicon.ico
    //

    if (req.url === '/favicon.ico') {
      res.statusCode = 404
      res.end()
      return
    }

    if (req.url === '/dom-recorder.js') {
      req.url = pathname = require.resolve('dom-recorder').replace(os.homedir(), `/${FS_PREFIX}`).replace('cjs', 'esm')
    }

    //
    // GET / (home)
    //

    if (pathname === '/') {
      if (esbuild) {
        serveEntryPoint()
        return
      }
      else {
        const headers = {
          location: options.file,
        }
        res.writeHead(302, headers)
        res.end()
        return
      }
    }

    if (pathname === '/devito-sw.js') {
      const cacheControl = caches.get('/devito-sw.js')!

      const headers = {
        ...commonHeaders,
        ...cacheControl,
      }

      if (ifNoneMatch && ifNoneMatch === cacheControl.etag) {
        res.writeHead(304, headers)
        res.end()
        return
      }

      res.writeHead(200, {
        ...headers,
        'content-type': 'application/javascript',
      })

      res.end(/*ts*/ `
        const es = new EventSource('/onreload')

        let started = false

        es.onmessage = async ({ data }) => {
          const { type, payload } = JSON.parse(data)

          const cache = await caches.open('v1')

          if (type === 'start') {
            await caches.delete('v1')
            started = true
          }

          if (type === 'update') {
            for (const target of payload) {
              cache.delete(target)
            }
          }
        }

        async function cachedResponse(event) {
          // const response = await caches.match(event.request);
          // if (response) return response;

          return fetch(event.request, { cache: 'reload' }).then(response => {
            if (!new URL(event.request.url).protocol.startsWith('http')) return response;

            let responseClone = response.clone();

            caches.open('v1').then(function (cache) {
              cache.put(event.request, responseClone)
            })

            return response
          })
        }

        addEventListener('fetch', event => {
          // if (!started) return

          if (event.request.url.endsWith('.js')
          || event.request.url.endsWith('.js.map')
          || event.request.url.endsWith('.css')
          || event.request.url.endsWith('.css.map')
          ) {
            event.respondWith(cachedResponse(event));
          }
        });
      `)

      return
    }

    //
    // GET /d2
    //

    if (pathname.startsWith('/d2')) {
      sseD2(req, res)
      return
    }

    if (pathname === '/devito.js') {
      const cacheControl = caches.get('/devito.js')!

      const headers = {
        ...commonHeaders,
        ...cacheControl,
      }

      if (ifNoneMatch && ifNoneMatch === cacheControl.etag) {
        res.writeHead(304, headers)
        res.end()
        return
      }

      res.writeHead(200, {
        ...headers,
        'content-type': 'application/javascript',
      })

      res.end(
        `
        navigator.serviceWorker.register('/devito-sw.js');
        `
        + (!options.watch ? '' : `
        const es = new EventSource('/onreload');
        ${options.quiet ? '' : `
        es.onopen = () => console.log('live-reload started')
        `}

        let errors
        let debounceReloadTimeout
        es.onmessage = () => es.onmessage = async ({ data }) => {
          ${options.hmr ? `
          if (errors) errors.remove()

          const message = JSON.parse(data)

          if (message.type === 'start') {
            es.close()
            setTimeout(() => {
              location.reload()
            }, 50)
            return
          }

          if (message.type === 'error') {
            document.head.appendChild(Object.assign(document.createElement('style'), {
              textContent: \`
              .devito-errors {
                position: fixed;
                zIndex: 9999999;
                left: 0;
                bottom: 0;
              }
              .devito-error {
                background: #000;
                padding: 10px;
                color: #fff;
              }
              .devito-error:hover {
                text-decoration: underline;
                cursor: pointer;
              }
              \`
            }))

            errors = Object.assign(document.createElement('div'), {
              className: 'devito-errors'
            })
            document.body.appendChild(errors)

            let i = 0

            for (const e of message.payload) {
              console.warn(e.text, e)

              const url = location.origin + '/@fs/' + e.location.file + ':' + e.location.line + ':' + e.location.column

              const smallUrl = e.location.file + ':' + e.location.line + ':' + e.location.column

              const el = Object.assign(
                document.createElement('pre'),
                {
                  className: 'devito-error',
                  onclick: () => {
                    fetch(url, { method: 'POST' })
                  },
                  innerHTML: e.text + '\\n\\nat ' + smallUrl + '</p>'
                }
              )

              errors.appendChild(el)
            }
          }
          else {
            if (message.type === 'update') {
              // noop
            }
            else {
              console.log(message.type, message.payload)
            }
          }

          window.postMessage(message)

          ` : `

          clearTimeout(debounceReloadTimeout)
          debounceReloadTimeout = setTimeout(() => {
            es.close()
            setTimeout(() => {
              location.reload()
            }, 50)
          }, 200)

          `}
        }
        `)
      )

      return
    }

    //
    // GET /bundle*
    //

    if (esbuild && req.url.startsWith(`/bundle`)) {
      startTask()

      try {
        await esbuild.deferred.promise
      }
      catch (e) {
        const error: any = e
        res.writeHead(500)
        res.end()
        sse.broadcast({ type: 'error', payload: 'errors' in error ? error.errors : [error] })
        return
      }

      const bundleFile = req.url

      if (!(bundleFile in esbuild.stats)) {
        res.writeHead(404)
        res.end()
        return
      }

      const cacheControl = {
        'cache-control': cache('public, max-age=0'),
        etag: etag(esbuild.stats[bundleFile]),
      }

      const headers = {
        ...commonHeaders,
        ...cacheControl,
      }

      if (ifNoneMatch === cacheControl.etag) {
        res.writeHead(304, headers)
        res.end()
        return
      }

      res.writeHead(200, {
        ...headers,
        ...contentType(bundleFile),
        'content-size': esbuild.stats[bundleFile].size,
      })

      await res.promises.end(esbuild.bundle[bundleFile])

      if (bundleFile.endsWith('.js.map') && options.watch) {
        setTimeout(() => {
          esbuild.watch()
          report()
        }, 100)
      }

      return
    }

    //
    // GET /~/*
    //
    // File system dynamic esbuilds (for workers etc.)
    //

    const isHome = req.url.startsWith(`/${FS_PREFIX}/`)
    const isSourceCode = /(\.m?[jt]sx?)$/.test(pathname) // |\.json
    const isJsxImportSource = /jsx-runtime$/.test(pathname)

    pathname = isHome ? pathname.slice(FS_PREFIX.length + 1) : pathname
    pathname = path.join(isHome ? os.homedir() : options.rootPath, pathname)

    if (isSourceCode || (isHome && isJsxImportSource)) {
      // if (isJsxImportSource) {
      pathname = (await discoverFileWithSuffixes(pathname, suffixes)) || pathname
      // }

      if (!(await exists(pathname))) {
        if (options.spa) {
          serveEntryPoint()
        }
        else {
          res.writeHead(404)
          res.end()
        }
        return
      }

      try {
        const { stats, payload } = await esbuildCache.getOrUpdate(pathname, `${isWorker(pathname)}`)

        const cacheControl = {
          'cache-control': cache('public, no-store'),
          etag: etag(stats),
        }

        const headers = {
          ...commonHeaders,
          ...cacheControl,
        }

        if (ifNoneMatch === cacheControl.etag) {
          res.writeHead(304, headers)
          res.end()
          return
        }

        res.writeHead(200, {
          ...headers,
          'content-type': 'application/javascript',
          'content-size': payload.length,
        })

        res.end(payload)
      }
      catch (e) {
        console.warn(e)
        const error: any = e
        res.writeHead(500)
        res.end()
        sse.broadcast({ type: 'error', payload: 'errors' in error ? error.errors : [error] })
      }

      return
    }

    //
    // GET /*
    //
    // Raw static files.
    //

    if (await exists(pathname)) {
      if (pathname.endsWith('.d2')) {
        serveD2(req, res, pathname)
      }
      else {
        await serveStatic(req, res, pathname, {
          cache: cache('public, max-age=720'),
          outgoingHeaders: commonHeaders,
        })
      }
    }
    else {
      if (options.spa) {
        serveEntryPoint()
      }
      else {
        res.writeHead(404)
        res.end()
      }
    }
  }

  // start responding to requests

  for await (const { req, res } of request) {
    print(req.method, chalk.white(req.url))
    respond(req, res)
  }
}
