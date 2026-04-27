// Corner configuration list/full snapshot normalization owner.
// Keeps list-only normalization, full snapshot materialization, and lower-config normalization aligned.

import {
  cloneMutableCornerValue,
  isRecord,
  readRecord,
  type CornerConfigurationLike,
  type NormalizedCornerConfigurationLike,
  type NormalizedLowerCornerConfigurationLike,
  type UnknownRecord,
} from './corner_cells_contracts.js';
import { sanitizeCornerCellListForPatch, sanitizeLowerCornerCellListForPatch } from './corner_cells_patch.js';
import {
  createDefaultLowerCornerConfiguration,
  DEFAULT_CORNER_CONFIGURATION,
  hasOwn,
  sanitizeCornerCustomDataForPatch,
  toIntMin,
} from './corner_cells_snapshot_shared.js';

function buildCornerStackSplitLowerListsShell(src: UnknownRecord, prev: UnknownRecord): UnknownRecord | null {
  const sslSrc = readRecord(src.stackSplitLower);
  const sslPrev = readRecord(prev.stackSplitLower);
  const hasSsl = hasOwn(src, 'stackSplitLower') || hasOwn(prev, 'stackSplitLower');
  if (!hasSsl) return null;

  const sslOut: UnknownRecord = Object.assign({}, sslPrev || {}, sslSrc || {});
  if (hasOwn(sslSrc, 'modulesConfiguration') || hasOwn(sslPrev, 'modulesConfiguration')) {
    sslOut.modulesConfiguration = sanitizeLowerCornerCellListForPatch(
      sslSrc ? sslSrc.modulesConfiguration : undefined,
      sslPrev ? sslPrev.modulesConfiguration : undefined
    );
  }
  return sslOut;
}

export function readCornerConfigurationFromConfigSnapshot(cfg: unknown): CornerConfigurationLike | null {
  const r = isRecord(cfg) ? cfg : null;
  if (!r) return null;
  const c = r.cornerConfiguration;
  return isRecord(c) ? c : null;
}

export function readCornerConfigurationLike(value: unknown): CornerConfigurationLike | null {
  const fromCfg = readCornerConfigurationFromConfigSnapshot(value);
  if (fromCfg) return fromCfg;
  return isRecord(value) ? value : null;
}

export function sanitizeCornerConfigurationListsOnly(
  nextVal: unknown,
  prevVal: unknown
): CornerConfigurationLike {
  const src: UnknownRecord = isRecord(nextVal) ? nextVal : isRecord(prevVal) ? prevVal : {};
  const prev: UnknownRecord = isRecord(prevVal) ? prevVal : {};

  const out: CornerConfigurationLike = Object.assign({}, src);

  if (hasOwn(src, 'modulesConfiguration') || hasOwn(prev, 'modulesConfiguration')) {
    out.modulesConfiguration = sanitizeCornerCellListForPatch(
      src.modulesConfiguration,
      prev.modulesConfiguration
    );
  }

  const sslOut = buildCornerStackSplitLowerListsShell(src, prev);
  if (sslOut) out.stackSplitLower = sslOut;

  return out;
}

export function sanitizeCornerConfigurationSnapshot(c: unknown): NormalizedCornerConfigurationLike {
  return sanitizeCornerConfigurationForPatch(c, c);
}

export function cloneCornerConfigurationSnapshot(c: unknown): NormalizedCornerConfigurationLike {
  return cloneMutableCornerValue(sanitizeCornerConfigurationSnapshot(c));
}

export function cloneCornerConfigurationListsSnapshot(c: unknown): CornerConfigurationLike {
  return cloneMutableCornerValue(sanitizeCornerConfigurationListsOnly(c, c));
}

export function sanitizeCornerConfigurationForPatch(
  nextVal: unknown,
  prevVal: unknown
): NormalizedCornerConfigurationLike {
  const src: UnknownRecord = isRecord(nextVal) ? nextVal : isRecord(prevVal) ? prevVal : {};
  const prev: UnknownRecord = isRecord(prevVal) ? prevVal : {};

  const out: NormalizedCornerConfigurationLike = Object.assign({}, DEFAULT_CORNER_CONFIGURATION, src);

  if (typeof out.layout !== 'string') out.layout = 'shelves';
  out.extDrawersCount = toIntMin(out.extDrawersCount, 0, 0);
  out.hasShoeDrawer = !!out.hasShoeDrawer;
  out.isCustom = !!out.isCustom;
  out.gridDivisions = toIntMin(out.gridDivisions, 6, 1);
  out.intDrawersList = Array.isArray(out.intDrawersList) ? cloneMutableCornerValue(out.intDrawersList) : [];
  out.intDrawersSlot = toIntMin(out.intDrawersSlot, 0, 0);
  out.customData = sanitizeCornerCustomDataForPatch(out.customData);

  if (hasOwn(src, 'modulesConfiguration') || hasOwn(prev, 'modulesConfiguration')) {
    out.modulesConfiguration = sanitizeCornerCellListForPatch(
      src.modulesConfiguration,
      prev.modulesConfiguration
    );
  }

  const sslOut = buildCornerStackSplitLowerListsShell(src, prev);
  if (sslOut) out.stackSplitLower = sslOut;

  return out;
}

export function sanitizeLowerCornerConfigurationForPatch(
  nextVal: unknown,
  prevVal: unknown
): NormalizedLowerCornerConfigurationLike {
  const src: UnknownRecord = isRecord(nextVal) ? nextVal : isRecord(prevVal) ? prevVal : {};
  const prev: UnknownRecord = isRecord(prevVal) ? prevVal : {};
  const out: NormalizedLowerCornerConfigurationLike = Object.assign(
    createDefaultLowerCornerConfiguration(),
    prev,
    src
  );

  if (typeof out.layout !== 'string' || !out.layout) out.layout = 'shelves';
  out.extDrawersCount = toIntMin(out.extDrawersCount, 0, 0);
  out.hasShoeDrawer = !!out.hasShoeDrawer;
  out.intDrawersList = Array.isArray(out.intDrawersList) ? cloneMutableCornerValue(out.intDrawersList) : [];
  out.intDrawersSlot = toIntMin(out.intDrawersSlot, 0, 0);
  out.isCustom = typeof out.isCustom === 'undefined' ? true : !!out.isCustom;
  out.gridDivisions = toIntMin(out.gridDivisions, 6, 1);
  out.customData = sanitizeCornerCustomDataForPatch(out.customData);
  out.modulesConfiguration = sanitizeLowerCornerCellListForPatch(
    src.modulesConfiguration,
    prev.modulesConfiguration
  );

  return cloneMutableCornerValue(out);
}

export function normalizeLowerCornerConfigurationSnapshot(
  value: unknown
): NormalizedLowerCornerConfigurationLike {
  return sanitizeLowerCornerConfigurationForPatch(value, value);
}
