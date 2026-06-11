import type { ProjectDataLike, SplitDoorsBottomMap, SplitDoorsMap } from '../../../types/index.js';

import { readMirrorLayoutMap } from '../features/mirror_layout.js';
import { readDoorTrimMap } from '../features/door_trim.js';
import { readDoorStyleMap } from '../features/door_style_overrides.js';

import {
  readCurtainMap,
  readDoorSpecialMap,
  readGrooveLinesCountMap,
  readGroovesMap,
  readHandlesMap,
  readHingeMap,
  readIndividualColorsMap,
  readRemovedDoorsMap,
} from './project_payload_shared.js';
import {
  normalizeSplitDoorsBottomMap as normalizeSplitDoorsBottomMapImpl,
  normalizeSplitDoorsMap as normalizeSplitDoorsMapImpl,
} from './project_schema_door_maps.js';
import {
  canonicalizeSegmentedDoorMaps,
  inferInternalDrawersToggle,
  inferStackSplitManualFlags,
  migrateDoorStylePayloadMaps,
  normalizeCornerConfigurationShape,
  normalizeGlobalHandleType,
  normalizeToggleDefaults,
  stampProjectSchemaMetadata,
  stripDeprecatedProjectCompatFields,
} from './project_schema_migrations.js';
import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  asObject,
  detectProjectSchemaVersion,
  ensureSettingsRecord,
  ensureTogglesRecord,
} from './project_schema_shared.js';

// FIX28: normalize per-door split map keys (strip *_full/_top/_bot suffixes) so persistence works across picker/build IDs.
export function normalizeSplitDoorsMap(map: unknown): SplitDoorsMap {
  return normalizeSplitDoorsMapImpl(map);
}

// Bottom split map keys: splitb_dX (opt-in). Normalize keys similarly to splitDoorsMap.
export function normalizeSplitDoorsBottomMap(map: unknown): SplitDoorsBottomMap {
  return normalizeSplitDoorsBottomMapImpl(map);
}

export function migrateProjectData(data: ProjectDataLike, nowISO?: string): ProjectDataLike {
  const detectedVersion = detectProjectSchemaVersion(data);

  ensureSettingsRecord(data);
  ensureTogglesRecord(data);

  data.splitDoorsMap = normalizeSplitDoorsMap(asObject(data.splitDoorsMap));
  data.splitDoorsBottomMap = normalizeSplitDoorsBottomMap(asObject(data.splitDoorsBottomMap));
  data.handlesMap = readHandlesMap(data.handlesMap);
  data.hingeMap = readHingeMap(data.hingeMap);
  data.removedDoorsMap = readRemovedDoorsMap(data.removedDoorsMap);
  data.curtainMap = readCurtainMap(data.curtainMap);
  data.groovesMap = readGroovesMap(data.groovesMap);
  data.grooveLinesCountMap = readGrooveLinesCountMap(data.grooveLinesCountMap);
  {
    const grooveLinesCountRaw: unknown = data.grooveLinesCount;
    if (grooveLinesCountRaw == null || grooveLinesCountRaw === '') data.grooveLinesCount = null;
    else {
      const grooveLinesCount = Number(grooveLinesCountRaw);
      data.grooveLinesCount = Number.isFinite(grooveLinesCount)
        ? Math.max(1, Math.floor(grooveLinesCount))
        : null;
    }
  }
  data.individualColors = readIndividualColorsMap(data.individualColors);
  data.doorSpecialMap = readDoorSpecialMap(data.doorSpecialMap);
  data.doorStyleMap = readDoorStyleMap(data.doorStyleMap);
  data.mirrorLayoutMap = readMirrorLayoutMap(data.mirrorLayoutMap);
  data.doorTrimMap = readDoorTrimMap(data.doorTrimMap);

  canonicalizeSegmentedDoorMaps(data);
  normalizeToggleDefaults(data, ensureTogglesRecord);
  normalizeGlobalHandleType(data, ensureSettingsRecord);
  migrateDoorStylePayloadMaps(data);
  normalizeCornerConfigurationShape(data);
  inferInternalDrawersToggle(data, ensureTogglesRecord);
  stripDeprecatedProjectCompatFields(data, ensureSettingsRecord);
  inferStackSplitManualFlags(data, ensureSettingsRecord);
  stampProjectSchemaMetadata({
    data,
    schemaId: PROJECT_SCHEMA_ID,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    nowISO,
    detectedVersion,
  });

  return data;
}
