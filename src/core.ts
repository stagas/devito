import { fsStats } from 'easy-https-server'
import { BuildOptions } from 'esbuild'
import { Deferred, KeyedCache } from 'everyday-utils'
import * as fs from 'fs'
import { hmrCache, importMetaCache } from './esbuild-plugins'
import { esbuildCache } from './request-handler'

export const FS_PREFIX = '@fs'

export const caches = new Set<Map<any, any>>()
caches.add(fsStats.cache)

export const esbuildCommonOptions: BuildOptions = {
  write: false,
  metafile: true,
  format: 'esm',
  jsx: 'automatic',
  keepNames: true,
  legalComments: 'inline',
  sourcemap: 'inline',
  watch: false,
  loader: {
    '.mjs': 'js',
    '.mts': 'ts',
    '.mtsx': 'tsx',
    '.mjsx': 'jsx',
    '.svg': 'dataurl',
    '.wasm': 'binary',
  },
}

export function roundSeconds(x: Date | number) {
  return Math.round(+x / 1000) * 1000
}

export interface ResourceCacheItem<T> {
  stats: fs.Stats
  payload: T
}

export interface ResourceCache<T> {
  cache: Map<string, Deferred<ResourceCacheItem<T>>>
  getOrUpdate(pathname: string, ...args: any[]): Promise<ResourceCacheItem<T>>
}

export function clearDevitoCaches() {
  for (const c of caches) {
    c.clear()
  }
}

export function forgetFile(pathname: string) {
  // console.log(
  //   'caches:',
  //   esbuildCache?.cache.has(pathname),
  //   importMetaCache?.cache.has(pathname),
  //   fsStats.cache.has(pathname),
  //   readFile.cache.has(pathname)
  // )

  esbuildCache?.cache.delete(pathname)
  importMetaCache?.cache.delete(pathname)
  hmrCache?.cache.delete(pathname)
  fsStats.cache.delete(pathname)
  readFile.cache.delete(pathname)
}

export function createResourceCache<T>(
  getStats: (pathname: string) => Promise<fs.Stats>,
  getPayload: (pathname: string, ...args: any[]) => Promise<T>,
): ResourceCache<T> {
  const cache = new Map<string, Deferred<ResourceCacheItem<T>>>()
  caches.add(cache)

  const resolve = async (deferred: Deferred<ResourceCacheItem<T>>, pathname: string, ...args: any[]) => {
    const stats = await getStats(pathname)
    if (deferred.value?.stats.mtime === stats.mtime) return

    const payload = await getPayload(pathname, ...args)
    deferred.resolve({ stats, payload })
  }

  return {
    cache,
    async getOrUpdate(pathname: string, ...args: any[]) {
      let deferred = cache.get(pathname)

      if (!deferred) {
        cache.set(pathname, deferred = Deferred())
        resolve(deferred, pathname, ...args)
      }

      return deferred.promise
    },
  }
}

export const readFile = KeyedCache(pathname => fs.promises.readFile(pathname, 'utf-8'))
caches.add(readFile.cache)
