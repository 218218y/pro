import type { ThreeLike } from '../../../types';

import { ensurePlatformUtil } from '../runtime/platform_access.js';
import { getDepsNamespaceMaybe } from '../runtime/deps_access.js';
import {
  ensureRenderCacheMaps,
  ensureRenderCacheObject,
  ensureRenderMetaMaps,
} from '../runtime/render_access.js';
import { assertThreeViaDeps } from '../runtime/three_access.js';

export type UnknownRecord = Record<string, unknown>;

export type CacheTouchFn = (meta: Map<string, number>, key: string) => void;
export type GeometryCacheMap = Map<string, GeometryInstance>;

export type GeometryCacheBucket = 'geometry' | 'edges';

export type GeometryCtor<TInstance extends object = object> = new (...init: readonly unknown[]) => TInstance;

export type GeometryUserData = UnknownRecord & { isCached?: boolean };

export type GeometryInstance = UnknownRecord & { uuid?: string; userData?: GeometryUserData };

export type GeometryCacheStats = UnknownRecord & {
  geometryHitCount: number;
  geometryMissCount: number;
  geometryEvictionCount: number;
  geometrySizeHighWater: number;
  edgesHitCount: number;
  edgesMissCount: number;
  edgesEvictionCount: number;
  edgesSizeHighWater: number;
};

export type GeometryMetaMaps = {
  geometry: Map<string, number>;
  edges: Map<string, number>;
};

export type FlagsLike = UnknownRecord & {
  enableThreeGeometryCachePatch?: boolean;
};

export type GeometryPatchThreeLike = ThreeLike &
  UnknownRecord & {
    __cachedGeometriesPatched?: boolean;
    BoxGeometry: GeometryCtor<GeometryInstance>;
    PlaneGeometry: GeometryCtor<GeometryInstance>;
    CylinderGeometry: GeometryCtor<GeometryInstance>;
    SphereGeometry: GeometryCtor<GeometryInstance>;
    EdgesGeometry: GeometryCtor<GeometryInstance>;
    RoundedBoxGeometry?: GeometryCtor<GeometryInstance>;
  };

export type AppDepsLike = UnknownRecord & {
  THREE?: GeometryPatchThreeLike;
  flags?: FlagsLike;
};

export type AppLike = UnknownRecord & {
  deps?: AppDepsLike;
  flags?: FlagsLike;
};

export function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

export function assertApp(app: unknown): asserts app is AppLike {
  if (!app || typeof app !== 'object') {
    throw new Error('[WardrobePro][ESM] three_geometry_cache_patch requires an app object');
  }
}

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function isGeometryMap(value: unknown): value is GeometryCacheMap {
  return value instanceof Map;
}

export function isCacheTouchFn(value: unknown): value is CacheTouchFn {
  return typeof value === 'function';
}

export function readBoolean(value: unknown): boolean {
  return value === true;
}

export function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function normalizeNonNegativeInt(value: unknown, fallback: number): number {
  const num = readNumber(value, fallback);
  if (!Number.isFinite(num) || num <= 0) return 0;
  return Math.max(0, Math.floor(num));
}

export function normalizePositiveInt(value: unknown, fallback: number, min: number = 1): number {
  const num = normalizeNonNegativeInt(value, fallback);
  if (num <= 0) return Math.max(1, Math.floor(min));
  return Math.max(Math.floor(min), num);
}

export function readFlags(app: AppLike): FlagsLike | null {
  const injected = readRecord(getDepsNamespaceMaybe<FlagsLike>(app, 'flags'));
  const direct = readRecord(app.flags);
  const flags = injected || direct;
  return flags ? { ...flags } : null;
}

export function createGeometryCacheStats(): GeometryCacheStats {
  return {
    geometryHitCount: 0,
    geometryMissCount: 0,
    geometryEvictionCount: 0,
    geometrySizeHighWater: 0,
    edgesHitCount: 0,
    edgesMissCount: 0,
    edgesEvictionCount: 0,
    edgesSizeHighWater: 0,
  };
}

export function isGeometryCacheStats(value: unknown): value is GeometryCacheStats {
  const stats = readRecord(value);
  return !!(
    stats &&
    Number.isFinite(stats.geometryHitCount) &&
    Number.isFinite(stats.geometryMissCount) &&
    Number.isFinite(stats.geometryEvictionCount) &&
    Number.isFinite(stats.geometrySizeHighWater) &&
    Number.isFinite(stats.edgesHitCount) &&
    Number.isFinite(stats.edgesMissCount) &&
    Number.isFinite(stats.edgesEvictionCount) &&
    Number.isFinite(stats.edgesSizeHighWater)
  );
}

export function ensureGeometryCacheStats(app: unknown): GeometryCacheStats {
  const stats = ensureRenderCacheObject(app, '__wpGeometryCacheStats');
  if (!Number.isFinite(stats.geometryHitCount)) stats.geometryHitCount = 0;
  if (!Number.isFinite(stats.geometryMissCount)) stats.geometryMissCount = 0;
  if (!Number.isFinite(stats.geometryEvictionCount)) stats.geometryEvictionCount = 0;
  if (!Number.isFinite(stats.geometrySizeHighWater)) stats.geometrySizeHighWater = 0;
  if (!Number.isFinite(stats.edgesHitCount)) stats.edgesHitCount = 0;
  if (!Number.isFinite(stats.edgesMissCount)) stats.edgesMissCount = 0;
  if (!Number.isFinite(stats.edgesEvictionCount)) stats.edgesEvictionCount = 0;
  if (!Number.isFinite(stats.edgesSizeHighWater)) stats.edgesSizeHighWater = 0;
  if (isGeometryCacheStats(stats)) return stats;
  const fallback = createGeometryCacheStats();
  Object.assign(stats, fallback);
  return isGeometryCacheStats(stats) ? stats : fallback;
}

export function resetGeometryCacheStats(stats: GeometryCacheStats): void {
  stats.geometryHitCount = 0;
  stats.geometryMissCount = 0;
  stats.geometryEvictionCount = 0;
  stats.geometrySizeHighWater = 0;
  stats.edgesHitCount = 0;
  stats.edgesMissCount = 0;
  stats.edgesEvictionCount = 0;
  stats.edgesSizeHighWater = 0;
}

export function readCacheLimit(app: AppLike, key: 'geometries' | 'edges', fallback: number): number {
  const util = ensurePlatformUtil(app);
  const limits = readRecord(util.cacheLimits);
  return normalizeNonNegativeInt(limits?.[key], fallback);
}

export function recordCacheHit(stats: GeometryCacheStats, bucket: GeometryCacheBucket): void {
  if (bucket === 'edges') stats.edgesHitCount += 1;
  else stats.geometryHitCount += 1;
}

export function recordCacheMiss(stats: GeometryCacheStats, bucket: GeometryCacheBucket): void {
  if (bucket === 'edges') stats.edgesMissCount += 1;
  else stats.geometryMissCount += 1;
}

export function recordCacheEviction(stats: GeometryCacheStats, bucket: GeometryCacheBucket): void {
  if (bucket === 'edges') stats.edgesEvictionCount += 1;
  else stats.geometryEvictionCount += 1;
}

export function updateCacheHighWater(
  stats: GeometryCacheStats,
  bucket: GeometryCacheBucket,
  size: number
): void {
  if (bucket === 'edges') {
    if (size > stats.edgesSizeHighWater) stats.edgesSizeHighWater = size;
    return;
  }
  if (size > stats.geometrySizeHighWater) stats.geometrySizeHighWater = size;
}

export function markCachedGeometry<TGeometry extends GeometryInstance | null | undefined>(
  geometry: TGeometry
): TGeometry {
  if (!geometry) return geometry;
  const existingUserData = geometry.userData;
  const userData = readRecord(existingUserData) ?? {};
  userData.isCached = true;
  geometry.userData = userData;
  return geometry;
}

export function readGeometryInstance(value: unknown): GeometryInstance {
  return readRecord(value) ?? {};
}

export function ensureCacheTouch(util: UnknownRecord): CacheTouchFn {
  const existing = isCacheTouchFn(util.cacheTouch) ? util.cacheTouch : null;
  if (existing) return existing;
  const fallback: CacheTouchFn = (meta, key) => {
    try {
      meta.set(key, Date.now());
    } catch {
      // ignore
    }
  };
  util.cacheTouch = fallback;
  return fallback;
}

export function touchMeta(touch: CacheTouchFn, meta: Map<string, number>, key: string): void {
  try {
    touch(meta, key);
  } catch {
    try {
      meta.set(key, Date.now());
    } catch {
      // ignore
    }
  }
}

export function cacheGeometry<TGeometry extends GeometryInstance>(
  map: GeometryCacheMap,
  key: string,
  geometry: TGeometry
): TGeometry {
  map.set(key, geometry);
  return geometry;
}

export function isCtor(value: unknown): value is GeometryCtor {
  return typeof value === 'function';
}

export function isThreeLikeForGeometryCache(value: unknown): value is GeometryPatchThreeLike {
  const obj = readRecord(value);
  return !!(
    obj &&
    isCtor(obj.BoxGeometry) &&
    isCtor(obj.PlaneGeometry) &&
    isCtor(obj.CylinderGeometry) &&
    isCtor(obj.SphereGeometry) &&
    isCtor(obj.EdgesGeometry)
  );
}

export function getTHREE(app: unknown): GeometryPatchThreeLike {
  const three = assertThreeViaDeps(app, 'platform/three_geometry_cache_patch.THREE');
  if (!isThreeLikeForGeometryCache(three)) {
    throw new Error('[WardrobePro][ESM] three_geometry_cache_patch requires THREE geometry constructors');
  }
  return three;
}

export function readGeometryMeta(app: unknown): GeometryMetaMaps | null {
  try {
    const meta = ensureRenderMetaMaps(app);
    const geometry = meta.geometry instanceof Map ? meta.geometry : null;
    const edges = meta.edges instanceof Map ? meta.edges : null;
    return geometry && edges ? { geometry, edges } : null;
  } catch {
    return null;
  }
}

export function readCachedGeometry(map: GeometryCacheMap, key: string): GeometryInstance | null {
  const cached = map.get(key);
  return cached ?? null;
}

export function findOldestCacheKey(map: GeometryCacheMap, meta: Map<string, number>): string | null {
  let oldestKey: string | null = null;
  let oldestAt = Number.POSITIVE_INFINITY;
  for (const key of map.keys()) {
    const touchedAt = readNumber(meta.get(key), 0);
    if (oldestKey === null || touchedAt < oldestAt) {
      oldestKey = key;
      oldestAt = touchedAt;
    }
  }
  return oldestKey;
}

export function trimColdCacheReferences(
  map: GeometryCacheMap,
  meta: Map<string, number>,
  maxSize: number,
  stats: GeometryCacheStats,
  bucket: GeometryCacheBucket
): void {
  updateCacheHighWater(stats, bucket, map.size);
  while (map.size > maxSize) {
    const oldestKey = findOldestCacheKey(map, meta);
    if (!oldestKey) break;
    map.delete(oldestKey);
    meta.delete(oldestKey);
    recordCacheEviction(stats, bucket);
  }
}

export function ensureGeometryCacheMaps(app: unknown): void {
  ensureRenderCacheMaps(app);
  ensureRenderMetaMaps(app);
}
