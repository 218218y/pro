import type { KnownMapName, MapsByName } from '../../../types';

import { asMapRecord, asRecord, readFiniteNumber } from './maps_access_shared.js';

export type KnownMapNormalizerMap = { [K in KnownMapName]: (value: unknown) => MapsByName[K] };
export type NullableStringMap = Record<string, string | null | undefined>;

const KNOWN_MAP_NAMES: KnownMapName[] = [
  'handlesMap',
  'hingeMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'drawerDividersMap',
  'groovesMap',
  'grooveLinesCountMap',
  'removedDoorsMap',
  'curtainMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
];

const KNOWN_MAP_NAME_SET = new Set<string>(KNOWN_MAP_NAMES);

export function isKnownMapName(value: string): value is KnownMapName {
  return KNOWN_MAP_NAME_SET.has(value);
}

export function normalizeToggleValue(value: unknown): true | false | null | 1 | 0 | undefined {
  if (value === true) return true;
  if (value === false) return false;
  if (value === null) return null;
  if (value === 1) return 1;
  if (value === 0) return 0;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value === 0 ? false : value === 1 ? true : undefined;
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (!s || s === 'null') return null;
    if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
    if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  }
  return undefined;
}

export function normalizeToggleMap(value: unknown): MapsByName['drawerDividersMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['drawerDividersMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const next = normalizeToggleValue(rec[key]);
    if (typeof next !== 'undefined') out[key] = next;
  }
  return out;
}

export function normalizeHandlesMap(value: unknown): MapsByName['handlesMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['handlesMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

function cloneDetachedUnknown(value: unknown, seen = new Map<object, unknown>()): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) return seen.get(value);
    const out: unknown[] = [];
    seen.set(value, out);
    for (let i = 0; i < value.length; i += 1) out[i] = cloneDetachedUnknown(value[i], seen);
    return out;
  }
  const rec = asRecord(value);
  if (!rec) return value;
  if (seen.has(rec)) return seen.get(rec);
  const out: Record<string, unknown> = {};
  seen.set(rec, out);
  for (const key of Object.keys(rec)) out[key] = cloneDetachedUnknown(rec[key], seen);
  return out;
}

function cloneDetachedHingeEntry(value: Record<string, unknown>): MapsByName['hingeMap'][string] {
  const cloned = cloneDetachedUnknown(value);
  return asRecord(cloned) || {};
}

export function normalizeHingeMap(value: unknown): MapsByName['hingeMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['hingeMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    const obj = asRecord(entry);
    if (obj) out[key] = cloneDetachedHingeEntry(obj);
  }
  return out;
}

export function normalizeSplitDoorsMap(value: unknown): MapsByName['splitDoorsMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['splitDoorsMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'boolean' || typeof entry === 'string') {
      out[key] = entry;
      continue;
    }
    if (typeof entry === 'number' && Number.isFinite(entry)) {
      out[key] = entry;
      continue;
    }
    if (Array.isArray(entry)) {
      const nums: number[] = [];
      for (const item of entry) {
        const num = typeof item === 'number' ? item : typeof item === 'string' ? Number(item) : NaN;
        if (Number.isFinite(num)) nums.push(num);
      }
      out[key] = nums;
    }
  }
  return out;
}

export function normalizeNullableStringMap(value: unknown): NullableStringMap {
  const rec = asMapRecord(value);
  const out: NullableStringMap = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    if (typeof entry === 'string') out[key] = entry;
  }
  return out;
}

export function normalizeNullablePositiveIntMap(value: unknown): MapsByName['grooveLinesCountMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['grooveLinesCountMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === null) {
      out[key] = null;
      continue;
    }
    const n = Number(entry);
    if (Number.isFinite(n) && n >= 1) out[key] = Math.max(1, Math.floor(n));
  }
  return out;
}

export function normalizeDoorStyleMap(value: unknown): MapsByName['doorStyleMap'] {
  const rec = asMapRecord(value);
  const out: MapsByName['doorStyleMap'] = Object.create(null);
  if (!rec) return out;
  for (const key of Object.keys(rec)) {
    const entry = rec[key];
    if (entry === 'flat' || entry === 'profile' || entry === 'tom') out[key] = entry;
  }
  return out;
}

export function normalizeDoorTrimCenterNorm(value: unknown): number {
  const n = readFiniteNumber(value);
  if (!Number.isFinite(n)) return 0.5;
  const next = Math.max(0, Math.min(1, Number(n)));
  return Math.abs(next - 0.5) <= 1e-4 ? 0.5 : next;
}

export function normalizeDoorTrimCustomSizeCm(value: unknown): number | null {
  const n = readFiniteNumber(value);
  if (!Number.isFinite(n) || !(Number(n) > 0)) return null;
  return Math.max(4, Math.min(400, Number(n)));
}

export function normalizeDoorTrimCrossSizeCm(value: unknown): number | null {
  const n = readFiniteNumber(value);
  if (!Number.isFinite(n) || !(Number(n) > 0)) return null;
  return Math.max(1, Math.min(120, Number(n)));
}

export function formatStableNormNumber(value: number | null): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'na';
  const rounded = Math.round(value * 10000) / 10000;
  return String(rounded)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*?)0+$/, '$1');
}

export function createStableDoorTrimId(parts: {
  axis: string;
  color: string;
  span: string;
  centerXNorm: number;
  centerYNorm: number;
  sizeCm: number | null;
  crossSizeCm: number | null;
}): string {
  const core = [
    parts.axis,
    parts.color,
    parts.span,
    formatStableNormNumber(parts.centerXNorm),
    formatStableNormNumber(parts.centerYNorm),
    formatStableNormNumber(parts.sizeCm),
    formatStableNormNumber(parts.crossSizeCm),
  ].join('_');
  return `trim_${core}`;
}
