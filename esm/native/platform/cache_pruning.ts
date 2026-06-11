// Native ESM implementation of cache pruning + LRU helpers.
//
// Pure ESM: installs onto the provided app object.
// No window/global-scope App usage.

import {
  applyCacheLimitsFromApp,
  assertCachePruningApp,
  collectUsedSceneResources,
  ensureCachePruningSlots,
  isCacheMetaLike,
  isSceneObjectLike,
  pruneOneCache,
  readPlatformUtil,
  touchCacheClock,
  type CacheKey,
  type CacheLimits,
  type CacheMetaLike,
  type CachePruningAppLike,
} from './cache_pruning_shared.js';
import { pruneCachesSafe } from './cache_pruning_runtime.js';

/**
 * Install cache pruning utilities onto app.platform.util/app.render.
 */
export function installCachePruning(app: CachePruningAppLike) {
  assertCachePruningApp(app);

  const root = app;
  ensureCachePruningSlots(root);
  const util = readPlatformUtil(root);

  if (!util.cacheLimits) {
    const defaults: CacheLimits = {
      textures: 64,
      materials: 128,
      dimLabels: 24,
      edges: 128,
      geometries: 256,
    };
    const merged: CacheLimits = { ...defaults };
    applyCacheLimitsFromApp(merged, root);
    util.cacheLimits = merged;
  }

  util.cacheTouch =
    util.cacheTouch ||
    function (metaMap: CacheMetaLike | null, key: CacheKey): void {
      touchCacheClock(root, metaMap, key);
    };

  util.collectUsedSceneResources = util.collectUsedSceneResources || collectUsedSceneResources;
  util.pruneOneCache = util.pruneOneCache || pruneOneCache;
  util.pruneCachesSafe =
    util.pruneCachesSafe ||
    function (rootNode?: unknown): void {
      pruneCachesSafe(root, isSceneObjectLike(rootNode) ? rootNode : null);
    };

  return root;
}

export function cacheTouch(app: CachePruningAppLike, metaMap: unknown, key: unknown) {
  try {
    const util = readPlatformUtil(app);
    if (typeof util.cacheTouch !== 'function') return undefined;
    const typedMeta = isCacheMetaLike(metaMap) ? metaMap : null;
    return util.cacheTouch(typedMeta, key);
  } catch {
    return undefined;
  }
}
