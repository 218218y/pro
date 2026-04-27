// Corner wing: cache helpers
//
// Builder/runtime cache now lives under App.services.runtimeCache (runtime/cache_access).
// Keep key-specific records inside that canonical service slot to avoid ad-hoc root bags.

import { getCacheBag } from '../runtime/cache_access.js';
import { isRecord } from './corner_geometry_plan.js';

type UnknownRecord = Record<string, unknown>;

function asUnknownRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function getOrCreateCacheRecord(App: unknown, key: string): UnknownRecord {
  const cache = asUnknownRecord(getCacheBag(App));
  const current = cache ? asUnknownRecord(cache[key]) : null;
  if (current) return current;
  const rec: UnknownRecord = {};
  if (cache) cache[key] = rec;
  return rec;
}
