import { ensureRenderCacheMap, ensureRenderMetaMap } from '../runtime/render_access.js';

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

type CacheMap<T = unknown> = Map<string, T>;

type CachedValueLike = UnknownRecord & {
  userData?: UnknownRecord | null;
};

function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function safeKeyPart(value: unknown): string {
  if (typeof value === 'number' && Number.isFinite(value)) return String(round6(value));
  if (typeof value === 'boolean') return value ? '1' : '0';
  return String(value ?? '');
}

function ensureGeometryCache(App: AppContainer): CacheMap {
  return ensureRenderCacheMap(App, 'geometryCache');
}

function ensureMaterialCache(App: AppContainer): CacheMap {
  return ensureRenderCacheMap(App, 'materialCache');
}

function touchCacheMeta(App: AppContainer, kind: 'geometry' | 'material', key: string): void {
  try {
    ensureRenderMetaMap(App, kind).set(key, Date.now());
  } catch {
    // ignore
  }
}

function markCachedValue<T>(value: T): T {
  const rec = value as CachedValueLike | null;
  if (rec && typeof rec === 'object') {
    try {
      rec.userData = rec.userData || {};
      rec.userData.isCached = true;
    } catch {
      // ignore
    }
  }
  return value;
}

export function createDoorVisualCacheKey(prefix: string, parts: unknown[]): string {
  let out = prefix;
  for (let i = 0; i < parts.length; i += 1) out += `:${safeKeyPart(parts[i])}`;
  return out;
}

export function getCachedDoorVisualGeometry<T>(App: AppContainer, key: string, create: () => T): T {
  const cache = ensureGeometryCache(App);
  const cached = cache.get(key) as T | undefined;
  if (typeof cached !== 'undefined') {
    touchCacheMeta(App, 'geometry', key);
    return cached;
  }
  const created = markCachedValue(create());
  cache.set(key, created);
  touchCacheMeta(App, 'geometry', key);
  return created;
}

export function getCachedDoorVisualMaterial<T>(App: AppContainer, key: string, create: () => T): T {
  const cache = ensureMaterialCache(App);
  const cached = cache.get(key) as T | undefined;
  if (typeof cached !== 'undefined') {
    touchCacheMeta(App, 'material', key);
    return cached;
  }
  const created = markCachedValue(create());
  cache.set(key, created);
  touchCacheMeta(App, 'material', key);
  return created;
}
