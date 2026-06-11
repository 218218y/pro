// Cache access helpers (Canonical)
//
// Goal:
// - Provide a single, stable way to access runtime cache surfaces across layers.
// - Keep cache ownership under `App.services.runtimeCache` instead of the old root `App.cache` bag.
// - Migrate and delete any legacy root cache bag on first touch so hybrid state does not linger.
//
// IMPORTANT:
// - This file lives in `runtime/` so it can be imported from builder/services/kernel/platform.
// - UI should prefer importing via `services/api.js` (public services surface).

import type { RuntimeCacheServiceLike, UnknownRecord } from '../../../types';

import { asRecord, createNullRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

type CacheMapRecord = UnknownRecord;

export type CacheBag = RuntimeCacheServiceLike & {
  stackSplitLowerTopY?: number | null;
  internalGridMap?: CacheMapRecord;
  internalGridMapSplitBottom?: CacheMapRecord;
};

type CacheAppLike = UnknownRecord & {
  cache?: unknown;
};

type InternalGridMapKey = 'internalGridMap' | 'internalGridMapSplitBottom';

function asCacheBag(value: unknown): CacheBag | null {
  return asRecord<CacheBag>(value);
}

function asCacheApp(value: unknown): CacheAppLike | null {
  return asRecord<CacheAppLike>(value);
}

function createCacheMapRecord(): CacheMapRecord {
  return createNullRecord<CacheMapRecord>();
}

function createCacheBag(): CacheBag {
  return createNullRecord<CacheBag>();
}

function readGridMapKey(isBottomStack?: boolean): InternalGridMapKey {
  return isBottomStack ? 'internalGridMapSplitBottom' : 'internalGridMap';
}

function readLegacyRootCacheMaybe(App: unknown): CacheBag | null {
  const app = asCacheApp(App);
  return app ? asCacheBag(app.cache) : null;
}

function deleteLegacyRootCache(App: unknown): void {
  const app = asCacheApp(App);
  if (!app || !('cache' in app)) return;
  try {
    delete app.cache;
  } catch {
    try {
      app.cache = undefined;
    } catch {
      // ignore
    }
  }
}

function ensureRuntimeCacheSlot(App: unknown): CacheBag {
  return asCacheBag(ensureServiceSlot<RuntimeCacheServiceLike>(App, 'runtimeCache')) || createCacheBag();
}

function adoptLegacyRootCache(App: unknown, legacy: CacheBag): CacheBag {
  const current = asCacheBag(getServiceSlotMaybe<RuntimeCacheServiceLike>(App, 'runtimeCache'));
  if (current) {
    Object.assign(current, legacy);
    deleteLegacyRootCache(App);
    return current;
  }
  const servicesCache = ensureRuntimeCacheSlot(App);
  Object.assign(servicesCache, legacy);
  deleteLegacyRootCache(App);
  return servicesCache;
}

export function getRuntimeCacheServiceMaybe(App: unknown): CacheBag | null {
  const current = asCacheBag(getServiceSlotMaybe<RuntimeCacheServiceLike>(App, 'runtimeCache'));
  if (current) {
    deleteLegacyRootCache(App);
    return current;
  }
  const legacy = readLegacyRootCacheMaybe(App);
  return legacy ? adoptLegacyRootCache(App, legacy) : null;
}

export function ensureRuntimeCacheService(App: unknown): CacheBag {
  return getRuntimeCacheServiceMaybe(App) || ensureRuntimeCacheSlot(App);
}

export function getCacheBag(App: unknown): CacheBag {
  return ensureRuntimeCacheService(App);
}

export function readStackSplitLowerTopY(App: unknown): number | null {
  try {
    const y = getCacheBag(App).stackSplitLowerTopY;
    return typeof y === 'number' && Number.isFinite(y) ? y : null;
  } catch {
    return null;
  }
}

export function writeStackSplitLowerTopY(App: unknown, y: unknown): void {
  try {
    const n = typeof y === 'number' ? y : typeof y === 'string' ? Number(y) : NaN;
    getCacheBag(App).stackSplitLowerTopY = Number.isFinite(n) ? n : null;
  } catch {
    // ignore
  }
}

export function getInternalGridMap(App: unknown, isBottomStack?: boolean): CacheMapRecord {
  const cache = getCacheBag(App);
  const key = readGridMapKey(isBottomStack);
  const current = asCacheBag(cache[key]);
  if (current) return current;

  const next = createCacheMapRecord();
  try {
    cache[key] = next;
  } catch {
    // ignore
  }
  return next;
}

export function resetInternalGridMaps(App: unknown): { top: CacheMapRecord; bottom: CacheMapRecord } {
  const cache = getCacheBag(App);
  const top = createCacheMapRecord();
  const bottom = createCacheMapRecord();
  try {
    cache.internalGridMap = top;
  } catch {
    // ignore
  }
  try {
    cache.internalGridMapSplitBottom = bottom;
  } catch {
    // ignore
  }
  return { top, bottom };
}
