import type { SavedModelLike, UnknownRecord } from '../../../../types/index.js';
import {
  cloneCanonicalFeatureValue,
  fingerprintCanonicalFeatureValue,
  serializeCanonicalFeatureValue,
} from '../canonical_codec_runtime.js';

import { normalizeModelRecord, type SavedModelRecordLike } from './model_record_normalization.js';

function isRecordValue(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: UnknownRecord, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasValidOptionalField(
  record: UnknownRecord,
  key: string,
  predicate: (value: unknown) => boolean
): boolean {
  return !hasOwn(record, key) || predicate(record[key]);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isBooleanArray(value: unknown): boolean {
  return Array.isArray(value) && value.every(entry => typeof entry === 'boolean');
}

function isModuleCustomData(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  return (
    hasValidOptionalField(value, 'shelves', isBooleanArray) &&
    hasValidOptionalField(value, 'rods', isBooleanArray) &&
    hasValidOptionalField(value, 'storage', entry => typeof entry === 'boolean')
  );
}

function isModuleDimensions(value: unknown, includeManualFlags: boolean): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of ['widthCm', 'heightCm', 'depthCm']) {
    if (!hasValidOptionalField(value, key, isFiniteNumber)) return false;
  }
  if (includeManualFlags) {
    for (const key of ['isManualWidth', 'isManualHeight', 'isManualDepth']) {
      if (!hasValidOptionalField(value, key, entry => typeof entry === 'boolean')) return false;
    }
  }
  return true;
}

function isModuleHexCell(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  return (
    hasValidOptionalField(value, 'enabled', entry => typeof entry === 'boolean') &&
    hasValidOptionalField(value, 'protrusionCm', isFiniteNumber) &&
    hasValidOptionalField(value, 'doorWidthCm', isFiniteNumber)
  );
}

function isStoredModuleConfiguration(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of ['extDrawersCount', 'doors', 'gridDivisions', 'gridDivisionsRow']) {
    if (!hasValidOptionalField(value, key, isFiniteNumber)) return false;
  }
  for (const key of ['hasShoeDrawer', 'isCustom']) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'boolean')) return false;
  }
  return (
    hasValidOptionalField(value, 'layout', entry => typeof entry === 'string') &&
    hasValidOptionalField(value, 'customData', isModuleCustomData) &&
    hasValidOptionalField(value, 'specialDims', entry => isModuleDimensions(entry, true)) &&
    hasValidOptionalField(value, 'savedDims', entry => isModuleDimensions(entry, false)) &&
    hasValidOptionalField(value, 'hexCell', isModuleHexCell)
  );
}

function isStoredModulesConfiguration(value: unknown): boolean {
  return Array.isArray(value) && value.every(isStoredModuleConfiguration);
}

function isStoredCornerConfiguration(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of ['extDrawersCount', 'gridDivisions']) {
    if (!hasValidOptionalField(value, key, isFiniteNumber)) return false;
  }
  for (const key of ['hasShoeDrawer', 'isCustom']) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'boolean')) return false;
  }
  if (
    !hasValidOptionalField(value, 'layout', entry => typeof entry === 'string') ||
    !hasValidOptionalField(value, 'customData', isModuleCustomData) ||
    !hasValidOptionalField(value, 'modulesConfiguration', isStoredModulesConfiguration)
  ) {
    return false;
  }
  if (!hasOwn(value, 'stackSplitLower')) return true;
  const lower = value.stackSplitLower;
  return (
    isRecordValue(lower) &&
    hasValidOptionalField(lower, 'isCustom', entry => typeof entry === 'boolean') &&
    hasValidOptionalField(lower, 'customData', isModuleCustomData) &&
    hasValidOptionalField(lower, 'modulesConfiguration', isStoredModulesConfiguration)
  );
}

function isRecordWithValues(value: unknown, predicate: (entry: unknown) => boolean): boolean {
  return isRecordValue(value) && Object.values(value).every(predicate);
}

function isToggleMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => entry === null || typeof entry === 'boolean');
}

function isNullableStringMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => entry === null || typeof entry === 'string');
}

function isSplitDoorsMap(value: unknown): boolean {
  return isRecordWithValues(
    value,
    entry =>
      entry === null || typeof entry === 'boolean' || (Array.isArray(entry) && entry.every(isFiniteNumber))
  );
}

function isGrooveLinesCountMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => entry === null || isFiniteNumber(entry));
}

function isHingeMap(value: unknown): boolean {
  return isRecordWithValues(
    value,
    entry => entry === null || typeof entry === 'string' || isRecordValue(entry)
  );
}

function isDoorStyleMap(value: unknown): boolean {
  return isRecordWithValues(
    value,
    entry => entry === 'flat' || entry === 'profile' || entry === 'double_profile'
  );
}

function isMirrorLayoutEntry(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of ['widthCm', 'heightCm', 'centerXNorm', 'centerYNorm', 'faceSign']) {
    if (!hasValidOptionalField(value, key, entry => entry === null || isFiniteNumber(entry))) return false;
  }
  return true;
}

function isMirrorLayoutMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => Array.isArray(entry) && entry.every(isMirrorLayoutEntry));
}

function isGrooveLayoutEntry(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of ['widthCm', 'heightCm', 'centerXNorm', 'centerYNorm']) {
    if (!hasValidOptionalField(value, key, entry => entry === null || isFiniteNumber(entry))) return false;
  }
  return hasValidOptionalField(value, 'orientation', entry => entry === 'vertical' || entry === 'horizontal');
}

function isGrooveLayoutMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => Array.isArray(entry) && entry.every(isGrooveLayoutEntry));
}

function isDoorTrimEntry(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  return (
    typeof value.id === 'string' &&
    !!value.id.trim() &&
    (value.axis === 'horizontal' || value.axis === 'vertical') &&
    (value.color === 'nickel' ||
      value.color === 'silver' ||
      value.color === 'gold' ||
      value.color === 'black') &&
    (value.span === 'full' ||
      value.span === 'three_quarters' ||
      value.span === 'half' ||
      value.span === 'third' ||
      value.span === 'quarter' ||
      value.span === 'custom') &&
    isFiniteNumber(value.centerXNorm) &&
    isFiniteNumber(value.centerYNorm) &&
    hasValidOptionalField(value, 'sizeCm', entry => entry === null || isFiniteNumber(entry)) &&
    hasValidOptionalField(value, 'crossSizeCm', entry => entry === null || isFiniteNumber(entry))
  );
}

function isDoorTrimMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => Array.isArray(entry) && entry.every(isDoorTrimEntry));
}

const MODEL_SETTINGS_NUMBER_FIELDS = [
  'width',
  'height',
  'depth',
  'doors',
  'stackSplitLowerHeight',
  'stackSplitLowerWidth',
  'stackSplitLowerDepth',
  'stackSplitLowerDoors',
  'cornerWidth',
  'cornerHeight',
  'cornerDepth',
  'cornerDoors',
  'baseLegPlatformSideOverhangCm',
  'baseLegPlatformFrontOverhangCm',
  'stackSplitDecorativeSeparatorSideOverhangCm',
  'stackSplitDecorativeSeparatorFrontOverhangCm',
  'basePlinthHeightCm',
  'baseLegHeightCm',
  'baseLegWidthCm',
] as const;

const MODEL_SETTINGS_BOOLEAN_FIELDS = [
  'isManualWidth',
  'stackSplitEnabled',
  'stackSplitDecorativeSeparatorEnabled',
  'stackSplitLowerWidthManual',
  'stackSplitLowerDepthManual',
  'stackSplitLowerDoorsManual',
] as const;

const MODEL_SETTINGS_STRING_FIELDS = [
  'baseType',
  'baseLegStyle',
  'baseLegColor',
  'baseLegPlatformMode',
  'baseLegPlatformSideMode',
  'slidingTracksColor',
  'structureSelection',
  'singleDoorPos',
  'doorStyle',
  'corniceType',
  'color',
  'customColor',
] as const;

function isStoredModelSettings(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of MODEL_SETTINGS_NUMBER_FIELDS) {
    if (!hasValidOptionalField(value, key, isFiniteNumber)) return false;
  }
  for (const key of MODEL_SETTINGS_BOOLEAN_FIELDS) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'boolean')) return false;
  }
  for (const key of MODEL_SETTINGS_STRING_FIELDS) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'string')) return false;
  }
  return (
    hasValidOptionalField(value, 'wardrobeType', entry => entry === 'hinged' || entry === 'sliding') &&
    hasValidOptionalField(value, 'boardMaterial', entry => entry === 'sandwich' || entry === 'melamine') &&
    hasValidOptionalField(value, 'doorMountMode', entry => entry === 'overlay' || entry === 'inset') &&
    hasValidOptionalField(
      value,
      'globalHandleType',
      entry => entry === 'standard' || entry === 'edge' || entry === 'none'
    ) &&
    hasValidOptionalField(value, 'cornerSide', entry => entry === 'left' || entry === 'right')
  );
}

const MODEL_TOGGLE_BOOLEAN_FIELDS = [
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

function isStoredModelToggles(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  for (const key of MODEL_TOGGLE_BOOLEAN_FIELDS) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'boolean')) return false;
  }
  for (const key of ['lightAmb', 'lightDir', 'lightX', 'lightY', 'lightZ']) {
    if (!hasValidOptionalField(value, key, entry => typeof entry === 'string' || isFiniteNumber(entry))) {
      return false;
    }
  }
  return true;
}

const MODEL_TOGGLE_MAP_FIELDS = [
  'groovesMap',
  'splitDoorsBottomMap',
  'removedDoorsMap',
  'roundedFrameSideShelvesMap',
  'drawerDividersMap',
] as const;

const MODEL_NULLABLE_STRING_MAP_FIELDS = [
  'individualColors',
  'doorSpecialMap',
  'handlesMap',
  'curtainMap',
] as const;

export function validateSavedModel(value: unknown): value is SavedModelLike {
  if (!isRecordValue(value)) return false;
  if (typeof value.id !== 'string' || !value.id.trim()) return false;
  if (typeof value.name !== 'string' || !value.name.trim()) return false;
  for (const key of ['isPreset', 'isUserPreset', 'isCorePreset', 'fromCorePreset', 'locked']) {
    if (typeof value[key] !== 'undefined' && typeof value[key] !== 'boolean') return false;
  }
  if (
    !hasValidOptionalField(value, 'settings', isStoredModelSettings) ||
    !hasValidOptionalField(value, 'toggles', isStoredModelToggles) ||
    !hasValidOptionalField(value, 'chestSettings', isRecordValue) ||
    !hasValidOptionalField(value, 'modulesConfiguration', isStoredModulesConfiguration) ||
    !hasValidOptionalField(value, 'stackSplitLowerModulesConfiguration', isStoredModulesConfiguration) ||
    !hasValidOptionalField(value, 'cornerConfiguration', isStoredCornerConfiguration) ||
    !hasValidOptionalField(value, 'splitDoorsMap', isSplitDoorsMap) ||
    !hasValidOptionalField(value, 'grooveLinesCountMap', isGrooveLinesCountMap) ||
    !hasValidOptionalField(value, 'hingeMap', isHingeMap) ||
    !hasValidOptionalField(value, 'doorStyleMap', isDoorStyleMap) ||
    !hasValidOptionalField(value, 'grooveLayoutMap', isGrooveLayoutMap) ||
    !hasValidOptionalField(value, 'mirrorLayoutMap', isMirrorLayoutMap) ||
    !hasValidOptionalField(value, 'doorTrimMap', isDoorTrimMap)
  ) {
    return false;
  }
  for (const key of MODEL_TOGGLE_MAP_FIELDS) {
    if (!hasValidOptionalField(value, key, isToggleMap)) return false;
  }
  for (const key of MODEL_NULLABLE_STRING_MAP_FIELDS) {
    if (!hasValidOptionalField(value, key, isNullableStringMap)) return false;
  }
  return (
    hasValidOptionalField(value, 'isLibraryMode', entry => typeof entry === 'boolean') &&
    hasValidOptionalField(value, 'preChestState', entry => entry === null || isRecordValue(entry)) &&
    hasValidOptionalField(value, 'grooveLinesCount', entry => entry === null || isFiniteNumber(entry)) &&
    hasValidOptionalField(value, 'savedNotes', Array.isArray) &&
    hasValidOptionalField(value, 'orderPdfEditorZoom', isFiniteNumber)
  );
}

function readSavedModelRecord(value: unknown): SavedModelRecordLike | null {
  if (!isRecordValue(value)) return null;
  if (typeof value.id !== 'string' || !value.id.trim()) return null;
  if (typeof value.name !== 'string' || !value.name.trim()) return null;
  return value as SavedModelRecordLike;
}

function normalizeSavedModel(value: unknown): SavedModelLike | null {
  const record = readSavedModelRecord(value);
  if (!record) return null;
  const normalized = normalizeModelRecord(record);
  return validateSavedModel(normalized) ? normalized : null;
}

export function readSavedModelRecordList(value: unknown): SavedModelLike[] {
  if (!Array.isArray(value)) return [];
  const out: SavedModelLike[] = [];
  for (const entry of value) {
    const record = readSavedModelRecord(entry);
    if (record) out.push(record as SavedModelLike);
  }
  return out;
}

export function normalizeSavedModelList(value: unknown): SavedModelLike[] {
  if (!Array.isArray(value)) return [];
  const out: SavedModelLike[] = [];
  for (const entry of value) {
    const normalized = normalizeSavedModel(entry);
    if (normalized) out.push(normalized);
  }
  return out;
}

export const savedModelCodec = Object.freeze({
  validate: validateSavedModel,
  normalize: normalizeSavedModel,
  clone(value: SavedModelLike): SavedModelLike {
    return cloneCanonicalFeatureValue(value);
  },
  serialize(value: SavedModelLike): string {
    return serializeCanonicalFeatureValue(value);
  },
  fingerprint(value: SavedModelLike): string {
    return fingerprintCanonicalFeatureValue(value);
  },
});
