import { fsStats } from 'easy-https-server'
import { OnLoadArgs, OnLoadOptions, OnLoadResult, Plugin } from 'esbuild'
import * as fs from 'fs'
import * as path from 'path'
import { createResourceCache, FS_PREFIX, readFile, ResourceCache } from './core'

export let importMetaCache: ResourceCache<OnLoadResult>
export let loggerCache: ResourceCache<OnLoadResult>
export let hmrCache: ResourceCache<OnLoadResult>
export let cssCache: ResourceCache<OnLoadResult>
export let d2Cache: ResourceCache<OnLoadResult>
let homedir: string
let alias: Record<string, string> | void

export function logIt(kind: string, text: string) {
  return (`
;(function _logcall() {
  var op, ops = log[${kind}](${text});
  while (op = ops.shift()) console[op[0]](...op[1]);
}).call(this);
`).replaceAll(/(\s{2,}|\n)/gm, ' ')
}

function logDeco(s: string, contents: string) {
  let i = -1, p1, p2, fnName: string
  const regexp = new RegExp(`^\s+${s}`, 'g')
  do {
    regexp.lastIndex = i + 1
    i = regexp.exec(contents)?.index ?? -1
    if (i >= 0 && contents.lastIndexOf('//', i) <= contents.lastIndexOf('\n', i)) {
      const indentSize = i - contents.lastIndexOf('\n', i)
      p1 = i
      p2 = contents.indexOf('(', i + 1)
      if (p2 === -1) break

      fnName = contents.slice(p1 + 1, p2).trim()

      i = contents.indexOf(')', i + 1)
      i = contents.indexOf('{', i + 1)
      const toAdd = ';log(' + JSON.stringify(fnName) + ');'
      contents = contents.slice(0, i + 1) + toAdd + contents.slice(i + 1)
      i += toAdd.length

      if (s === 'fx') {
        i = contents.indexOf('\n' + '}'.padStart(indentSize), i + 1)
        const toAdd = ';log(' + JSON.stringify(fnName) + ',"(end)");'
        contents = contents.slice(0, i + 1) + toAdd + contents.slice(i + 3)
        i += toAdd.length + 1
      }
    }
  } while (i >= 0)
  return contents
}
const logExplicitReplaceString = logIt('"info$<cmd>"', '$<args>')
const logCommentReplaceString = logIt('"$<op>"', '"$<text>"')
const logActive = /^log\.active/m
const logRegExp = /[^\.]log(?<cmd>\.pretty)?\((?<args>.+)\)/g
const logCommentRegExp = /\/\/!(?<op>[><:]) (?<text>.+)/g
export function createEsbuildPluginCaches(options: { homedir: string; alias?: Record<string, string> }) {
  homedir = options.homedir
  alias = options.alias

  importMetaCache = createResourceCache(fsStats, async (pathname: string, contents?: string) => {
    contents ??= await readFile(pathname)

    const importMetaPathname = `${pathname.replaceAll(options.homedir, '/' + FS_PREFIX)}`
    // the heuristics here are when the script is running inside an about:srcdoc (or similar)
    // and is missing location.host, location.origin is 'null' (string), so we try to discover it by using the ancestorOrigins
    const importMetaUrl =
      `(location.origin === 'null' ? new URL(location.ancestorOrigins[0]).origin : location.origin) + "${importMetaPathname}"`

    contents = contents.replaceAll('import.meta.url', importMetaUrl)

    return {
      contents,
      loader: ((loaders as any)[path.extname(pathname)] ?? 'js') as 'js',
    } as OnLoadResult
  })

  loggerCache = createResourceCache(fsStats, async (pathname: string, contents: string | undefined, options: { logger: boolean }) => {
    contents ??= await readFile(pathname)

    if (!pathname.endsWith('.d.ts')) {
      if (options.logger) {
        const isActive = logActive.test(contents)
        if (
          logActive
          || (logRegExp.test(contents)
            || logCommentRegExp.test(contents))) {
          // console.log(pathname)
          const isLocal = true //options.logger && pathname.startsWith(process.cwd())
          const replacer1 = isLocal && isActive ? logExplicitReplaceString : ''
          const replacer2 = isLocal && isActive ? logCommentReplaceString : ''
          let prefix = ''
          if (isLocal && isActive && !contents.includes('log = logger')) {
            prefix = `import { logger } from 'utils';const log = logger(import.meta.url);`
          }

          contents = logDeco('@fx', contents)
          contents = logDeco('@fn', contents)
          contents = logDeco('@init', contents)
          contents = logDeco('get', contents)

          contents = `${prefix}${contents
            .replace(logRegExp, replacer1)
            .replace(logCommentRegExp, replacer2)
            }`
        }
      }
      else {
        contents = contents
          .replace(logActive, '')
          .replace(logRegExp, '')
          .replace(logCommentRegExp, '')
      }
    }

    return {
      contents,
      loader: ((loaders as any)[path.extname(pathname)] ?? 'js') as 'js',
    } as OnLoadResult
  })

  hmrCache = createResourceCache(fsStats, async (pathname: string, contents?: string) => {
    contents ??= await readFile(pathname)

    if (contents.includes('export ') && contents.includes('hmr(')) {
      contents = contents.replace('hmr(', 'hmr(import.meta.url,')
    }

    return {
      contents,
      loader: ((loaders as any)[path.extname(pathname)] ?? 'js') as 'js',
    } as OnLoadResult
  })

  cssCache = createResourceCache(fsStats, async (pathname: string) => {
    let contents = await readFile(pathname)

    contents = `
      const style = document.createElement('style');
      style.textContent = ${JSON.stringify(contents)};
      document.head.appendChild(style);`

    return {
      contents,
      loader: 'js',
    } as OnLoadResult
  })
}

export const importMetaUrl = {
  name: 'import-meta-url',
  setup(build, { transform } = {} as any) {
    const transformContents = async ({ args, contents }: { args: OnLoadArgs; contents: string }) => {
      const item = await importMetaCache.getOrUpdate(args.path, `${build.initialOptions.bundle}`, contents)
      return item.payload
    }

    if (transform) return transformContents(transform)

    build.onLoad({ filter: /\.m?[jt]sx?$/ }, async args => {
      const contents = await readFile(args.path)

      return transformContents({ args, contents })
    })
  },
} as Plugin

export const hmr = {
  name: 'hmr',
  setup(build, { transform } = {} as any) {
    const transformContents = async ({ args, contents }: { args: OnLoadArgs; contents: string }) => {
      const item = await hmrCache.getOrUpdate(args.path, `${build.initialOptions.bundle}`, contents)
      return item.payload
    }

    if (transform) return transformContents(transform)

    build.onLoad({ filter: /\.m?[jt]sx?$/ }, async args => {
      const contents = await readFile(args.path)

      return transformContents({ args, contents })
    })
  },
} as Plugin

export const logger = {
  name: 'logger',
  setup(build, { transform, options } = {} as any) {
    const transformContents = async ({ args, contents }: { args: OnLoadArgs; contents: string }) => {
      const item = await loggerCache.getOrUpdate(args.path, `${build.initialOptions.bundle}`, contents, options)
      return item.payload
    }

    if (transform) return transformContents(transform)

    build.onLoad({ filter: /\.m?[jt]sx?$/ }, async args => {
      const contents = await readFile(args.path)

      return transformContents({ args, contents })
    })
  },
} as Plugin

export const css = {
  name: 'css',
  setup(build) {
    build.onLoad({ filter: /\.css$/ }, async args => {
      const item = await cssCache.getOrUpdate(args.path, `${build.initialOptions.bundle}`)
      return item.payload
    })
  },
} as Plugin

export const markdown = {
  name: 'markdown',
  setup(build) {
    build.onLoad({ filter: /.md$/ }, async args => {
      const MarkdownIt = (await import('markdown-it')).default

      const md = await fs.promises.readFile(args.path, 'utf-8')
      const html = MarkdownIt({ html: true }).render(md, {})

      const contents = `
        import 'github-markdown-css'
        document.body.classList.add('markdown-body')
        document.body.style = 'max-width: 830px; margin: 0 auto; padding: 20px;'
        document.body.innerHTML = ${JSON.stringify(html)}
      `

      return {
        contents,
        resolveDir: __dirname,
      }
    })
  },
} as Plugin

export const extensions = [
  '',
  '.ts',
  '.mjs',
  '.js',
  '.tsx',
  '.jsx',
  '.json',
  '.mts',
  '.mtsx',
  '.mjsx',
]

export const loaders = {
  '.js': 'js',
  '.jsx': 'jsx',
  '.json': 'json',
  '.ts': 'ts',
  '.tsx': 'tsx',
  '.mjs': 'js',
  '.mts': 'ts',
  '.mtsx': 'tsx',
  '.mjsx': 'jsx',
  '.svg': 'dataurl',
} as const

const discoverFile = async (
  resolved: string,
  x: string,
  options: { alias?: Record<string, string> | void; external?: boolean },
) => {
  if (options.alias && x in options.alias) {
    return [x, options.alias[x]] as const
  }

  const importMetaResolve = (await eval('import(\'import-meta-resolve\')')).resolve

  if (x.startsWith('.')) {
    const joined = path.resolve(resolved, x)
    for (const ext of extensions) {
      const filename = `${joined}${ext}`
      try {
        const stat = await fs.promises.stat(filename)
        if (stat.isFile()) return [x, filename] as const
        else if (stat.isDirectory()) {
          for (const indexExt of extensions) {
            const index = path.join(filename, `index${indexExt}`)
            try {
              const stat = await fs.promises.stat(index)
              if (stat.isFile()) return [x, index] as const
            } catch { }
          }
          try {
            const pkg: any = JSON.parse(await fs.promises.readFile(path.join(filename, 'package.json'), 'utf-8'))
            const main = path.join(joined, pkg.module ?? pkg.main)
            const stat = await fs.promises.stat(main)
            if (stat.isFile()) return [x, main] as const
          } catch { }
        }
      } catch { }
    }
  } else {
    if (options.external) {
      try {
        const result = await importMetaResolve(x, `file://${resolved}`)
        const { pathname } = new URL(result)
        if (pathname.startsWith('/')) return [x, pathname] as const
      } catch { }
    }
  }
  return [x, x]
}

export const importResolve = {
  name: 'import-resolve',
  async setup(build, { transform } = {} as any) {
    const matchers =
      /(?<!")(((im|ex)port.*?from\s+['"](?<id1>[^'"]+)['"])|(import\(?\s*['"](?<id2>[^'"]+)['"])|(require\(\s*['"](?<id3>[^'"]+)['"]))/g

    const parseIds = (x: string) =>
      [...x.matchAll(matchers)]
        .map(x => x.groups?.id1 || x.groups?.id2 || x.groups?.id3).filter(Boolean) as string[]

    const jsxImportSourceRegExp = /\/\*\* @jsxImportSource (?<id>[^\s]+)/g

    // Create a function and move all the content of your `onLoad` function in it, except the `readfile`.
    const transformContents = async ({ args, contents }: { args: OnLoadArgs; contents: string }) => {
      if (!build.initialOptions.bundle) {
        // It receives an object as an argument containing both the standard arguments of the `onLoad` function
        // and the `contents` of the previous plugin or file.

        if (args.path.endsWith('x')) {
          const jsx = [...contents.matchAll(jsxImportSourceRegExp)]
            .map(x => x.groups?.id).filter(Boolean)

          if (jsx.length) {
            const importMetaResolve = (await eval('import(\'import-meta-resolve\')')).resolve
            for (const id of jsx) {
              const runtime = `${id}/jsx-runtime`
              try {
                const result = await importMetaResolve(runtime, `file://${path.dirname(args.path)}`)
                const { pathname } = new URL(result)
                contents = contents.replace(
                  `/** @jsxImportSource ${id}`,
                  `/** @jsxImportSource /${FS_PREFIX}/${path.dirname(path.relative(homedir, pathname))}`
                )
              } catch { }
            }
          }
        }

        const resolveDir = path.dirname(args.path)
        const ids = parseIds(contents)
        for (const id of ids) {
          let [, result] = await discoverFile(resolveDir, id, { external: true, alias })

          let pathname: string
          if (id.startsWith('.')) {
            result = path.resolve(resolveDir, result)
          }
          if (result.startsWith('/')) {
            pathname = `/${FS_PREFIX}/${path.relative(homedir, result)}`
          } else {
            pathname = result
          }

          contents = contents
            .replaceAll(`'${id}'`, `'${pathname}'`)
            .replaceAll(`"${id}"`, `"${pathname}"`)
        }
      }

      return {
        contents,
        loader: ((loaders as any)[path.extname(args.path)] ?? 'js') as 'js',
      }
    }

    if (transform) return transformContents(transform)

    build.onLoad({ filter: /\.m?[jt]sx?$/ }, async args => {
      const contents = await readFile(args.path)

      return transformContents({ args, contents })
    })
  },
} as Plugin

// ripped from: https://github.com/nativew/esbuild-plugin-pipe/blob/main/src/index.js
interface PipeOptions extends OnLoadOptions {
  plugins: (Plugin & { setup(build: any, transform: any): Promise<any> })[]
  logger: boolean
}

export const pipe = (options = {} as PipeOptions) => ({
  name: 'pipe',
  setup(build) {
    const { filter = /.*/, namespace = '', plugins = [] } = options

    build.onLoad({ filter, namespace }, async args => {
      const contents = await readFile(args.path)

      return plugins.reduce(
        (async (transform: any, plugin: any) => {
          const { contents } = await transform as any

          return plugin.setup(build, { transform: { args, contents }, options })
        }) as any,
        { contents }
      ) as unknown as Promise<OnLoadResult>
    })
  },
} as Plugin)
