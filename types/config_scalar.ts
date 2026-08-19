// Canonical typed config scalar writes.

import type { BoardMaterial, DoorMountMode, DrawerRunnerType, HandleType, WardrobeType } from './domain';
import type { SavedColorLike } from './build';
import type { ModulesConfigurationLike, CornerConfigurationLike } from './modules_configuration';
import type { ProjectPreChestStateLike, ProjectSavedNotesLike } from './project';
import type { RoomArchitectureConfigLike } from './room_architecture';

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
  preChestState: ProjectPreChestStateLike | null;
  roomArchitecture: RoomArchitectureConfigLike;
};

export type ConfigScalarKey = keyof ConfigScalarValueMap;
export type ConfigScalarValue<K extends ConfigScalarKey> = ConfigScalarValueMap[K];

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
] as const satisfies readonly ConfigScalarKey[];

const CONFIG_SCALAR_KEY_SET = new Set<string>(CONFIG_SCALAR_KEYS);

export function isConfigScalarKey(key: unknown): key is ConfigScalarKey {
  return typeof key === 'string' && CONFIG_SCALAR_KEY_SET.has(key);
}

type MissingConfigScalarKey = Exclude<ConfigScalarKey, (typeof CONFIG_SCALAR_KEYS)[number]>;
type AssertNoMissingConfigScalarKey = MissingConfigScalarKey extends never ? true : never;
const CONFIG_SCALAR_KEYS_COMPLETE: AssertNoMissingConfigScalarKey = true;
void CONFIG_SCALAR_KEYS_COMPLETE;
