import type {
  ProjectDataLike,
  ProjectPreChestStateLike,
  ProjectSavedNotesLike,
  SavedColorLike,
  UnknownRecord,
} from '../../../../types/index.js';

import { normalizeSavedColorsList } from '../../../shared/maps_access_collections_shared.js';
import { cloneCornerConfigurationListsSnapshot } from '../modules_configuration/corner_cells_api.js';
import { cloneModulesConfigurationSnapshot } from '../modules_configuration/modules_config_api.js';
import {
  cloneProjectJson,
  readCurtainMap,
  readDoorSpecialMap,
  readDoorStyleMap,
  readDoorTrimConfigMap,
  readGrooveLinesCountMap,
  readGroovesMap,
  readHandlesMap,
  readHingeMap,
  readIndividualColorsMap,
  readMirrorLayoutConfigMap,
  readRemovedDoorsMap,
  readSplitDoorsBottomMapValue,
  readSplitDoorsMapValue,
  readToggleMap,
} from './project_config_persisted_payload_shared.js';
import {
  PERSISTED_PROJECT_CONFIG_BRANCH_KEYS,
  type PersistedProjectConfigBranchKey,
} from './project_config_snapshot_canonical_shared.js';

export type PersistedSavedColorsSnapshot = Array<SavedColorLike | string>;
type PersistedCornerConfigurationSnapshot = ReturnType<typeof cloneCornerConfigurationListsSnapshot>;

export interface PersistedProjectConfigSnapshot {
  modulesConfiguration: NonNullable<ProjectDataLike['modulesConfiguration']>;
  stackSplitLowerModulesConfiguration: NonNullable<ProjectDataLike['stackSplitLowerModulesConfiguration']>;
  cornerConfiguration: PersistedCornerConfigurationSnapshot;
  groovesMap: NonNullable<ProjectDataLike['groovesMap']>;
  grooveLinesCountMap: NonNullable<ProjectDataLike['grooveLinesCountMap']>;
  splitDoorsMap: NonNullable<ProjectDataLike['splitDoorsMap']>;
  splitDoorsBottomMap: NonNullable<ProjectDataLike['splitDoorsBottomMap']>;
  removedDoorsMap: NonNullable<ProjectDataLike['removedDoorsMap']>;
  drawerDividersMap: NonNullable<ProjectDataLike['drawerDividersMap']>;
  individualColors: NonNullable<ProjectDataLike['individualColors']>;
  doorSpecialMap: NonNullable<ProjectDataLike['doorSpecialMap']>;
  doorStyleMap: NonNullable<ProjectDataLike['doorStyleMap']>;
  mirrorLayoutMap: NonNullable<ProjectDataLike['mirrorLayoutMap']>;
  doorTrimMap: NonNullable<ProjectDataLike['doorTrimMap']>;
  handlesMap: NonNullable<ProjectDataLike['handlesMap']>;
  hingeMap: NonNullable<ProjectDataLike['hingeMap']>;
  curtainMap: NonNullable<ProjectDataLike['curtainMap']>;
  savedColors: PersistedSavedColorsSnapshot;
  savedNotes: ProjectSavedNotesLike;
  preChestState: ProjectPreChestStateLike;
  isLibraryMode: boolean | undefined;
  grooveLinesCount: number | null | undefined;
}

export interface ConfigStateProjectConfigSnapshot extends PersistedProjectConfigSnapshot {
  savedColors: PersistedSavedColorsSnapshot;
  cornerConfiguration: PersistedCornerConfigurationSnapshot;
}

type ComparableProjectConfigSnapshot = PersistedProjectConfigSnapshot & ConfigStateProjectConfigSnapshot;

type ComparableProjectConfigBranchReader<K extends PersistedProjectConfigBranchKey> = (
  canonicalConfig: UnknownRecord
) => ComparableProjectConfigSnapshot[K];

function cloneSavedColorEntry(entry: SavedColorLike | string): SavedColorLike | string {
  return typeof entry === 'string' ? entry : { ...entry };
}

function cloneSavedColorsSnapshot(value: unknown): PersistedSavedColorsSnapshot {
  return normalizeSavedColorsList(value).map(cloneSavedColorEntry);
}

function isSavedNoteLike(value: unknown): value is ProjectSavedNotesLike[number] {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneSavedNotesSnapshot(value: unknown): ProjectSavedNotesLike {
  const cloned = cloneProjectJson(Array.isArray(value) ? value : []);
  if (!Array.isArray(cloned)) return [];

  const out: ProjectSavedNotesLike = [];
  for (const entry of cloned) {
    if (isSavedNoteLike(entry)) out.push(entry);
  }
  return out;
}

function clonePreChestStateSnapshot(value: unknown): ProjectPreChestStateLike {
  if (value === null) return null;
  const cloned = cloneProjectJson(typeof value === 'undefined' ? null : value);
  return cloned && typeof cloned === 'object' && !Array.isArray(cloned) ? cloned : null;
}

function readIsLibraryMode(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function readGrooveLinesCount(value: unknown): ProjectDataLike['grooveLinesCount'] {
  if (value === null) return null;
  if (typeof value === 'undefined') return undefined;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

const PERSISTED_PROJECT_CONFIG_BRANCH_READERS: {
  [K in PersistedProjectConfigBranchKey]: ComparableProjectConfigBranchReader<K>;
} = {
  modulesConfiguration: canonicalConfig =>
    cloneModulesConfigurationSnapshot(canonicalConfig, 'modulesConfiguration'),
  stackSplitLowerModulesConfiguration: canonicalConfig =>
    cloneModulesConfigurationSnapshot(canonicalConfig, 'stackSplitLowerModulesConfiguration'),
  cornerConfiguration: canonicalConfig =>
    cloneCornerConfigurationListsSnapshot(canonicalConfig.cornerConfiguration),
  groovesMap: canonicalConfig => readGroovesMap(canonicalConfig.groovesMap),
  grooveLinesCountMap: canonicalConfig => readGrooveLinesCountMap(canonicalConfig.grooveLinesCountMap),
  splitDoorsMap: canonicalConfig => readSplitDoorsMapValue(canonicalConfig.splitDoorsMap),
  splitDoorsBottomMap: canonicalConfig => readSplitDoorsBottomMapValue(canonicalConfig.splitDoorsBottomMap),
  removedDoorsMap: canonicalConfig => readRemovedDoorsMap(canonicalConfig.removedDoorsMap),
  drawerDividersMap: canonicalConfig => readToggleMap(canonicalConfig.drawerDividersMap),
  individualColors: canonicalConfig => readIndividualColorsMap(canonicalConfig.individualColors),
  doorSpecialMap: canonicalConfig => readDoorSpecialMap(canonicalConfig.doorSpecialMap),
  doorStyleMap: canonicalConfig => readDoorStyleMap(canonicalConfig.doorStyleMap),
  mirrorLayoutMap: canonicalConfig => readMirrorLayoutConfigMap(canonicalConfig.mirrorLayoutMap),
  doorTrimMap: canonicalConfig => readDoorTrimConfigMap(canonicalConfig.doorTrimMap),
  handlesMap: canonicalConfig => readHandlesMap(canonicalConfig.handlesMap),
  hingeMap: canonicalConfig => readHingeMap(canonicalConfig.hingeMap),
  curtainMap: canonicalConfig => readCurtainMap(canonicalConfig.curtainMap),
  savedColors: canonicalConfig => cloneSavedColorsSnapshot(canonicalConfig.savedColors),
  savedNotes: canonicalConfig => cloneSavedNotesSnapshot(canonicalConfig.savedNotes),
  preChestState: canonicalConfig => clonePreChestStateSnapshot(canonicalConfig.preChestState),
  isLibraryMode: canonicalConfig => readIsLibraryMode(canonicalConfig.isLibraryMode),
  grooveLinesCount: canonicalConfig => readGrooveLinesCount(canonicalConfig.grooveLinesCount),
};

function readComparableProjectConfigSnapshot(
  canonicalConfig: UnknownRecord
): ComparableProjectConfigSnapshot {
  return {
    modulesConfiguration: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.modulesConfiguration(canonicalConfig),
    stackSplitLowerModulesConfiguration:
      PERSISTED_PROJECT_CONFIG_BRANCH_READERS.stackSplitLowerModulesConfiguration(canonicalConfig),
    cornerConfiguration: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.cornerConfiguration(canonicalConfig),
    groovesMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.groovesMap(canonicalConfig),
    grooveLinesCountMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.grooveLinesCountMap(canonicalConfig),
    splitDoorsMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.splitDoorsMap(canonicalConfig),
    splitDoorsBottomMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.splitDoorsBottomMap(canonicalConfig),
    removedDoorsMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.removedDoorsMap(canonicalConfig),
    drawerDividersMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.drawerDividersMap(canonicalConfig),
    individualColors: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.individualColors(canonicalConfig),
    doorSpecialMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.doorSpecialMap(canonicalConfig),
    doorStyleMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.doorStyleMap(canonicalConfig),
    mirrorLayoutMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.mirrorLayoutMap(canonicalConfig),
    doorTrimMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.doorTrimMap(canonicalConfig),
    handlesMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.handlesMap(canonicalConfig),
    hingeMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.hingeMap(canonicalConfig),
    curtainMap: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.curtainMap(canonicalConfig),
    savedColors: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.savedColors(canonicalConfig),
    savedNotes: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.savedNotes(canonicalConfig),
    preChestState: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.preChestState(canonicalConfig),
    isLibraryMode: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.isLibraryMode(canonicalConfig),
    grooveLinesCount: PERSISTED_PROJECT_CONFIG_BRANCH_READERS.grooveLinesCount(canonicalConfig),
  };
}

export function readPersistedProjectConfigSnapshot(
  canonicalConfig: UnknownRecord
): PersistedProjectConfigSnapshot {
  return readComparableProjectConfigSnapshot(canonicalConfig);
}

export function readConfigStateProjectConfigSnapshot(
  canonicalConfig: UnknownRecord
): ConfigStateProjectConfigSnapshot {
  return readComparableProjectConfigSnapshot(canonicalConfig);
}

export { PERSISTED_PROJECT_CONFIG_BRANCH_KEYS };
