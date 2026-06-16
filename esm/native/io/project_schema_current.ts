import type { ProjectDataLike } from '../../../types/index.js';

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
  readRoundedFrameSideShelvesMap,
} from './project_payload_shared.js';
import {
  normalizeSplitDoorsBottomMap as normalizeSplitDoorsBottomMapImpl,
  normalizeSplitDoorsMap as normalizeSplitDoorsMapImpl,
} from './project_schema_door_maps.js';
import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  asObject,
  ensureSettingsRecord,
  ensureTogglesRecord,
} from './project_schema_shared.js';

function normalizeGrooveLinesCount(value: unknown): number | null {
  if (value == null || value === '') return null;
  const grooveLinesCount = Number(value);
  return Number.isFinite(grooveLinesCount) ? Math.max(1, Math.floor(grooveLinesCount)) : null;
}

function normalizeGlobalHandleType(settings: Record<string, unknown>): void {
  const value = settings.globalHandleType;
  if (value === 'edge' || value === 'none' || value === 'standard') return;
  if (typeof value !== 'undefined') delete settings.globalHandleType;
}

export function normalizeCurrentProjectData(data: ProjectDataLike, nowISO?: string): ProjectDataLike {
  const settings = ensureSettingsRecord(data);
  ensureTogglesRecord(data);

  data.splitDoorsMap = normalizeSplitDoorsMapImpl(asObject(data.splitDoorsMap));
  data.splitDoorsBottomMap = normalizeSplitDoorsBottomMapImpl(asObject(data.splitDoorsBottomMap));
  data.handlesMap = readHandlesMap(data.handlesMap);
  data.hingeMap = readHingeMap(data.hingeMap);
  data.removedDoorsMap = readRemovedDoorsMap(data.removedDoorsMap);
  data.roundedFrameSideShelvesMap = readRoundedFrameSideShelvesMap(data.roundedFrameSideShelvesMap);
  data.curtainMap = readCurtainMap(data.curtainMap);
  data.groovesMap = readGroovesMap(data.groovesMap);
  data.grooveLinesCountMap = readGrooveLinesCountMap(data.grooveLinesCountMap);
  data.grooveLinesCount = normalizeGrooveLinesCount(data.grooveLinesCount);
  data.individualColors = readIndividualColorsMap(data.individualColors);
  data.doorSpecialMap = readDoorSpecialMap(data.doorSpecialMap);
  data.doorStyleMap = readDoorStyleMap(data.doorStyleMap);
  data.mirrorLayoutMap = readMirrorLayoutMap(data.mirrorLayoutMap);
  data.doorTrimMap = readDoorTrimMap(data.doorTrimMap);

  normalizeGlobalHandleType(settings);

  data.__schema = PROJECT_SCHEMA_ID;
  data.__version = PROJECT_SCHEMA_VERSION;
  if (!data.__createdAt && nowISO) data.__createdAt = nowISO;

  return data;
}
