// Typed config scalar keys and their value types.
//
// Goal: bring type-safety to the most common `setCfgScalar(key, value)` calls
// without restricting the migration. We keep a fallback signature to allow
// older/dynamic keys where necessary.

import type { BoardMaterial, HandleType, WardrobeType } from './domain';
import type { SavedColorLike } from './build';
import type { ModulesConfigurationLike, CornerConfigurationLike } from './modules_configuration';
import type { IndividualColorsMap } from './maps';
import type { ProjectPreChestStateLike, ProjectSavedNotesLike } from './project';

export type ConfigScalarKey =
  | 'wardrobeType'
  | 'globalHandleType'
  | 'isLibraryMode'
  | 'isMultiColorMode'
  | 'showDimensions'
  | 'isManualWidth'
  | 'customUploadedDataURL'
  | 'grooveLinesCount'
  | 'boardMaterial'
  // Common persisted collections (treated as scalars in the write contract)
  | 'modulesConfiguration'
  | 'stackSplitLowerModulesConfiguration'
  | 'cornerConfiguration'
  | 'savedColors'
  | 'colorSwatchesOrder'
  | 'savedNotes'
  | 'individualColors'
  | 'preChestState'
  // Dimensions (some flows store these under config; keep typed where possible)
  | 'width'
  | 'height'
  | 'depth'
  | 'dirty';

export type ConfigScalarValueMap = {
  wardrobeType: WardrobeType;
  globalHandleType: HandleType;
  isLibraryMode: boolean;
  isMultiColorMode: boolean;
  showDimensions: boolean;
  isManualWidth: boolean;
  customUploadedDataURL: string | null;
  grooveLinesCount: number | null;
  boardMaterial: BoardMaterial | '';

  modulesConfiguration: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration: ModulesConfigurationLike;
  cornerConfiguration: CornerConfigurationLike;
  savedColors: SavedColorLike[];
  colorSwatchesOrder: string[];
  savedNotes: ProjectSavedNotesLike;
  individualColors: IndividualColorsMap;
  preChestState: ProjectPreChestStateLike;

  width: number;
  height: number;
  depth: number;
  dirty: boolean;
};

export type ConfigScalarValue<K extends ConfigScalarKey> = ConfigScalarValueMap[K];
