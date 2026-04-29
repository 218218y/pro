// UI raw selectors + normalization helpers (ESM)
//
// Purpose:
// - Keep all "ui.raw" parsing rules in one place.
// - Allow legacy persisted values (string, '', null) without spreading checks everywhere.
// - Provide both snapshot-based and store-based readers.
//
// Notes:
// - No DOM access.
// - Fail-soft: never throw.

import type {
  UiRawInputsLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
  UnknownRecord,
} from '../../../types/index.js';
import { cloneUiRawInputs } from '../../../types/ui_raw.js';
import { readUiRawScalarFromStore, readUiStateFromStore } from './root_state_access.js';
import { coerceFiniteInt, coerceFiniteNumber } from './num_coerce.js';
import { asRecord as asUnknownRecord } from './record.js';

type MutableUiSnapshotLike = UnknownRecord & { raw?: UnknownRecord };

type EssentialUiDimKey = 'doors' | 'width' | 'height' | 'depth' | 'chestDrawersCount';

function isObj(v: unknown): v is UnknownRecord {
  return !!asUnknownRecord(v);
}

function isUiSnapshot(ui: unknown): ui is MutableUiSnapshotLike {
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

function readUiScalarValue<K extends UiRawScalarKey>(
  key: K,
  value: unknown
): UiRawScalarValueMap[K] | undefined {
  const reader = uiScalarReaders[key];
  return reader(value);
}

function readUiDirectScalar<K extends UiRawScalarKey>(
  ui: MutableUiSnapshotLike,
  key: K
): UiRawScalarValueMap[K] | undefined {
  return readUiScalarValue(key, ui[key]);
}

function ensureMutableRawInputs(ui: MutableUiSnapshotLike): UiRawInputsLike {
  const next = cloneUiRawInputs(ui.raw);
  ui.raw = next;
  return next;
}

// Re-export shared coercion helpers for backwards compatibility
export { coerceFiniteNumber, coerceFiniteInt };

function getRawFromUiSnapshot(ui: unknown): UiRawInputsLike {
  try {
    if (!isUiSnapshot(ui)) return {};
    return cloneUiRawInputs(ui.raw);
  } catch {
    return {};
  }
}

function missingEssentialUiRawDims(ui: unknown): EssentialUiDimKey[] {
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

/**
 * Read a raw scalar from a UI snapshot.
 *
 * Rules:
 * - Prefer ui.raw[key] when it exists (even if null).
 * - Otherwise fall back to ui[key].
 */
export function readUiRawScalarFromSnapshot<K extends UiRawScalarKey>(
  ui: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  try {
    if (!isUiSnapshot(ui)) return undefined;
    const raw = getRawFromUiSnapshot(ui);
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      return readUiScalarValue(key, raw[key]);
    }
    return readUiDirectScalar(ui, key);
  } catch {
    return undefined;
  }
}

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

export function hasEssentialUiDimsFromSnapshot(ui: unknown): boolean {
  try {
    const w = readUiRawScalarFromSnapshot(ui, 'width');
    const h = readUiRawScalarFromSnapshot(ui, 'height');
    const d = readUiRawScalarFromSnapshot(ui, 'depth');
    const doors = readUiRawScalarFromSnapshot(ui, 'doors');
    return !(w === undefined || h === undefined || d === undefined || doors === undefined);
  } catch {
    return false;
  }
}

export function ensureUiRawDimsFromSnapshot(ui: unknown): UiRawInputsLike {
  try {
    if (!isUiSnapshot(ui)) return {};
    const raw = ensureMutableRawInputs(ui);

    // Fill raw.* from ui.* if missing (legacy snapshots sometimes persisted only normalized fields).
    const keys: EssentialUiDimKey[] = ['doors', 'width', 'height', 'depth', 'chestDrawersCount'];
    for (const key of keys) {
      if (!Object.prototype.hasOwnProperty.call(raw, key) || raw[key] === undefined) {
        const value = readUiDirectScalar(ui, key);
        if (typeof value !== 'undefined') {
          raw[key] = value;
        }
      }
    }
    return raw;
  } catch {
    return {};
  }
}

export function readUiRawNumberFromSnapshot(ui: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fallback;
}

export function readUiRawIntFromSnapshot(ui: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fallback;
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

export function readUiRawNumberFromStore(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : fallback;
}

export function readUiRawIntFromStore(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const v = readUiRawScalarFromStore(store, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : fallback;
}

// Convenience: read from store.ui snapshot (not just ui.raw)
export function readUiRawNumberFromStoreUi(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const ui = readUiStateFromStore(store);
  return readUiRawNumberFromSnapshot(ui, key, fallback);
}

export function readUiRawIntFromStoreUi(store: unknown, key: UiRawScalarKey, fallback: number): number {
  const ui = readUiStateFromStore(store);
  return readUiRawIntFromSnapshot(ui, key, fallback);
}

export function readCanonicalUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readCanonicalUiRawDimsCmFromSnapshot(ui);
}

// Batch helper (handy for chest/door flows)
export function readUiRawDimsCmFromSnapshot(ui: unknown): {
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
} {
  const widthCm = readUiRawNumberFromSnapshot(ui, 'width', 160);
  const heightCm = readUiRawNumberFromSnapshot(ui, 'height', 240);
  const depthCm = readUiRawNumberFromSnapshot(ui, 'depth', 55);
  const doorsCount = readUiRawIntFromSnapshot(ui, 'doors', 4);
  const chestDrawersCount = readUiRawIntFromSnapshot(ui, 'chestDrawersCount', 4);
  return { widthCm, heightCm, depthCm, doorsCount, chestDrawersCount };
}

export function readUiRawDimsCmFromStore(store: unknown) {
  const ui = readUiStateFromStore(store);
  return readUiRawDimsCmFromSnapshot(ui);
}
