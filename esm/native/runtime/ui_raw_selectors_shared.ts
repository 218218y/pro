// Shared ui.raw selector contracts and scalar readers (ESM)
//
// Owns the small, side-effect-free helpers used by tolerant snapshot readers,
// canonical-only readers, and store adapters. Keeping these helpers here makes
// the tolerant snapshot boundary explicit instead of spreading parsing policy
// across runtime access surfaces.

import type {
  UiRawInputsLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
  UnknownRecord,
} from '../../../types/index.js';
import { cloneUiRawInputs } from '../../../types/ui_raw.js';
import { coerceFiniteInt, coerceFiniteNumber } from './num_coerce.js';
import { asRecord as asUnknownRecord } from './record.js';

export type MutableUiSnapshotLike = UnknownRecord & { raw?: UnknownRecord };

export type EssentialUiDimKey = 'doors' | 'width' | 'height' | 'depth' | 'chestDrawersCount';

export function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

export function isUiSnapshot(ui: unknown): ui is MutableUiSnapshotLike {
  return isObj(ui);
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (typeof value === 'undefined') return undefined;
  if (value == null) return null;
  return coerceFiniteNumber(value);
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

type UiScalarReaderMap = {
  [K in UiRawScalarKey]: (value: unknown) => UiRawScalarValueMap[K] | undefined;
};

const uiScalarReaders: UiScalarReaderMap = {
  width: readNullableNumber,
  height: readNullableNumber,
  depth: readNullableNumber,
  doors: readNullableNumber,
  chestDrawersCount: readNullableNumber,
  chestCommodeMirrorHeightCm: readNullableNumber,
  chestCommodeMirrorWidthCm: readNullableNumber,
  chestCommodeMirrorWidthManual: readBoolean,
  stackSplitLowerHeight: readNullableNumber,
  stackSplitLowerDepth: readNullableNumber,
  stackSplitLowerWidth: readNullableNumber,
  stackSplitLowerDoors: readNullableNumber,
  stackSplitLowerDepthManual: readBoolean,
  stackSplitLowerWidthManual: readBoolean,
  stackSplitLowerDoorsManual: readBoolean,
  cornerWidth: readNullableNumber,
  cornerHeight: readNullableNumber,
  cornerDepth: readNullableNumber,
  cornerDoors: readNullableNumber,
  cellDimsWidth: readNullableNumber,
  cellDimsHeight: readNullableNumber,
  cellDimsDepth: readNullableNumber,
};

export function readUiScalarValue<K extends UiRawScalarKey>(
  key: K,
  value: unknown
): UiRawScalarValueMap[K] | undefined {
  const reader = uiScalarReaders[key];
  return reader(value);
}

export function readUiDirectScalar<K extends UiRawScalarKey>(
  ui: MutableUiSnapshotLike,
  key: K
): UiRawScalarValueMap[K] | undefined {
  return readUiScalarValue(key, ui[key]);
}

export function ensureMutableRawInputs(ui: MutableUiSnapshotLike): UiRawInputsLike {
  const next = cloneUiRawInputs(ui.raw);
  ui.raw = next;
  return next;
}

export function getRawFromUiSnapshot(ui: unknown): UiRawInputsLike {
  try {
    if (!isUiSnapshot(ui)) return {};
    return cloneUiRawInputs(ui.raw);
  } catch {
    return {};
  }
}

export function missingEssentialUiRawDims(ui: unknown): EssentialUiDimKey[] {
  const missing: EssentialUiDimKey[] = [];
  const raw = getRawFromUiSnapshot(ui);
  const keys: EssentialUiDimKey[] = ['doors', 'width', 'height', 'depth'];
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(raw, key)) {
      missing.push(key);
      continue;
    }
    const value = readUiScalarValue(key, raw[key]);
    if (typeof value === 'undefined') missing.push(key);
  }
  return missing;
}

// Re-export shared coercion helpers for backwards compatibility through the facade.
export { coerceFiniteNumber, coerceFiniteInt };
