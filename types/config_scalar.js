// Canonical runtime config-scalar key registry.
// Keep runtime exports in parity with config_scalar.ts so bundlers that resolve
// explicit `.js` specifiers see the same public value surface as TypeScript.
export const CONFIG_SCALAR_KEYS = [
  'wardrobeType',
  'globalHandleType',
  'isLibraryMode',
  'isMultiColorMode',
  'showDimensions',
  'MIRROR_REFLECTOR_ENABLED',
  'isManualWidth',
  'customUploadedDataURL',
  'grooveLinesCount',
  'boardMaterial',
  'doorMountMode',
  'drawerRunnerType',
  'overlayFrameThicknessCm',
  'overlayShelfThicknessCm',
  'insetFrameThicknessCm',
  'insetShelfThicknessCm',
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
  'savedColors',
  'colorSwatchesOrder',
  'savedNotes',
  'preChestState',
  'roomArchitecture',
];

const CONFIG_SCALAR_KEY_SET = new Set(CONFIG_SCALAR_KEYS);

export function isConfigScalarKey(key) {
  return typeof key === 'string' && CONFIG_SCALAR_KEY_SET.has(key);
}
