import type { ProjectDataLike } from '../../../types/index.js';

import { normalizeKnownProjectConfigMap } from './project_config_codec_access.js';

import {
  PROJECT_SCHEMA_ID,
  PROJECT_SCHEMA_VERSION,
  ensureSettingsRecord,
  ensureTogglesRecord,
} from './project_schema_shared.js';

function normalizeGrooveLinesCount(value: unknown): number | null {
  if (value == null) return null;
  return typeof value === 'number' && Number.isFinite(value) && value >= 1
    ? Math.max(1, Math.floor(value))
    : null;
}

function normalizeDrawerRunnerType(settings: Record<string, unknown>): void {
  const value = settings.drawerRunnerType;
  if (value === 'roller' || value === 'blum') return;
  if (typeof value !== 'undefined') delete settings.drawerRunnerType;
}

function normalizeGlobalHandleType(settings: Record<string, unknown>): void {
  const value = settings.globalHandleType;
  if (value === 'edge' || value === 'none' || value === 'standard') return;
  if (typeof value !== 'undefined') delete settings.globalHandleType;
}

export function normalizeCurrentProjectData(data: ProjectDataLike, nowISO?: string): ProjectDataLike {
  const settings = ensureSettingsRecord(data);
  ensureTogglesRecord(data);

  data.splitDoorsMap = normalizeKnownProjectConfigMap('splitDoorsMap', data.splitDoorsMap) as NonNullable<
    ProjectDataLike['splitDoorsMap']
  >;
  data.splitDoorsBottomMap = normalizeKnownProjectConfigMap(
    'splitDoorsBottomMap',
    data.splitDoorsBottomMap
  ) as NonNullable<ProjectDataLike['splitDoorsBottomMap']>;
  data.handlesMap = normalizeKnownProjectConfigMap('handlesMap', data.handlesMap) as NonNullable<
    ProjectDataLike['handlesMap']
  >;
  data.hingeMap = normalizeKnownProjectConfigMap('hingeMap', data.hingeMap) as NonNullable<
    ProjectDataLike['hingeMap']
  >;
  data.removedDoorsMap = normalizeKnownProjectConfigMap(
    'removedDoorsMap',
    data.removedDoorsMap
  ) as NonNullable<ProjectDataLike['removedDoorsMap']>;
  data.roundedFrameSideShelvesMap = normalizeKnownProjectConfigMap(
    'roundedFrameSideShelvesMap',
    data.roundedFrameSideShelvesMap
  ) as NonNullable<ProjectDataLike['roundedFrameSideShelvesMap']>;
  data.drawerDividersMap = normalizeKnownProjectConfigMap(
    'drawerDividersMap',
    data.drawerDividersMap
  ) as NonNullable<ProjectDataLike['drawerDividersMap']>;
  data.curtainMap = normalizeKnownProjectConfigMap('curtainMap', data.curtainMap) as NonNullable<
    ProjectDataLike['curtainMap']
  >;
  data.groovesMap = normalizeKnownProjectConfigMap('groovesMap', data.groovesMap) as NonNullable<
    ProjectDataLike['groovesMap']
  >;
  data.grooveLinesCountMap = normalizeKnownProjectConfigMap(
    'grooveLinesCountMap',
    data.grooveLinesCountMap
  ) as NonNullable<ProjectDataLike['grooveLinesCountMap']>;
  data.grooveLinesCount = normalizeGrooveLinesCount(data.grooveLinesCount);
  data.individualColors = normalizeKnownProjectConfigMap(
    'individualColors',
    data.individualColors
  ) as NonNullable<ProjectDataLike['individualColors']>;
  data.doorSpecialMap = normalizeKnownProjectConfigMap('doorSpecialMap', data.doorSpecialMap) as NonNullable<
    ProjectDataLike['doorSpecialMap']
  >;
  data.doorStyleMap = normalizeKnownProjectConfigMap('doorStyleMap', data.doorStyleMap) as NonNullable<
    ProjectDataLike['doorStyleMap']
  >;
  data.grooveLayoutMap = normalizeKnownProjectConfigMap(
    'grooveLayoutMap',
    data.grooveLayoutMap
  ) as NonNullable<ProjectDataLike['grooveLayoutMap']>;
  data.mirrorLayoutMap = normalizeKnownProjectConfigMap(
    'mirrorLayoutMap',
    data.mirrorLayoutMap
  ) as NonNullable<ProjectDataLike['mirrorLayoutMap']>;
  data.doorTrimMap = normalizeKnownProjectConfigMap('doorTrimMap', data.doorTrimMap) as NonNullable<
    ProjectDataLike['doorTrimMap']
  >;

  normalizeDrawerRunnerType(settings);
  normalizeGlobalHandleType(settings);

  data.__schema = PROJECT_SCHEMA_ID;
  data.__version = PROJECT_SCHEMA_VERSION;
  if (!data.__createdAt && nowISO) data.__createdAt = nowISO;

  return data;
}
