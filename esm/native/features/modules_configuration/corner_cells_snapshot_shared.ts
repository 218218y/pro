// Shared corner snapshot/default helpers.
// Keeps lower/top default policy, scalar coercion, and custom-data normalization in one focused seam.

import {
  cloneMutableCornerValue,
  isRecord,
  readRecord,
  type CornerConfigurationLike,
  type NormalizedCornerConfigurationLike,
  type NormalizedCornerCustomDataLike,
  type NormalizedLowerCornerConfigurationLike,
  type UnknownRecord,
} from './corner_cells_contracts.js';

function toBoolArray(v: unknown, defaultValues: boolean[]): boolean[] {
  if (Array.isArray(v)) return v.map(Boolean);
  return defaultValues.slice();
}

export const DEFAULT_CORNER_CONFIGURATION: NormalizedCornerConfigurationLike = {
  layout: 'shelves',
  extDrawersCount: 0,
  hasShoeDrawer: false,
  intDrawersList: [],
  intDrawersSlot: 0,
  isCustom: false,
  gridDivisions: 6,
  customData: {
    shelves: [false, false, false, false, false, false],
    rods: [false, false, false, false, false, false],
    storage: false,
  },
};

export const DEFAULT_LOWER_CORNER_CONFIGURATION: NormalizedLowerCornerConfigurationLike = {
  layout: 'shelves',
  extDrawersCount: 0,
  hasShoeDrawer: false,
  intDrawersList: [],
  intDrawersSlot: 0,
  isCustom: true,
  gridDivisions: 6,
  customData: {
    shelves: [false, true, false, true, false, false],
    rods: [false, false, false, false, false, false],
    storage: false,
  },
  modulesConfiguration: [],
};

export function sanitizeCornerCustomDataForPatch(v: unknown): NormalizedCornerCustomDataLike {
  const src: UnknownRecord = isRecord(v) ? v : {};
  const def0 = readRecord(DEFAULT_CORNER_CONFIGURATION.customData) || {};
  const defShelves = Array.isArray(def0.shelves) ? def0.shelves.map(Boolean) : [];
  const defRods = Array.isArray(def0.rods) ? def0.rods.map(Boolean) : [];

  return {
    ...def0,
    ...src,
    shelves: toBoolArray(src.shelves, defShelves),
    rods: toBoolArray(src.rods, defRods),
    storage: !!src.storage,
  };
}

export function toInt(v: unknown, defaultValue: number): number {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : defaultValue;
}

export function toIntMin(v: unknown, defaultValue: number, min: number): number {
  const n = toInt(v, defaultValue);
  return n >= min ? n : defaultValue;
}

export function hasOwn(o: unknown, key: string): boolean {
  return !!o && typeof o === 'object' && Object.prototype.hasOwnProperty.call(o, key);
}

export function shallowRecordEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;
  if (!isRecord(prev) || !isRecord(next)) return false;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
}

export function cornerValueDeepEqual(prev: unknown, next: unknown): boolean {
  if (Object.is(prev, next)) return true;

  if (Array.isArray(prev) || Array.isArray(next)) {
    if (!Array.isArray(prev) || !Array.isArray(next) || prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i += 1) {
      if (!cornerValueDeepEqual(prev[i], next[i])) return false;
    }
    return true;
  }

  if (!isRecord(prev) || !isRecord(next)) return false;

  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;

  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!cornerValueDeepEqual(prev[key], next[key])) return false;
  }

  return true;
}

export function shallowCornerConfigurationRefsEqual(
  prev: CornerConfigurationLike,
  next: CornerConfigurationLike
): boolean {
  if (Object.is(prev, next)) return true;
  const prevKeys = Object.keys(prev);
  const nextKeys = Object.keys(next);
  if (prevKeys.length !== nextKeys.length) return false;
  for (let i = 0; i < prevKeys.length; i += 1) {
    const key = prevKeys[i];
    if (!Object.prototype.hasOwnProperty.call(next, key)) return false;
    if (!Object.is(prev[key], next[key])) return false;
  }
  return true;
}

export function createDefaultLowerCornerConfiguration(): NormalizedLowerCornerConfigurationLike {
  return {
    ...DEFAULT_LOWER_CORNER_CONFIGURATION,
    intDrawersList: cloneMutableCornerValue(DEFAULT_LOWER_CORNER_CONFIGURATION.intDrawersList),
    customData: sanitizeCornerCustomDataForPatch(DEFAULT_LOWER_CORNER_CONFIGURATION.customData),
    modulesConfiguration: [],
  };
}
