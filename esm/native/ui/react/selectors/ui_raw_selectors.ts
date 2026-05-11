// esm/native/ui/react/selectors/ui_raw_selectors.ts
//
// UI-only raw selectors + normalization helpers.
//
// Why this file exists:
// - React UI must NOT depend on esm/native/runtime (layer contract).
// - The UI still needs a single place to normalize/parse ui.raw values.
//
// Notes:
// - Snapshot-only helpers (no store imports).
// - Fail-soft: never throw.

import type { UiRawInputsLike, UiRawScalarKey, UiRawScalarValueMap } from '../../../../../types/index.js';
import { cloneUiRawInputs } from '../../../../../types/ui_raw.js';

type RecordLike = Record<string, unknown>;
type UiSnapshotLike = RecordLike & Partial<UiRawScalarValueMap> & { raw?: unknown };
type UiRawScalarReaderMap = {
  [K in UiRawScalarKey]: (source: unknown) => UiRawScalarValueMap[K] | undefined;
};

function isObj(v: unknown): v is RecordLike {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isUiSnapshot(ui: unknown): ui is UiSnapshotLike {
  return isObj(ui);
}

function asUiSnapshot(ui: unknown): UiSnapshotLike | null {
  return isUiSnapshot(ui) ? ui : null;
}

function coerceFiniteNumber(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function coerceFiniteInt(v: unknown): number | undefined {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'number' ? v : parseInt(String(v), 10);
  return Number.isFinite(n) ? n : undefined;
}

function coerceBoolean(v: unknown): boolean | undefined {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return !!v;
  if (typeof v !== 'string') return undefined;
  const s = v.trim().toLowerCase();
  if (!s) return undefined;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return undefined;
}

function readSourceProp(source: unknown, key: string): unknown {
  return isObj(source) ? source[key] : undefined;
}

function readNullableNumberProp(source: unknown, key: string): number | null | undefined {
  const value = readSourceProp(source, key);
  if (value === null) return null;
  return coerceFiniteNumber(value);
}

function readBooleanProp(source: unknown, key: string): boolean | undefined {
  return coerceBoolean(readSourceProp(source, key));
}

const uiRawScalarReaders: UiRawScalarReaderMap = {
  width: source => readNullableNumberProp(source, 'width'),
  height: source => readNullableNumberProp(source, 'height'),
  depth: source => readNullableNumberProp(source, 'depth'),
  doors: source => readNullableNumberProp(source, 'doors'),
  chestDrawersCount: source => readNullableNumberProp(source, 'chestDrawersCount'),
  chestCommodeMirrorHeightCm: source => readNullableNumberProp(source, 'chestCommodeMirrorHeightCm'),
  chestCommodeMirrorWidthCm: source => readNullableNumberProp(source, 'chestCommodeMirrorWidthCm'),
  chestCommodeMirrorWidthManual: source => readBooleanProp(source, 'chestCommodeMirrorWidthManual'),
  stackSplitLowerHeight: source => readNullableNumberProp(source, 'stackSplitLowerHeight'),
  stackSplitLowerDepth: source => readNullableNumberProp(source, 'stackSplitLowerDepth'),
  stackSplitLowerWidth: source => readNullableNumberProp(source, 'stackSplitLowerWidth'),
  stackSplitLowerDoors: source => readNullableNumberProp(source, 'stackSplitLowerDoors'),
  stackSplitLowerDepthManual: source => readBooleanProp(source, 'stackSplitLowerDepthManual'),
  stackSplitLowerWidthManual: source => readBooleanProp(source, 'stackSplitLowerWidthManual'),
  stackSplitLowerDoorsManual: source => readBooleanProp(source, 'stackSplitLowerDoorsManual'),
  cornerWidth: source => readNullableNumberProp(source, 'cornerWidth'),
  cornerHeight: source => readNullableNumberProp(source, 'cornerHeight'),
  cornerDepth: source => readNullableNumberProp(source, 'cornerDepth'),
  cornerDoors: source => readNullableNumberProp(source, 'cornerDoors'),
  cellDimsWidth: source => readNullableNumberProp(source, 'cellDimsWidth'),
  cellDimsHeight: source => readNullableNumberProp(source, 'cellDimsHeight'),
  cellDimsDepth: source => readNullableNumberProp(source, 'cellDimsDepth'),
};

function readUiRawValue<K extends UiRawScalarKey>(
  source: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  return uiRawScalarReaders[key](source);
}

function getRawFromUiSnapshot(ui: unknown): UiRawInputsLike {
  try {
    const u = asUiSnapshot(ui);
    if (!u) return {};
    return cloneUiRawInputs(u.raw);
  } catch {
    return {};
  }
}

export function readUiRawScalarFromSnapshot<K extends UiRawScalarKey>(
  ui: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  try {
    const u = asUiSnapshot(ui);
    if (!u) return undefined;
    const raw = getRawFromUiSnapshot(u);
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      return readUiRawValue(raw, key);
    }
    return readUiRawValue(u, key);
  } catch {
    return undefined;
  }
}

export function readUiRawNumberFromSnapshot(ui: unknown, key: UiRawScalarKey, defaultValue: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteNumber(v);
  return typeof n === 'number' ? n : defaultValue;
}

export function readUiRawIntFromSnapshot(ui: unknown, key: UiRawScalarKey, defaultValue: number): number {
  const v = readUiRawScalarFromSnapshot(ui, key);
  const n = coerceFiniteInt(v);
  return typeof n === 'number' ? n : defaultValue;
}
