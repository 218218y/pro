import type { ProjectDataLike, ProjectSchemaValidationResult, UnknownRecord } from '../../../types/index.js';

import {
  PERSISTED_PROJECT_CONFIG_BRANCH_KEYS,
  readPersistedProjectConfigSnapshot,
} from '../features/project_config/project_config_persisted_snapshot.js';
import { isCanonicalRemovedDoorsMapKey } from '../../shared/removed_doors_map_keys_shared.js';

const REQUIRED_DIMENSION_KEYS = ['width', 'height', 'depth', 'doors'] as const;
const OPTIONAL_NUMERIC_SETTINGS_KEYS = [
  'cornerWidth',
  'cornerHeight',
  'cornerDepth',
  'cornerDoors',
  'stackSplitLowerHeight',
  'stackSplitLowerWidth',
  'stackSplitLowerDepth',
  'stackSplitLowerDoors',
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
] as const;
const BOOLEAN_SETTINGS_KEYS = [
  'isManualWidth',
  'stackSplitEnabled',
  'stackSplitDecorativeSeparatorEnabled',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDepthManual',
  'stackSplitLowerDoorsManual',
] as const;
const RETIRED_SETTINGS_KEYS = [
  'projectName',
  'chestDrawersCount',
  'chestCommodeMirrorHeightCm',
  'chestCommodeMirrorWidthCm',
  'chestCommodeMirrorWidthManual',
  'overlayFrameThicknessCm',
  'overlayShelfThicknessCm',
  'insetFrameThicknessCm',
  'insetShelfThicknessCm',
  'isLibraryMode',
  'preChestState',
  'grooveLinesCount',
  'lightAmb',
  'lightDir',
  'lightX',
  'lightY',
  'lightZ',
] as const;
const BOOLEAN_TOGGLE_KEYS = [
  'showContents',
  'showHanger',
  'showDimensions',
  'globalClickMode',
  'internalDrawers',
  'notesEnabled',
  'multiColor',
  'grooves',
  'chestMode',
  'chestCommode',
  'splitDoors',
  'handleControl',
  'cornerMode',
  'removeDoors',
  'addCornice',
  'sketchMode',
  'hingeDirection',
  'lightingControl',
] as const;

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function projectValuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!projectValuesEqual(left[i], right[i])) return false;
    }
    return true;
  }
  if (!isRecord(left) || !isRecord(right)) return false;
  const leftKeys = Object.keys(left).sort();
  const rightKeys = Object.keys(right).sort();
  if (leftKeys.length !== rightKeys.length) return false;
  for (let i = 0; i < leftKeys.length; i += 1) {
    if (leftKeys[i] !== rightKeys[i]) return false;
    if (!projectValuesEqual(left[leftKeys[i]], right[rightKeys[i]])) return false;
  }
  return true;
}

function hasDoorSegmentSuffix(value: string): boolean {
  return /_(?:full|top|bot|mid\d*)$/i.test(value);
}

function isCanonicalSplitDoorsMapKey(value: string): boolean {
  return (value.startsWith('split_') || value.startsWith('splitpos_')) && !hasDoorSegmentSuffix(value);
}

function isCanonicalSplitDoorsBottomMapKey(value: string): boolean {
  return value.startsWith('splitb_') && !hasDoorSegmentSuffix(value);
}

function isCanonicalGroovesMapKey(value: string): boolean {
  return value.startsWith('groove_');
}

function validateMapKeys(
  data: ProjectDataLike,
  mapName: keyof Pick<
    ProjectDataLike,
    'splitDoorsMap' | 'splitDoorsBottomMap' | 'removedDoorsMap' | 'groovesMap'
  >,
  isCanonicalKey: (key: string) => boolean,
  errors: string[]
): void {
  const map = data[mapName];
  if (!isRecord(map)) return;
  for (const key of Object.keys(map)) {
    if (!isCanonicalKey(key)) errors.push(`Project field ${String(mapName)} has non-canonical key ${key}`);
  }
}

export function validateProjectData(data: ProjectDataLike): ProjectSchemaValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(data)) return { ok: false, errors: ['Project root is not an object'], warnings };
  const settings = isRecord(data.settings) ? data.settings : null;
  const toggles = isRecord(data.toggles) ? data.toggles : null;
  if (!settings) errors.push('Missing "settings" object');
  if (!toggles) errors.push('Missing "toggles" object');

  if (settings) {
    for (const key of REQUIRED_DIMENSION_KEYS) {
      const value = settings[key];
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(`settings.${key} must be a finite number`);
      }
    }
    if (typeof settings.doors === 'number' && (!Number.isInteger(settings.doors) || settings.doors < 1)) {
      errors.push('settings.doors must be a positive integer');
    }
    for (const key of OPTIONAL_NUMERIC_SETTINGS_KEYS) {
      if (hasOwn(settings, key) && (typeof settings[key] !== 'number' || !Number.isFinite(settings[key]))) {
        errors.push(`settings.${key} must be a finite number`);
      }
    }
    for (const key of BOOLEAN_SETTINGS_KEYS) {
      if (hasOwn(settings, key) && typeof settings[key] !== 'boolean') {
        errors.push(`settings.${key} must be boolean`);
      }
    }
    if (
      hasOwn(settings, 'wardrobeType') &&
      settings.wardrobeType !== 'hinged' &&
      settings.wardrobeType !== 'sliding'
    ) {
      errors.push('settings.wardrobeType must be hinged or sliding');
    }
    if (
      hasOwn(settings, 'doorMountMode') &&
      settings.doorMountMode !== 'overlay' &&
      settings.doorMountMode !== 'inset'
    ) {
      errors.push('settings.doorMountMode must be overlay or inset');
    }
    if (
      hasOwn(settings, 'boardMaterial') &&
      settings.boardMaterial !== 'sandwich' &&
      settings.boardMaterial !== 'melamine'
    ) {
      errors.push('settings.boardMaterial must be sandwich or melamine');
    }
    if (
      hasOwn(settings, 'globalHandleType') &&
      settings.globalHandleType !== 'standard' &&
      settings.globalHandleType !== 'edge' &&
      settings.globalHandleType !== 'none'
    ) {
      errors.push('settings.globalHandleType must be standard, edge, or none');
    }
    if (hasOwn(settings, 'cornerSide') && settings.cornerSide !== 'left' && settings.cornerSide !== 'right') {
      errors.push('settings.cornerSide must be left or right');
    }
    for (const key of RETIRED_SETTINGS_KEYS) {
      if (hasOwn(settings, key)) errors.push(`Retired project field settings.${key} is not supported`);
    }
  }

  if (hasOwn(data, 'notes')) errors.push('Retired project field notes is not supported; use savedNotes');
  if (hasOwn(data, 'chestDrawers')) errors.push('Retired project field chestDrawers is not supported');
  if (hasOwn(data, 'version')) errors.push('Retired project field version is not supported');
  if (hasOwn(data, 'format')) errors.push('Retired project field format is not supported');
  if (hasOwn(data, 'projectName') && typeof data.projectName !== 'string') {
    errors.push('projectName must be a string');
  }
  if (
    hasOwn(data, 'orderPdfEditorZoom') &&
    (typeof data.orderPdfEditorZoom !== 'number' ||
      !Number.isFinite(data.orderPdfEditorZoom) ||
      data.orderPdfEditorZoom <= 0)
  ) {
    errors.push('orderPdfEditorZoom must be a positive finite number');
  }

  const chestSettings = data.chestSettings;
  if (typeof chestSettings !== 'undefined') {
    if (!isRecord(chestSettings)) {
      errors.push('chestSettings must be an object');
    } else {
      for (const key of ['drawersCount', 'mirrorHeightCm', 'mirrorWidthCm'] as const) {
        if (
          hasOwn(chestSettings, key) &&
          (typeof chestSettings[key] !== 'number' || !Number.isFinite(chestSettings[key]))
        ) {
          errors.push(`chestSettings.${key} must be a finite number`);
        }
      }
      for (const key of ['commodeEnabled', 'mirrorWidthManual'] as const) {
        if (hasOwn(chestSettings, key) && typeof chestSettings[key] !== 'boolean') {
          errors.push(`chestSettings.${key} must be boolean`);
        }
      }
    }
  }

  if (toggles) {
    for (const key of BOOLEAN_TOGGLE_KEYS) {
      if (hasOwn(toggles, key) && typeof toggles[key] !== 'boolean') {
        errors.push(`toggles.${key} must be boolean`);
      }
    }
  }

  if (data.modulesConfiguration && !Array.isArray(data.modulesConfiguration))
    errors.push('"modulesConfiguration" must be an array');
  if (data.stackSplitLowerModulesConfiguration && !Array.isArray(data.stackSplitLowerModulesConfiguration))
    errors.push('"stackSplitLowerModulesConfiguration" must be an array');
  if (data.splitDoorsMap && typeof data.splitDoorsMap !== 'object')
    errors.push('"splitDoorsMap" must be an object');
  if (data.splitDoorsBottomMap && typeof data.splitDoorsBottomMap !== 'object')
    errors.push('"splitDoorsBottomMap" must be an object');
  if (data.handlesMap && typeof data.handlesMap !== 'object') errors.push('"handlesMap" must be an object');
  if (data.hingeMap && typeof data.hingeMap !== 'object') errors.push('"hingeMap" must be an object');
  if (data.removedDoorsMap && typeof data.removedDoorsMap !== 'object')
    errors.push('"removedDoorsMap" must be an object');
  if (data.roundedFrameSideShelvesMap && typeof data.roundedFrameSideShelvesMap !== 'object')
    errors.push('"roundedFrameSideShelvesMap" must be an object');
  if (data.curtainMap && typeof data.curtainMap !== 'object') errors.push('"curtainMap" must be an object');
  if (data.doorSpecialMap && typeof data.doorSpecialMap !== 'object')
    errors.push('"doorSpecialMap" must be an object');
  if (data.individualColors && typeof data.individualColors !== 'object')
    errors.push('"individualColors" must be an object');
  if (data.doorStyleMap && typeof data.doorStyleMap !== 'object')
    errors.push('"doorStyleMap" must be an object');
  if (data.mirrorLayoutMap && typeof data.mirrorLayoutMap !== 'object')
    errors.push('"mirrorLayoutMap" must be an object');
  if (data.doorTrimMap && typeof data.doorTrimMap !== 'object')
    errors.push('"doorTrimMap" must be an object');
  if (data.groovesMap && typeof data.groovesMap !== 'object') errors.push('"groovesMap" must be an object');
  if (data.grooveLinesCountMap && typeof data.grooveLinesCountMap !== 'object')
    errors.push('"grooveLinesCountMap" must be an object');
  if (
    data.grooveLinesCount !== undefined &&
    data.grooveLinesCount !== null &&
    (typeof data.grooveLinesCount !== 'number' ||
      !Number.isFinite(data.grooveLinesCount) ||
      data.grooveLinesCount < 1)
  ) {
    errors.push('"grooveLinesCount" must be a positive finite number or null');
  }

  validateMapKeys(data, 'splitDoorsMap', isCanonicalSplitDoorsMapKey, errors);
  validateMapKeys(data, 'splitDoorsBottomMap', isCanonicalSplitDoorsBottomMapKey, errors);
  validateMapKeys(data, 'removedDoorsMap', isCanonicalRemovedDoorsMapKey, errors);
  validateMapKeys(data, 'groovesMap', isCanonicalGroovesMapKey, errors);

  if (!errors.length) {
    const canonicalConfig = readPersistedProjectConfigSnapshot(data as UnknownRecord);
    for (const key of PERSISTED_PROJECT_CONFIG_BRANCH_KEYS) {
      if (!hasOwn(data, key)) continue;
      if (!projectValuesEqual(data[key], canonicalConfig[key])) {
        errors.push(`Project field ${key} is not canonical`);
      }
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
