// Canonical-only ui.raw readers (ESM)
//
// Live runtime/build paths should use this owner after project ingress migration.
// It reads only `ui.raw`, never direct `ui.*` scalar fields.

import type { UiRawInputsLike, UiRawScalarKey, UiRawScalarValueMap } from '../../../types/index.js';
import { isUiRawBooleanKey, isUiRawNumericKey } from '../../../types/ui_raw.js';
import {
  coerceFiniteInt,
  coerceFiniteNumber,
  getRawFromUiSnapshot,
  isUiSnapshot,
} from './ui_raw_selectors_shared.js';
import {
  DEFAULT_CHEST_DRAWERS_COUNT,
  DEFAULT_HEIGHT,
  DEFAULT_HINGED_DOORS,
  DEFAULT_WIDTH,
  HINGED_DEFAULT_DEPTH,
} from '../../shared/wardrobe_dimension_tokens_shared.js';

function readCanonicalUiScalarValue<K extends UiRawScalarKey>(
  key: K,
  value: unknown
): UiRawScalarValueMap[K] | undefined {
  if (isUiRawBooleanKey(key)) {
    return (typeof value === 'boolean' ? value : undefined) as UiRawScalarValueMap[K] | undefined;
  }
  if (isUiRawNumericKey(key)) {
    return (value === null || (typeof value === 'number' && Number.isFinite(value)) ? value : undefined) as
      UiRawScalarValueMap[K] | undefined;
  }
  return undefined;
}

function missingCanonicalEssentialUiRawDims(ui: unknown): Array<'doors' | 'width' | 'height' | 'depth'> {
  const missing: Array<'doors' | 'width' | 'height' | 'depth'> = [];
  const raw = getRawFromUiSnapshot(ui);
  for (const key of ['doors', 'width', 'height', 'depth'] as const) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      missing.push(key);
      continue;
    }
    if (typeof readCanonicalUiScalarValue(key, raw[key]) === 'undefined') missing.push(key);
  }
  return missing;
}

/**
 * Read a canonical `ui.raw` scalar without direct `ui.*` scalar reads.
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
    return readCanonicalUiScalarValue(key, raw[key]);
  } catch {
    return undefined;
  }
}

export function hasCanonicalEssentialUiRawDimsFromSnapshot(ui: unknown): boolean {
  try {
    return missingCanonicalEssentialUiRawDims(ui).length === 0;
  } catch {
    return false;
  }
}

export function assertCanonicalUiRawDims(ui: unknown, context = 'ui.raw'): UiRawInputsLike {
  const missing = missingCanonicalEssentialUiRawDims(ui);
  if (missing.length) {
    throw new Error(`${context} missing canonical ui.raw dimension(s): ${missing.join(', ')}`);
  }
  return getRawFromUiSnapshot(ui);
}

/**
 * Canonical-only numeric reader for runtime/build paths.
 * Direct `ui.*` scalar reads belong at project ingress before this helper runs.
 */
export function readCanonicalUiRawNumberFromSnapshot(
  ui: unknown,
  key: UiRawScalarKey,
  defaultValue: number
): number {
  const v = readUiRawScalarFromCanonicalSnapshot(ui, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : defaultValue;
}

/**
 * Canonical-only integer reader for runtime/build paths.
 * Direct `ui.*` scalar reads belong at project ingress before this helper runs.
 */
export function readCanonicalUiRawIntFromSnapshot(
  ui: unknown,
  key: UiRawScalarKey,
  defaultValue: number
): number {
  const v = readUiRawScalarFromCanonicalSnapshot(ui, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : defaultValue;
}

/**
 * Canonical-only batch dimensions reader for runtime/build paths.
 * It fails fast when essential ui.raw dimensions are absent, keeping migration at project ingress.
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
  const widthCm = readCanonicalUiRawNumberFromSnapshot(ui, 'width', DEFAULT_WIDTH);
  const heightCm = readCanonicalUiRawNumberFromSnapshot(ui, 'height', DEFAULT_HEIGHT);
  const depthCm = readCanonicalUiRawNumberFromSnapshot(ui, 'depth', HINGED_DEFAULT_DEPTH);
  const doorsCount = readCanonicalUiRawIntFromSnapshot(ui, 'doors', DEFAULT_HINGED_DOORS);
  const chestDrawersCount = readCanonicalUiRawIntFromSnapshot(
    ui,
    'chestDrawersCount',
    DEFAULT_CHEST_DRAWERS_COUNT
  );
  return { widthCm, heightCm, depthCm, doorsCount, chestDrawersCount };
}
