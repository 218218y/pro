import { getCacheBag } from '../runtime/cache_access.js';
import { asRecord, createNullRecord } from '../runtime/record.js';

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

export type EdgeHandleDefaultNoneScope = 'module' | 'corner' | 'pent';
export type EdgeHandleDefaultNoneStackKey = 'top' | 'bottom';

type EdgeHandleDefaultNoneCacheRecord = UnknownRecord;

type EdgeHandleDefaultNoneCacheKey =
  | '__edgeHandleDefaultNoneTop'
  | '__edgeHandleDefaultNoneBottom'
  | '__edgeHandleDefaultNoneCornerTop'
  | '__edgeHandleDefaultNoneCornerBottom'
  | '__edgeHandleDefaultNonePentTop'
  | '__edgeHandleDefaultNonePentBottom';

const EDGE_HANDLE_DEFAULT_NONE_CACHE_KEYS: readonly EdgeHandleDefaultNoneCacheKey[] = [
  '__edgeHandleDefaultNoneTop',
  '__edgeHandleDefaultNoneBottom',
  '__edgeHandleDefaultNoneCornerTop',
  '__edgeHandleDefaultNoneCornerBottom',
  '__edgeHandleDefaultNonePentTop',
  '__edgeHandleDefaultNonePentBottom',
];

const EDGE_HANDLE_DEFAULT_NONE_CACHE_KEY_BY_SCOPE: Record<
  EdgeHandleDefaultNoneScope,
  Record<EdgeHandleDefaultNoneStackKey, EdgeHandleDefaultNoneCacheKey>
> = {
  module: {
    top: '__edgeHandleDefaultNoneTop',
    bottom: '__edgeHandleDefaultNoneBottom',
  },
  corner: {
    top: '__edgeHandleDefaultNoneCornerTop',
    bottom: '__edgeHandleDefaultNoneCornerBottom',
  },
  pent: {
    top: '__edgeHandleDefaultNonePentTop',
    bottom: '__edgeHandleDefaultNonePentBottom',
  },
};

function createEdgeHandleDefaultNoneCacheRecord(): EdgeHandleDefaultNoneCacheRecord {
  return createNullRecord<EdgeHandleDefaultNoneCacheRecord>();
}

export function readEdgeHandleDefaultNoneCacheKey(
  stackKey: EdgeHandleDefaultNoneStackKey,
  scope: EdgeHandleDefaultNoneScope = 'module'
): EdgeHandleDefaultNoneCacheKey {
  return EDGE_HANDLE_DEFAULT_NONE_CACHE_KEY_BY_SCOPE[scope][stackKey];
}

export function ensureEdgeHandleDefaultNoneCacheMap(
  App: AppContainer | unknown,
  stackKey: EdgeHandleDefaultNoneStackKey,
  scope: EdgeHandleDefaultNoneScope = 'module'
): EdgeHandleDefaultNoneCacheRecord {
  const cache = getCacheBag(App);
  const key = readEdgeHandleDefaultNoneCacheKey(stackKey, scope);
  const current = asRecord<EdgeHandleDefaultNoneCacheRecord>(cache[key]);
  if (current) return current;

  const next = createEdgeHandleDefaultNoneCacheRecord();
  try {
    cache[key] = next;
  } catch {
    // ignore cache write failures in detached/test modes
  }
  return next;
}

export function markEdgeHandleDefaultNone(
  App: AppContainer | unknown,
  stackKey: EdgeHandleDefaultNoneStackKey,
  partId: unknown,
  scope: EdgeHandleDefaultNoneScope = 'module'
): boolean {
  const key = partId == null ? '' : String(partId);
  if (!key) return false;
  const map = ensureEdgeHandleDefaultNoneCacheMap(App, stackKey, scope);
  map[key] = true;
  return true;
}

export function isEdgeHandleDefaultNone(
  App: AppContainer | unknown,
  stackKey: EdgeHandleDefaultNoneStackKey,
  partId: unknown
): boolean {
  const key = partId == null ? '' : String(partId);
  if (!key) return false;
  const cache = getCacheBag(App);
  for (const cacheKey of EDGE_HANDLE_DEFAULT_NONE_CACHE_KEYS) {
    if (cacheKey.endsWith(stackKey === 'bottom' ? 'Bottom' : 'Top')) {
      const map = asRecord<EdgeHandleDefaultNoneCacheRecord>(cache[cacheKey]);
      if (map && Object.prototype.hasOwnProperty.call(map, key) && map[key] === true) return true;
    }
  }
  return false;
}

export function resetEdgeHandleDefaultNoneCacheMaps(
  App: AppContainer | unknown
): Record<EdgeHandleDefaultNoneCacheKey, EdgeHandleDefaultNoneCacheRecord> {
  const cache = getCacheBag(App);
  const out = createNullRecord<Record<EdgeHandleDefaultNoneCacheKey, EdgeHandleDefaultNoneCacheRecord>>();
  for (const key of EDGE_HANDLE_DEFAULT_NONE_CACHE_KEYS) {
    const next = createEdgeHandleDefaultNoneCacheRecord();
    out[key] = next;
    try {
      cache[key] = next;
    } catch {
      // ignore cache write failures in detached/test modes
    }
  }
  return out;
}
