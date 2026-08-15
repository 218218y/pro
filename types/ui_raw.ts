// UI raw inputs (typed keys for builder-driving numeric fields).
//
// Purpose:
// - Provide a stable, typed map for the most common `ui.raw.*` keys.
// - Keep the store-owned raw surface closed; unknown external keys are filtered at parsing boundaries.

export interface UiRawInputsLike {
  // Core structural dims (cm)
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  doors?: number | null;

  // Structural layout controls persisted alongside build-driving raw inputs.
  structureSelect?: string;
  singleDoorPos?: string;

  // Chest mode
  chestDrawersCount?: number | null;
  chestCommodeMirrorHeightCm?: number | null;
  chestCommodeMirrorWidthCm?: number | null;
  chestCommodeMirrorWidthManual?: boolean;

  // Stack split lower unit
  stackSplitLowerHeight?: number | null;
  stackSplitLowerDepth?: number | null;
  stackSplitLowerWidth?: number | null;
  stackSplitLowerDoors?: number | null;
  stackSplitLowerDepthManual?: boolean;
  stackSplitLowerWidthManual?: boolean;
  stackSplitLowerDoorsManual?: boolean;

  // Corner wardrobes (some flows store these under raw)
  cornerWidth?: number | null;
  cornerHeight?: number | null;
  cornerDepth?: number | null;
  cornerDoors?: number | null;

  // Per-cell dimension editor (draft-only)
  cellDimsWidth?: number | null;
  cellDimsHeight?: number | null;
  cellDimsDepth?: number | null;
  cellDimsHexMode?: boolean;
  cellDimsHexProtrusion?: number | null;
  cellDimsHexDoorWidth?: number | null;
}

// Scalar keys we intentionally type-check at call sites.
// Keep this list focused on "hot" keys that are used broadly.
export type UiRawStringKey = 'structureSelect' | 'singleDoorPos';

export type UiRawBooleanKey =
  | 'chestCommodeMirrorWidthManual'
  | 'stackSplitLowerDepthManual'
  | 'stackSplitLowerWidthManual'
  | 'stackSplitLowerDoorsManual'
  | 'cellDimsHexMode';

export type UiRawNumericKey =
  | 'width'
  | 'height'
  | 'depth'
  | 'doors'
  | 'chestDrawersCount'
  | 'chestCommodeMirrorHeightCm'
  | 'chestCommodeMirrorWidthCm'
  | 'stackSplitLowerHeight'
  | 'stackSplitLowerDepth'
  | 'stackSplitLowerWidth'
  | 'stackSplitLowerDoors'
  | 'cornerWidth'
  | 'cornerHeight'
  | 'cornerDepth'
  | 'cornerDoors'
  | 'cellDimsWidth'
  | 'cellDimsHeight'
  | 'cellDimsDepth'
  | 'cellDimsHexProtrusion'
  | 'cellDimsHexDoorWidth';

export type UiRawScalarKey = UiRawNumericKey | UiRawBooleanKey;

export type UiRawScalarValueMap = {
  [K in UiRawScalarKey]-?: Exclude<UiRawInputsLike[K], undefined>;
};

export const UI_RAW_STRING_KEYS: readonly UiRawStringKey[] = ['structureSelect', 'singleDoorPos'];

export const UI_RAW_BOOLEAN_KEYS: readonly UiRawBooleanKey[] = [
  'chestCommodeMirrorWidthManual',
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
  'cellDimsHexMode',
];

export const UI_RAW_NUMERIC_KEYS: readonly UiRawNumericKey[] = [
  'width',
  'height',
  'depth',
  'doors',
  'chestDrawersCount',
  'chestCommodeMirrorHeightCm',
  'chestCommodeMirrorWidthCm',
  'stackSplitLowerHeight',
  'stackSplitLowerDepth',
  'stackSplitLowerWidth',
  'stackSplitLowerDoors',
  'cornerWidth',
  'cornerHeight',
  'cornerDepth',
  'cornerDoors',
  'cellDimsWidth',
  'cellDimsHeight',
  'cellDimsDepth',
  'cellDimsHexProtrusion',
  'cellDimsHexDoorWidth',
];

export const UI_RAW_SCALAR_KEYS: readonly UiRawScalarKey[] = [...UI_RAW_NUMERIC_KEYS, ...UI_RAW_BOOLEAN_KEYS];

const UI_RAW_SCALAR_KEY_SET = new Set<string>(UI_RAW_SCALAR_KEYS);
const UI_RAW_BOOLEAN_KEY_SET = new Set<string>(UI_RAW_BOOLEAN_KEYS);
const UI_RAW_STRING_KEY_SET = new Set<string>(UI_RAW_STRING_KEYS);
const UI_RAW_NUMERIC_KEY_SET = new Set<string>(UI_RAW_NUMERIC_KEYS);

export function isUiRawScalarKey(key: unknown): key is UiRawScalarKey {
  return typeof key === 'string' && UI_RAW_SCALAR_KEY_SET.has(key);
}

export function isUiRawBooleanKey(key: unknown): key is UiRawBooleanKey {
  return typeof key === 'string' && UI_RAW_BOOLEAN_KEY_SET.has(key);
}

export function isUiRawStringKey(key: unknown): key is UiRawStringKey {
  return typeof key === 'string' && UI_RAW_STRING_KEY_SET.has(key);
}

export function isUiRawNumericKey(key: unknown): key is UiRawNumericKey {
  return typeof key === 'string' && UI_RAW_NUMERIC_KEY_SET.has(key);
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readCanonicalRawValue<K extends UiRawScalarKey>(
  source: Record<string, unknown>,
  key: K
): UiRawScalarValueMap[K] | undefined {
  const value = source[key];
  if (isUiRawBooleanKey(key)) {
    return (typeof value === 'boolean' ? value : undefined) as UiRawScalarValueMap[K] | undefined;
  }
  return (value === null || (typeof value === 'number' && Number.isFinite(value)) ? value : undefined) as
    UiRawScalarValueMap[K] | undefined;
}

function writeCanonicalRawValue<K extends UiRawScalarKey>(
  target: UiRawInputsLike,
  key: K,
  value: UiRawScalarValueMap[K]
): void {
  target[key] = value;
}

export function asUiRawInputs(raw: unknown): UiRawInputsLike {
  if (!isObjectRecord(raw)) return {};
  const next: UiRawInputsLike = {};
  for (const key of UI_RAW_SCALAR_KEYS) {
    const value = readCanonicalRawValue(raw, key);
    if (typeof value !== 'undefined') writeCanonicalRawValue(next, key, value);
  }
  for (const key of UI_RAW_STRING_KEYS) {
    const value = raw[key];
    if (typeof value === 'string') next[key] = value;
  }
  return next;
}

export function cloneUiRawInputs(raw: unknown): UiRawInputsLike {
  return asUiRawInputs(raw);
}

export type BuildUiRawScalarPatch = <K extends UiRawScalarKey>(
  key: K,
  value: UiRawScalarValueMap[K]
) => UiRawInputsLike;

export const buildUiRawScalarPatch: BuildUiRawScalarPatch = <K extends UiRawScalarKey>(
  key: K,
  value: UiRawScalarValueMap[K]
): UiRawInputsLike => {
  const patch: UiRawInputsLike = {};
  writeCanonicalRawValue(patch, key, value);
  return patch;
};

export function buildUiRawScalarPatchFromRecord(patch: unknown): UiRawInputsLike {
  return asUiRawInputs(patch);
}
