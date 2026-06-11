import {
  assertApp,
  ensureCacheTouch,
  ensureGeometryCacheMaps,
  ensureGeometryCacheStats,
  getTHREE,
  isGeometryMap,
  readCacheLimit,
  readFlags,
  readGeometryMeta,
  readBoolean,
  resetGeometryCacheStats,
} from './three_geometry_cache_patch_contracts.js';
import { ensurePlatformUtil } from '../runtime/platform_access.js';
import { ensureRenderCacheMaps } from '../runtime/render_access.js';
import { installGeometryCtorPatches } from './three_geometry_cache_patch_constructors.js';

import type { GeometryCacheMap, GeometryCacheStats } from './three_geometry_cache_patch_contracts.js';

export function readThreeGeometryCacheStats(app: unknown): GeometryCacheStats {
  return { ...ensureGeometryCacheStats(app) };
}

export function clearThreeGeometryCacheReferences(app: unknown): boolean {
  assertApp(app);
  const geometryCache = getGeometryCache(app);
  const edgesGeometryCache = getEdgesGeometryCache(app);
  const meta = readGeometryMeta(app);
  if (geometryCache) geometryCache.clear();
  if (edgesGeometryCache) edgesGeometryCache.clear();
  if (meta) {
    meta.geometry.clear();
    meta.edges.clear();
  }
  resetGeometryCacheStats(ensureGeometryCacheStats(app));
  return !!(geometryCache || edgesGeometryCache || meta);
}

export function ensureGeometryCachesInstalled(app: unknown): boolean {
  assertApp(app);
  ensureCacheTouch(ensurePlatformUtil(app));
  ensureGeometryCacheMaps(app);
  return true;
}

export function isThreeGeometryCachePatchEnabled(app: unknown): boolean {
  try {
    assertApp(app);
    const flags = readFlags(app);
    return !!(flags && readBoolean(flags.enableThreeGeometryCachePatch));
  } catch {
    return false;
  }
}

export function getGeometryCache(app: unknown): GeometryCacheMap | null {
  try {
    assertApp(app);
    const cache = ensureRenderCacheMaps(app);
    return isGeometryMap(cache.geometryCache) ? cache.geometryCache : null;
  } catch {
    return null;
  }
}

export function getEdgesGeometryCache(app: unknown): GeometryCacheMap | null {
  try {
    assertApp(app);
    const cache = ensureRenderCacheMaps(app);
    return isGeometryMap(cache.edgesGeometryCache) ? cache.edgesGeometryCache : null;
  } catch {
    return null;
  }
}

export function installThreeGeometryCachePatch(app: unknown): boolean {
  assertApp(app);
  ensureGeometryCachesInstalled(app);

  if (!isThreeGeometryCachePatchEnabled(app)) return false;

  const THREE = getTHREE(app);
  if (THREE.__cachedGeometriesPatched) return true;
  THREE.__cachedGeometriesPatched = true;

  const touch = ensureCacheTouch(ensurePlatformUtil(app));
  ensureRenderCacheMaps(app);
  const geometryCache = getGeometryCache(app);
  const edgesGeometryCache = getEdgesGeometryCache(app);
  if (!geometryCache || !edgesGeometryCache) {
    throw new Error('[WardrobePro][ESM] three_geometry_cache_patch failed to initialize geometry caches');
  }

  const meta = readGeometryMeta(app) || {
    geometry: new Map<string, number>(),
    edges: new Map<string, number>(),
  };
  const stats = ensureGeometryCacheStats(app);
  const geometryLimit = readCacheLimit(app, 'geometries', 256);
  const edgesLimit = readCacheLimit(app, 'edges', 128);

  installGeometryCtorPatches({
    THREE,
    geometryCache,
    geometryMeta: meta.geometry,
    geometryLimit,
    edgesGeometryCache,
    edgesMeta: meta.edges,
    edgesLimit,
    stats,
    touch,
  });

  return true;
}
