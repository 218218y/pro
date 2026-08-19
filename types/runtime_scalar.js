// Canonical runtime scalar key registries.
// Keep runtime exports in parity with runtime_scalar.ts so bundlers that resolve
// explicit `.js` specifiers see the same public value surface as TypeScript.
export const RUNTIME_SCALAR_KEYS = [
  'sketchMode',
  'globalClickMode',
  'doorsOpen',
  'doorsLastToggleTime',
  'drawersOpenId',
  'restoring',
  'systemReady',
  'roomDesignActive',
  'notesPicking',
  'failFast',
  'verboseConsoleErrors',
  'verboseConsoleErrorsDedupeMs',
  'debug',
  'wardrobeWidthM',
  'wardrobeHeightM',
  'wardrobeDepthM',
  'wardrobeDoorsCount',
];

const RUNTIME_SCALAR_KEY_SET = new Set(RUNTIME_SCALAR_KEYS);

export function isRuntimeScalarKey(key) {
  return typeof key === 'string' && RUNTIME_SCALAR_KEY_SET.has(key);
}

export const RUNTIME_ACTION_SCALAR_KEYS = [
  ...RUNTIME_SCALAR_KEYS,
  'paintColor',
  'handlesType',
  'interiorManualTool',
];

const RUNTIME_ACTION_SCALAR_KEY_SET = new Set(RUNTIME_ACTION_SCALAR_KEYS);

export function isRuntimeActionScalarKey(key) {
  return typeof key === 'string' && RUNTIME_ACTION_SCALAR_KEY_SET.has(key);
}
