import {
  canonicalizeComparableProjectConfigSnapshot,
  canonicalizeProjectConfigListsForLoad,
} from './project_io_config_snapshot_canonical.js';
import { readConfigStateProjectConfigSnapshot } from '../features/project_config/project_config_persisted_snapshot.js';

import type {
  ConfigStateLike,
  ProjectDataEnvelopeLike,
  ProjectDataLike,
  UnknownRecord,
} from '../../../types/index.js';

import { normalizeSavedColorObjectsSnapshot } from '../runtime/maps_access_normalizers_collections.js';
import {
  normalizeGlobalHandleType,
  readProjectSettings,
  readProjectToggles,
} from './project_io_load_helpers_shared.js';
import { asObjectRecord } from './project_payload_shared.js';
import { unwrapProjectEnvelope } from './project_schema_shared.js';
import { normalizeDoorMountThicknessCm } from '../../shared/wardrobe_dimension_tokens_shared.js';

function buildComparableLoadConfigSnapshot(
  rec: UnknownRecord,
  settings: UnknownRecord,
  canonicalConfigLists: {
    modulesConfiguration: unknown[];
    stackSplitLowerModulesConfiguration: unknown[];
    cornerConfiguration: UnknownRecord;
  }
): UnknownRecord {
  const comparableSource: UnknownRecord = {
    ...rec,
    modulesConfiguration: canonicalConfigLists.modulesConfiguration,
    stackSplitLowerModulesConfiguration: canonicalConfigLists.stackSplitLowerModulesConfiguration,
    cornerConfiguration: canonicalConfigLists.cornerConfiguration,
  };

  return canonicalizeComparableProjectConfigSnapshot(comparableSource, {
    settings,
    cornerMode: 'full',
    savedColorsMode: 'mixed',
  });
}

function readProjectConfigSource(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): UnknownRecord {
  return unwrapProjectEnvelope(data) ?? asObjectRecord(data) ?? {};
}

function readLoadedDoorMountThicknessCm(settingsValue: unknown, persistedValue: unknown): number | null {
  const value = typeof settingsValue === 'undefined' ? persistedValue : settingsValue;
  return normalizeDoorMountThicknessCm(value);
}

export function buildProjectConfigSnapshot(
  data: ProjectDataLike | ProjectDataEnvelopeLike | UnknownRecord | null | undefined
): ConfigStateLike {
  const rec = readProjectConfigSource(data);
  const settings = readProjectSettings(rec);
  const toggles = readProjectToggles(rec);
  const canonicalConfigLists = canonicalizeProjectConfigListsForLoad(rec, settings);
  const canonicalConfig = buildComparableLoadConfigSnapshot(rec, settings, canonicalConfigLists);
  const persistedConfig = readConfigStateProjectConfigSnapshot(canonicalConfig);

  const cfg: ConfigStateLike = {
    ...persistedConfig,
    savedColors: normalizeSavedColorObjectsSnapshot(persistedConfig.savedColors),
    wardrobeType: settings.wardrobeType || 'hinged',
    doorMountMode: settings.doorMountMode === 'inset' ? 'inset' : 'overlay',
    overlayFrameThicknessCm: readLoadedDoorMountThicknessCm(
      settings.overlayFrameThicknessCm,
      persistedConfig.overlayFrameThicknessCm
    ),
    overlayShelfThicknessCm: readLoadedDoorMountThicknessCm(
      settings.overlayShelfThicknessCm,
      persistedConfig.overlayShelfThicknessCm
    ),
    insetFrameThicknessCm: readLoadedDoorMountThicknessCm(
      settings.insetFrameThicknessCm,
      persistedConfig.insetFrameThicknessCm
    ),
    insetShelfThicknessCm: readLoadedDoorMountThicknessCm(
      settings.insetShelfThicknessCm,
      persistedConfig.insetShelfThicknessCm
    ),
    boardMaterial: settings.boardMaterial === 'melamine' ? 'melamine' : 'sandwich',
    isManualWidth: !!settings.isManualWidth,
    showDimensions: typeof toggles.showDimensions !== 'undefined' ? toggles.showDimensions !== false : true,
    isMultiColorMode: !!toggles.multiColor,
    preChestState:
      typeof persistedConfig.preChestState !== 'undefined' ? persistedConfig.preChestState : null,
    isLibraryMode: !!persistedConfig.isLibraryMode,
    grooveLinesCount:
      typeof persistedConfig.grooveLinesCount === 'number' || persistedConfig.grooveLinesCount === null
        ? persistedConfig.grooveLinesCount
        : null,
  };
  if (typeof settings.globalHandleType !== 'undefined') {
    const globalHandleType = normalizeGlobalHandleType(settings.globalHandleType);
    if (globalHandleType) cfg.globalHandleType = globalHandleType;
  }
  return cfg;
}
