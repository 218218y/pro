// UI raw inputs (canonical runtime helpers for builder-driving scalar fields).
// Unknown keys and invalid scalar values are filtered at parsing boundaries.
export const UI_RAW_BOOLEAN_KEYS = [
  'chestCommodeMirrorWidthManual',
  'stackSplitLowerDepthManual',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDoorsManual',
  'cellDimsHexMode',
];
export const UI_RAW_NUMERIC_KEYS = [
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
export const UI_RAW_SCALAR_KEYS = [...UI_RAW_NUMERIC_KEYS, ...UI_RAW_BOOLEAN_KEYS];
const UI_RAW_SCALAR_KEY_SET = new Set(UI_RAW_SCALAR_KEYS);
const UI_RAW_BOOLEAN_KEY_SET = new Set(UI_RAW_BOOLEAN_KEYS);
const UI_RAW_NUMERIC_KEY_SET = new Set(UI_RAW_NUMERIC_KEYS);
export function isUiRawScalarKey(key) {
  return typeof key === 'string' && UI_RAW_SCALAR_KEY_SET.has(key);
}
export function isUiRawBooleanKey(key) {
  return typeof key === 'string' && UI_RAW_BOOLEAN_KEY_SET.has(key);
}
export function isUiRawNumericKey(key) {
  return typeof key === 'string' && UI_RAW_NUMERIC_KEY_SET.has(key);
}
function isObjectRecord(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function readCanonicalRawValue(source, key) {
  const value = source[key];
  if (isUiRawBooleanKey(key)) return typeof value === 'boolean' ? value : undefined;
  return value === null || (typeof value === 'number' && Number.isFinite(value)) ? value : undefined;
}
function writeCanonicalRawValue(target, key, value) {
  target[key] = value;
}
export function asUiRawInputs(raw) {
  if (!isObjectRecord(raw)) return {};
  const next = {};
  for (const key of UI_RAW_SCALAR_KEYS) {
    const value = readCanonicalRawValue(raw, key);
    if (typeof value !== 'undefined') writeCanonicalRawValue(next, key, value);
  }
  return next;
}
export function cloneUiRawInputs(raw) {
  return asUiRawInputs(raw);
}
export const buildUiRawScalarPatch = (key, value) => {
  const patch = {};
  writeCanonicalRawValue(patch, key, value);
  return patch;
};
export function buildUiRawScalarPatchFromRecord(patch) {
  return asUiRawInputs(patch);
}
