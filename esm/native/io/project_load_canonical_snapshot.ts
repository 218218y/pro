import type {
  ConfigStateLike,
  ProjectDataLike,
  UiRawInputsLike,
  UiRawScalarKey,
  UiRawScalarValueMap,
  UnknownRecord,
} from '../../../types/index.js';
import { cloneUiRawInputs, UI_RAW_SCALAR_KEYS } from '../../../types/ui_raw.js';

import { buildProjectConfigSnapshot as buildProjectConfigSnapshotFromProjectLoad } from './project_io_load_helpers_config.js';

export type ProjectConfigSnapshotReplaceKey =
  | 'modulesConfiguration'
  | 'stackSplitLowerModulesConfiguration'
  | 'cornerConfiguration'
  | 'groovesMap'
  | 'grooveLinesCountMap'
  | 'splitDoorsMap'
  | 'splitDoorsBottomMap'
  | 'removedDoorsMap'
  | 'roundedFrameSideShelvesMap'
  | 'drawerDividersMap'
  | 'individualColors'
  | 'doorSpecialMap'
  | 'doorStyleMap'
  | 'mirrorLayoutMap'
  | 'doorTrimMap'
  | 'savedColors'
  | 'savedNotes'
  | 'preChestState'
  | 'handlesMap'
  | 'hingeMap'
  | 'curtainMap';

export type ProjectConfigScalarRequiredKey =
  | 'wardrobeType'
  | 'boardMaterial'
  | 'isManualWidth'
  | 'showDimensions'
  | 'isMultiColorMode'
  | 'isLibraryMode'
  | 'grooveLinesCount'
  | 'overlayFrameThicknessCm'
  | 'overlayShelfThicknessCm'
  | 'insetFrameThicknessCm'
  | 'insetShelfThicknessCm';

export type ProjectConfigSnapshotRequiredKey =
  | ProjectConfigScalarRequiredKey
  | ProjectConfigSnapshotReplaceKey;

export interface ProjectConfigCanonicalSnapshotResult {
  config: ConfigStateLike;
  missingKeys: ProjectConfigSnapshotRequiredKey[];
}

export const PROJECT_CONFIG_SCALAR_REQUIRED_KEYS = Object.freeze([
  'wardrobeType',
  'boardMaterial',
  'isManualWidth',
  'showDimensions',
  'isMultiColorMode',
  'isLibraryMode',
  'grooveLinesCount',
  'overlayFrameThicknessCm',
  'overlayShelfThicknessCm',
  'insetFrameThicknessCm',
  'insetShelfThicknessCm',
] as const satisfies readonly ProjectConfigScalarRequiredKey[]);

export const PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER = Object.freeze([
  'modulesConfiguration',
  'stackSplitLowerModulesConfiguration',
  'cornerConfiguration',
  'groovesMap',
  'grooveLinesCountMap',
  'splitDoorsMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'roundedFrameSideShelvesMap',
  'drawerDividersMap',
  'individualColors',
  'doorSpecialMap',
  'doorStyleMap',
  'mirrorLayoutMap',
  'doorTrimMap',
  'savedColors',
  'savedNotes',
  'preChestState',
  'handlesMap',
  'hingeMap',
  'curtainMap',
] as const satisfies readonly ProjectConfigSnapshotReplaceKey[]);

function buildProjectConfigSnapshotReplaceKeyMap(): Readonly<Record<ProjectConfigSnapshotReplaceKey, true>> {
  const out = {} as Record<ProjectConfigSnapshotReplaceKey, true>;
  for (const key of PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER) out[key] = true;
  return Object.freeze(out);
}

export function isProjectConfigSnapshotReplaceKey(key: string): key is ProjectConfigSnapshotReplaceKey {
  return Object.prototype.hasOwnProperty.call(PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS, key);
}

export const PROJECT_CONFIG_SNAPSHOT_REPLACE_KEYS = buildProjectConfigSnapshotReplaceKeyMap();

export const PROJECT_CONFIG_SNAPSHOT_REQUIRED_KEYS: readonly ProjectConfigSnapshotRequiredKey[] =
  Object.freeze([
    ...PROJECT_CONFIG_SCALAR_REQUIRED_KEYS,
    ...PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER,
  ] as const satisfies readonly ProjectConfigSnapshotRequiredKey[]);

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function readMissingCanonicalProjectConfigKeys(config: ConfigStateLike): ProjectConfigSnapshotRequiredKey[] {
  const record = config as UnknownRecord;
  const missing: ProjectConfigSnapshotRequiredKey[] = [];
  for (const key of PROJECT_CONFIG_SNAPSHOT_REQUIRED_KEYS) {
    if (!hasOwn(record, key) || typeof record[key] === 'undefined') missing.push(key);
  }
  return missing;
}

export function readCanonicalProjectConfigSnapshot(
  data: ProjectDataLike | UnknownRecord | null | undefined
): ProjectConfigCanonicalSnapshotResult {
  const config = buildProjectConfigSnapshotFromProjectLoad(data);
  return {
    config,
    missingKeys: readMissingCanonicalProjectConfigKeys(config),
  };
}

export function assertCanonicalProjectConfigSnapshot(
  config: ConfigStateLike,
  context = 'project.config'
): ConfigStateLike {
  const missing = readMissingCanonicalProjectConfigKeys(config);
  if (missing.length) {
    throw new Error(`${context} missing canonical config key(s): ${missing.join(', ')}`);
  }
  return config;
}

export function buildCanonicalProjectConfigSnapshot(
  data: ProjectDataLike | UnknownRecord | null | undefined
): ConfigStateLike {
  const result = readCanonicalProjectConfigSnapshot(data);
  return assertCanonicalProjectConfigSnapshot(result.config, 'project.load.config');
}

export type ProjectUiRawCanonicalizationResult = {
  ui: UnknownRecord;
  raw: UiRawInputsLike;
  normalizedKeys: UiRawScalarKey[];
  droppedKeys: UiRawScalarKey[];
};

type MutableUiSnapshotLike = UnknownRecord & { raw?: UnknownRecord | null };

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneUiSnapshot(ui: unknown): MutableUiSnapshotLike {
  return isRecord(ui) ? { ...ui } : {};
}

function coerceFiniteNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  return undefined;
}

function readNullableNumber(value: unknown): number | null | undefined {
  if (typeof value === 'undefined') return undefined;
  if (value === null) return null;
  return coerceFiniteNumber(value);
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

const projectUiRawReaders: {
  [K in UiRawScalarKey]: (value: unknown) => UiRawScalarValueMap[K] | undefined;
} = {
  width: readNullableNumber,
  height: readNullableNumber,
  depth: readNullableNumber,
  doors: readNullableNumber,
  chestDrawersCount: readNullableNumber,
  chestCommodeMirrorHeightCm: readNullableNumber,
  chestCommodeMirrorWidthCm: readNullableNumber,
  chestCommodeMirrorWidthManual: readBoolean,
  stackSplitLowerHeight: readNullableNumber,
  stackSplitLowerDepth: readNullableNumber,
  stackSplitLowerWidth: readNullableNumber,
  stackSplitLowerDoors: readNullableNumber,
  stackSplitLowerDepthManual: readBoolean,
  stackSplitLowerWidthManual: readBoolean,
  stackSplitLowerDoorsManual: readBoolean,
  cornerWidth: readNullableNumber,
  cornerHeight: readNullableNumber,
  cornerDepth: readNullableNumber,
  cornerDoors: readNullableNumber,
  cellDimsWidth: readNullableNumber,
  cellDimsHeight: readNullableNumber,
  cellDimsDepth: readNullableNumber,
  cellDimsHexMode: readBoolean,
  cellDimsHexProtrusion: readNullableNumber,
  cellDimsHexDoorWidth: readNullableNumber,
};

function readRawScalar<K extends UiRawScalarKey>(key: K, value: unknown): UiRawScalarValueMap[K] | undefined {
  return projectUiRawReaders[key](value);
}

function writeRawScalar<K extends UiRawScalarKey>(
  raw: UiRawInputsLike,
  key: K,
  value: UiRawScalarValueMap[K]
): void {
  raw[key] = value;
}

export function canonicalizeProjectUiSnapshot(ui: unknown): ProjectUiRawCanonicalizationResult {
  const source = cloneUiSnapshot(ui);
  const raw = cloneUiRawInputs(source.raw);
  const normalizedKeys: UiRawScalarKey[] = [];
  const droppedKeys: UiRawScalarKey[] = [];

  for (const key of UI_RAW_SCALAR_KEYS) {
    if (!hasOwn(raw as UnknownRecord, key) || typeof raw[key] === 'undefined') continue;

    const previousRawValue = raw[key];
    const canonicalRawValue = readRawScalar(key, previousRawValue);
    if (typeof canonicalRawValue === 'undefined') {
      delete raw[key];
      droppedKeys.push(key);
      continue;
    }

    writeRawScalar(raw, key, canonicalRawValue);
    if (!Object.is(previousRawValue, canonicalRawValue)) normalizedKeys.push(key);
  }

  return {
    ui: { ...source, raw },
    raw,
    normalizedKeys,
    droppedKeys,
  };
}

export function buildCanonicalProjectUiSnapshot(ui: unknown): UnknownRecord {
  return canonicalizeProjectUiSnapshot(ui).ui;
}
