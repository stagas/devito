import { build, BuildResult, Metafile } from 'esbuild'
import alias from 'esbuild-plugin-alias'
import { queue } from 'event-toolkit'
import { Deferred } from 'everyday-utils'
import * as fs from 'fs'
import * as path from 'path'
import { esbuildCommonOptions, FS_PREFIX, readFile } from './core'
import { hmr, importMetaUrl, importResolve, markdown, pipe } from './esbuild-plugins'

export interface EsbuildOptions {
  entryFile: string
  entrySource?: string
  entryResolveDir?: string
  rootPath: string
  bundle: boolean
  alias?: Record<string, string>
  inlineSourceMaps?: boolean
  hmr?: boolean
  watch: boolean
  homedir: string
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
  const debounced = queue.debounce(5).not.first.not.next.last(cb)
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
        (_, filename) => onchange(dirname, filename)
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
        this.result.metafile!,
        async files => {
          this.onchange?.(files)
          this.rebuild()
        }
      )
      return watchDirs.size
    }
    return 0
  }

  result!: BuildResult
  async build() {
    if (this.result?.rebuild) {
      this.result.rebuild.dispose()
    }

    if (this.options.entrySource) {
      const deferred = Deferred<string>()
      deferred.resolve(this.options.entrySource)
      readFile.cache.set(this.options.entryFile, deferred)
    }

    try {
      const plugins = [] as any

      if (!this.options.bundle) plugins.push(importResolve)
      if (this.options.hmr) plugins.push(hmr)
      plugins.push(importMetaUrl)

      this.result = await build({
        ...esbuildCommonOptions,
        entryPoints: [this.options.entryFile],
        bundle: this.options.bundle,
        incremental: this.options.entrySource ? false : true,
        sourceRoot: `/${FS_PREFIX}`,
        outfile: path.join(this.options.homedir, 'bundle.js'),
        sourcemap: this.options.inlineSourceMaps ? 'inline' : 'linked',
        absWorkingDir: this.options.homedir,
        plugins: [
          plugins.length > 1
            ? pipe({
              filter: /\.m?[jt]sx?$/,
              plugins
            })
            : plugins[0],
          markdown,
          this.options.alias && alias(this.options.alias),
        ].filter(Boolean),
      })

      return this.result
    } catch { }
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
      this.result.metafile = result.metafile
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

  rebuild: () => Promise<void> = queue.debounce(5).not.first.not.next.last(function (this: Esbuild) {
    if (this.options.entrySource) {
      const deferred = Deferred<string>()
      deferred.resolve(this.options.entrySource)
      readFile.cache.set(this.options.entryFile, deferred)
    }

    this.defer()
    this.onbeforerebuild?.()

    // TODO: display the .catch() error in the client
    if (this.options.entrySource) {
      this.build().then(this.consume).catch(this.consume)
    } else {
      this.result.rebuild!().then(this.consume).catch(this.consume)
    }
  })
}

export async function createEsbuild(options: EsbuildOptions) {
  const esbuild = new Esbuild(options)
  await esbuild.build()
  return esbuild
}
