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
