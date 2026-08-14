// Canonical typed config scalar writes.

import type { ConfigStateLike } from './build';

export type ConfigScalarKey =
  | 'wardrobeType'
  | 'globalHandleType'
  | 'isLibraryMode'
  | 'isMultiColorMode'
  | 'showDimensions'
  | 'MIRROR_REFLECTOR_ENABLED'
  | 'isManualWidth'
  | 'customUploadedDataURL'
  | 'grooveLinesCount'
  | 'boardMaterial'
  | 'doorMountMode'
  | 'drawerRunnerType'
  | 'overlayFrameThicknessCm'
  | 'overlayShelfThicknessCm'
  | 'insetFrameThicknessCm'
  | 'insetShelfThicknessCm'
  | 'modulesConfiguration'
  | 'stackSplitLowerModulesConfiguration'
  | 'cornerConfiguration'
  | 'savedColors'
  | 'colorSwatchesOrder'
  | 'savedNotes'
  | 'individualColors'
  | 'preChestState';

export type ConfigScalarValueMap = {
  [K in ConfigScalarKey]-?: Exclude<ConfigStateLike[K], undefined>;
};

export type ConfigScalarValue<K extends ConfigScalarKey> = ConfigScalarValueMap[K];
