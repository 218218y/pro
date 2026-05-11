// UI raw inputs (typed keys for builder-driving numeric fields).
//
// Purpose:
// - Provide a stable, typed map for the most common `ui.raw.*` keys.
// - Keep the surface permissive (index signature) for legacy/experimental keys.

import type { UnknownRecord } from './common';

export interface UiRawInputsLike extends UnknownRecord {
  // Core structural dims (cm)
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  doors?: number | null;

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

  // Allow legacy/experimental keys without churn.
  [k: string]: unknown;
}

// Scalar keys we intentionally type-check at call sites.
// Keep this list focused on "hot" keys that are used broadly.
export type UiRawBooleanKey =
  | 'chestCommodeMirrorWidthManual'
  | 'stackSplitLowerDepthManual'
  | 'stackSplitLowerWidthManual'
  | 'stackSplitLowerDoorsManual';

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
  | 'cellDimsDepth';

export type UiRawScalarKey = UiRawNumericKey | UiRawBooleanKey;

export type UiRawScalarValueMap = {
  width: number | null;
  height: number | null;
  depth: number | null;
  doors: number | null;
  chestDrawersCount: number | null;
  chestCommodeMirrorHeightCm: number | null;
  chestCommodeMirrorWidthCm: number | null;
  chestCommodeMirrorWidthManual: boolean;

  stackSplitLowerHeight: number | null;
  stackSplitLowerDepth: number | null;
  stackSplitLowerWidth: number | null;
  stackSplitLowerDoors: number | null;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;

  cornerWidth: number | null;
  cornerHeight: number | null;
  cornerDepth: number | null;
  cornerDoors: number | null;

  cellDimsWidth: number | null;
  cellDimsHeight: number | null;
  cellDimsDepth: number | null;
};

export const UI_RAW_BOOLEAN_KEYS: readonly UiRawBooleanKey[] = [
  'chestCommodeMirrorWidthManual',
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
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
];

export const UI_RAW_SCALAR_KEYS: readonly UiRawScalarKey[] = [...UI_RAW_NUMERIC_KEYS, ...UI_RAW_BOOLEAN_KEYS];

const UI_RAW_SCALAR_KEY_SET = new Set<string>([...UI_RAW_SCALAR_KEYS]);
const UI_RAW_BOOLEAN_KEY_SET = new Set<string>([...UI_RAW_BOOLEAN_KEYS]);
const UI_RAW_NUMERIC_KEY_SET = new Set<string>([...UI_RAW_NUMERIC_KEYS]);

export function isUiRawScalarKey(key: unknown): key is UiRawScalarKey {
  return typeof key === 'string' && UI_RAW_SCALAR_KEY_SET.has(key);
}

export function isUiRawBooleanKey(key: unknown): key is UiRawBooleanKey {
  return typeof key === 'string' && UI_RAW_BOOLEAN_KEY_SET.has(key);
}

export function isUiRawNumericKey(key: unknown): key is UiRawNumericKey {
  return typeof key === 'string' && UI_RAW_NUMERIC_KEY_SET.has(key);
}

function isObjectRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asUiRawInputs(raw: unknown): UiRawInputsLike {
  return isObjectRecord(raw) ? { ...raw } : {};
}

export function cloneUiRawInputs(raw: unknown): UiRawInputsLike {
  return { ...asUiRawInputs(raw) };
}

export type BuildUiRawScalarPatch = {
  <K extends UiRawScalarKey>(key: K, value: UiRawScalarValueMap[K]): UiRawInputsLike;
  (key: string, value: unknown): UiRawInputsLike;
};

export const buildUiRawScalarPatch: BuildUiRawScalarPatch = (
  key: string,
  value: unknown
): UiRawInputsLike => {
  const k = String(key || '');
  if (!k) return {};
  const patch: UiRawInputsLike = {};
  patch[k] = value;
  return patch;
};

export function buildUiRawScalarPatchFromRecord(patch: unknown): UiRawInputsLike {
  if (!isObjectRecord(patch)) return {};
  const next: UiRawInputsLike = {};
  for (const key of Object.keys(patch)) next[key] = patch[key];
  return next;
}
