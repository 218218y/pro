// Canonical-only ui.raw readers (ESM)
//
// Live runtime/build paths should use this owner after project ingress migration.
// It never falls back to legacy `ui.*` fields.

import type { UiRawInputsLike, UiRawScalarKey, UiRawScalarValueMap } from '../../../types/index.js';
import {
  coerceFiniteInt,
  coerceFiniteNumber,
  getRawFromUiSnapshot,
  isUiSnapshot,
  missingEssentialUiRawDims,
  readUiScalarValue,
} from './ui_raw_selectors_shared.js';

/**
 * Read a canonical `ui.raw` scalar without falling back to old `ui.*` fields.
 * Use this on live runtime/build paths after project load has migrated persisted shapes.
 */
export function readUiRawScalarFromCanonicalSnapshot<K extends UiRawScalarKey>(
  ui: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  try {
    if (!isUiSnapshot(ui)) return undefined;
    const raw = getRawFromUiSnapshot(ui);
    if (!Object.prototype.hasOwnProperty.call(raw, key)) return undefined;
    return readUiScalarValue(key, raw[key]);
  } catch {
    return undefined;
  }
}

export function hasCanonicalEssentialUiRawDimsFromSnapshot(ui: unknown): boolean {
  try {
    return missingEssentialUiRawDims(ui).length === 0;
  } catch {
    return false;
  }
}

export function assertCanonicalUiRawDims(ui: unknown, context = 'ui.raw'): UiRawInputsLike {
  const missing = missingEssentialUiRawDims(ui);
  if (missing.length) {
    throw new Error(`${context} missing canonical ui.raw dimension(s): ${missing.join(', ')}`);
  }
  return getRawFromUiSnapshot(ui);
}

/**
 * Canonical-only numeric reader for runtime/build paths.
 * This never falls back to legacy `ui.*`; project ingress must migrate those shapes first.
 */
export function readCanonicalUiRawNumberFromSnapshot(
  ui: unknown,
  key: UiRawScalarKey,
  fallback: number
): number {
  const v = readUiRawScalarFromCanonicalSnapshot(ui, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fallback;
}

/**
 * Canonical-only integer reader for runtime/build paths.
 * This never falls back to legacy `ui.*`; project ingress must migrate those shapes first.
 */
export function readCanonicalUiRawIntFromSnapshot(
  ui: unknown,
  key: UiRawScalarKey,
  fallback: number
): number {
  const v = readUiRawScalarFromCanonicalSnapshot(ui, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fallback;
}

/**
 * Canonical-only batch dimensions reader for runtime/build paths.
 * It fails fast when essential ui.raw dimensions are absent, keeping legacy migration at project ingress.
 */
export function readCanonicalUiRawDimsCmFromSnapshot(
  ui: unknown,
  context = 'ui.raw'
): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
} {
  assertCanonicalUiRawDims(ui, context);
  const widthCm = readCanonicalUiRawNumberFromSnapshot(ui, 'width', 160);
  const heightCm = readCanonicalUiRawNumberFromSnapshot(ui, 'height', 240);
  const depthCm = readCanonicalUiRawNumberFromSnapshot(ui, 'depth', 55);
  const doorsCount = readCanonicalUiRawIntFromSnapshot(ui, 'doors', 4);
  const chestDrawersCount = readCanonicalUiRawIntFromSnapshot(ui, 'chestDrawersCount', 4);
  return { widthCm, heightCm, depthCm, doorsCount, chestDrawersCount };
}
