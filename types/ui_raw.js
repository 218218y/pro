// UI raw inputs (typed keys for builder-driving numeric fields).
//
// Purpose:
// - Provide a stable, typed map for the most common `ui.raw.*` keys.
// - Keep the surface permissive (index signature) for legacy/experimental keys.
export const UI_RAW_BOOLEAN_KEYS = [
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
];
export const UI_RAW_NUMERIC_KEYS = [
  'width',
  'height',
  'depth',
  'doors',
  'chestDrawersCount',
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
export const UI_RAW_SCALAR_KEYS = [...UI_RAW_NUMERIC_KEYS, ...UI_RAW_BOOLEAN_KEYS];
const UI_RAW_SCALAR_KEY_SET = new Set([...UI_RAW_SCALAR_KEYS]);
const UI_RAW_BOOLEAN_KEY_SET = new Set([...UI_RAW_BOOLEAN_KEYS]);
const UI_RAW_NUMERIC_KEY_SET = new Set([...UI_RAW_NUMERIC_KEYS]);
export function isUiRawScalarKey(key) {
  return typeof key === 'string' && UI_RAW_SCALAR_KEY_SET.has(key);
}
export function isUiRawBooleanKey(key) {
  return typeof key === 'string' && UI_RAW_BOOLEAN_KEY_SET.has(key);
}
export function isUiRawNumericKey(key) {
  return typeof key === 'string' && UI_RAW_NUMERIC_KEY_SET.has(key);
}
function isObjectRecord(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}
export function asUiRawInputs(raw) {
  return isObjectRecord(raw) ? { ...raw } : {};
}
export function cloneUiRawInputs(raw) {
  return { ...asUiRawInputs(raw) };
}
export const buildUiRawScalarPatch = (key, value) => {
  const k = String(key || '');
  if (!k) return {};
  const patch = {};
  patch[k] = value;
  return patch;
};
export function buildUiRawScalarPatchFromRecord(patch) {
  if (!isObjectRecord(patch)) return {};
  const next = {};
  for (const key of Object.keys(patch)) next[key] = patch[key];
  return next;
}
