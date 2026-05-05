// Cache access helpers (Canonical)
//
// Goal:
// - Provide a single, stable way to access runtime cache surfaces across layers.
// - Keep cache ownership under `App.services.runtimeCache`.
// - Drop obsolete root `App.cache` aliases on first touch so hybrid state does not linger.
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

type RootCacheAliasHost = UnknownRecord & {
  cache?: unknown;
};

type InternalGridMapKey = 'internalGridMap' | 'internalGridMapSplitBottom';

function asCacheBag(value: unknown): CacheBag | null {
  return asRecord<CacheBag>(value);
}

function asRootCacheAliasHost(value: unknown): RootCacheAliasHost | null {
  return asRecord<RootCacheAliasHost>(value);
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

function dropRootCacheAlias(App: unknown): void {
  const app = asRootCacheAliasHost(App);
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

export function getRuntimeCacheServiceMaybe(App: unknown): CacheBag | null {
  const current = asCacheBag(getServiceSlotMaybe<RuntimeCacheServiceLike>(App, 'runtimeCache'));
  dropRootCacheAlias(App);
  return current;
}

export function ensureRuntimeCacheService(App: unknown): CacheBag {
  const current = getRuntimeCacheServiceMaybe(App);
  if (current) return current;
  const next = ensureRuntimeCacheSlot(App);
  dropRootCacheAlias(App);
  return next;
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
