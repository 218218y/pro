// Canonical typed config scalar writes.

import type { BoardMaterial, DoorMountMode, DrawerRunnerType, HandleType, WardrobeType } from './domain';
import type { SavedColorLike } from './build';
import type { ModulesConfigurationLike, CornerConfigurationLike } from './modules_configuration';
import type { IndividualColorsMap } from './maps';
import type { ProjectPreChestStateLike, ProjectSavedNotesLike } from './project';

export type ConfigScalarValueMap = {
  wardrobeType: WardrobeType;
  globalHandleType: HandleType;
  isLibraryMode: boolean;
  isMultiColorMode: boolean;
  showDimensions: boolean;
  MIRROR_REFLECTOR_ENABLED: boolean;
  isManualWidth: boolean;
  customUploadedDataURL: string | null;
  grooveLinesCount: number | null;
  boardMaterial: BoardMaterial | '';
  doorMountMode: DoorMountMode | '';
  drawerRunnerType: DrawerRunnerType;
  overlayFrameThicknessCm: number | null;
  overlayShelfThicknessCm: number | null;
  insetFrameThicknessCm: number | null;
  insetShelfThicknessCm: number | null;

  modulesConfiguration: ModulesConfigurationLike;
  stackSplitLowerModulesConfiguration: ModulesConfigurationLike;
  cornerConfiguration: CornerConfigurationLike;
  savedColors: SavedColorLike[];
  colorSwatchesOrder: string[];
  savedNotes: ProjectSavedNotesLike;
  individualColors: IndividualColorsMap;
  preChestState: ProjectPreChestStateLike;
};

export type ConfigScalarKey = keyof ConfigScalarValueMap;
export type ConfigScalarValue<K extends ConfigScalarKey> = ConfigScalarValueMap[K];
