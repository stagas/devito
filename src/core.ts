import { fsStats } from 'easy-https-server'
import { BuildOptions } from 'esbuild'
import { Deferred, KeyedCache } from 'utils'
import * as fs from 'fs'
import { hmrCache, importMetaCache } from './esbuild-plugins'
import { esbuildCache } from './request-handler'

export const FS_PREFIX = '@fs'

export const caches = new Set<Map<any, any>>()
caches.add(fsStats.cache)

export const esbuildCommonOptions: BuildOptions = {
  write: false,
  metafile: true,
  target: 'es2022',
  format: 'esm',
  jsx: 'automatic',
  // keepNames: true,
  legalComments: 'inline',
  sourcemap: 'inline',
  minifyWhitespace: false,
  minifySyntax: false,
  minifyIdentifiers: false,
  // minifySyntax: true,
  loader: {
    '.mjs': 'js',
    '.mts': 'ts',
    '.mtsx': 'tsx',
    '.mjsx': 'jsx',
    '.svg': 'dataurl',
    '.wasm': 'binary',
  },
}

export function isWorker(pathname: string) {
  return pathname.includes('-worker')
    || pathname.includes('-worklet')
    || pathname.includes('-processor')
    || pathname.includes('-iframe')
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
  getOrUpdate(pathname: string, key: string, ...args: any[]): Promise<ResourceCacheItem<T>>
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

  const resolve = async (deferred: Deferred<ResourceCacheItem<T>>, pathname: string, key: string, ...args: any[]) => {
    const stats = await getStats(pathname)
    if (deferred.value?.stats.mtime === stats.mtime) return

    try {
      const payload = await getPayload(pathname, ...args)
      deferred.resolve({ stats, payload })
    }
    catch (error) {
      cache.delete(pathname + key)
      deferred.reject(error as Error)
    }
  }

  return {
    cache,
    async getOrUpdate(pathname: string, key: string, ...args: any[]) {
      let deferred = cache.get(pathname + key)

      if (!deferred) {
        cache.set(pathname, deferred = Deferred())
        resolve(deferred, pathname, key, ...args)
      }

      return deferred.promise
    },
  }
}

export const readFile = KeyedCache(pathname => fs.promises.readFile(pathname as string, 'utf-8'))
caches.add(readFile.cache)
