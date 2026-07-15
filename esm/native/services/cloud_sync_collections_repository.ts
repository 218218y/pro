import type {
  CloudCollectionsCommitResult,
  CloudCollectionsEnvelope,
  CloudCollectionsInitializationResult,
  CloudCollectionsMutation,
  CloudCollectionsMutationLockLike,
  CloudCollectionsMutator,
  CloudCollectionsReadResult,
  CloudCollectionsRepositoryLike,
  CloudSyncLocalCollections,
  CloudSyncOrderList,
  SavedColorLike,
  SavedModelLike,
} from '../../../types';

import { normalizeList, normalizeModelList, normalizeSavedColorsList } from './cloud_sync_support_shared.js';
import type { StorageLike } from './cloud_sync_support_storage_shared.js';

const CLOUD_COLLECTIONS_SCHEMA_VERSION = 1 as const;
const repositoryCache = new WeakMap<object, Map<string, CloudCollectionsRepository>>();

export class CloudCollectionsMutationLockUnavailableError extends Error {
  constructor(envelopeKey: string) {
    super(`Cloud collections mutation requires cross-tab locking for ${envelopeKey}`);
    this.name = 'CloudCollectionsMutationLockUnavailableError';
  }
}

export function createInProcessCloudCollectionsMutationLock(): CloudCollectionsMutationLockLike {
  const tails = new Map<string, Promise<void>>();
  return {
    isolation: 'process',
    async runExclusive<T>(name: string, operation: () => Promise<T> | T): Promise<T> {
      const previous = tails.get(name) || Promise.resolve();
      let release!: () => void;
      const current = new Promise<void>(resolve => {
        release = resolve;
      });
      tails.set(name, current);
      await previous.catch(() => undefined);
      try {
        return await operation();
      } finally {
        release();
        if (tails.get(name) === current) tails.delete(name);
      }
    },
  };
}

export function createUnavailableCloudCollectionsMutationLock(): CloudCollectionsMutationLockLike {
  return {
    isolation: 'unavailable',
    runExclusive<T>(name: string): Promise<T> {
      return Promise.reject(new CloudCollectionsMutationLockUnavailableError(name));
    },
  };
}

export type CloudCollectionsRepositoryKeys = {
  models: string;
  colors: string;
  colorOrder: string;
  presetOrder: string;
  hiddenPresets: string;
};

export interface CloudCollectionsRepository extends CloudCollectionsRepositoryLike {}

type StoredEnvelopeValue =
  { kind: 'missing' } | { kind: 'value'; value: unknown; raw: string } | { kind: 'corrupt'; raw: string };

export class CloudCollectionsCorruptionError extends Error {
  readonly result: Extract<CloudCollectionsReadResult, { ok: false }>;

  constructor(result: Extract<CloudCollectionsReadResult, { ok: false }>) {
    super(`Cloud collections envelope is corrupt for ${result.corruption.envelopeKey}`);
    this.name = 'CloudCollectionsCorruptionError';
    this.result = result;
  }
}

function readStorageEntry(storage: StorageLike, key: string): StoredEnvelopeValue {
  if (typeof storage.getString === 'function') {
    const raw = storage.getString(key);
    if (typeof raw !== 'string' || !raw) return { kind: 'missing' };
    try {
      return { kind: 'value', value: JSON.parse(raw), raw };
    } catch {
      return { kind: 'corrupt', raw };
    }
  }
  if (typeof storage.getJSON === 'function') {
    const missing = Object.freeze({ __cloudCollectionsMissing: true });
    const value = storage.getJSON(key, missing);
    if (value === missing) return { kind: 'missing' };
    let raw = '';
    try {
      raw = JSON.stringify(value);
    } catch {
      raw = '[unserializable storage value]';
    }
    return { kind: 'value', value, raw };
  }
  return { kind: 'missing' };
}

function readStorageValue(storage: StorageLike, key: string): unknown {
  const entry = readStorageEntry(storage, key);
  return entry.kind === 'value' ? entry.value : null;
}

function writeStorageValue(storage: StorageLike, key: string, value: unknown): void {
  const ok =
    typeof storage.setString === 'function'
      ? storage.setString(key, JSON.stringify(value))
      : typeof storage.setJSON === 'function'
        ? storage.setJSON(key, value)
        : false;
  if (!ok) throw new Error(`Cloud collections atomic commit failed for ${key}`);
}

function normalizeRevision(value: unknown): number {
  const revision = Number(value);
  return Number.isFinite(revision) && revision >= 0 ? Math.floor(revision) : 0;
}

function buildEnvelope(collections: CloudSyncLocalCollections, revision: number): CloudCollectionsEnvelope {
  return {
    schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
    revision: normalizeRevision(revision),
    savedModels: normalizeModelList(collections.m).filter(isStoredModel),
    savedColors: normalizeSavedColorsList(collections.c).filter(isStoredColor),
    colorOrder: normalizeList(collections.o).filter(isStoredOrderEntry),
    presetOrder: normalizeList(collections.p).filter(isStoredOrderEntry),
    hiddenPresets: normalizeList(collections.h).filter(isStoredOrderEntry),
  };
}

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function hasOwn(record: Record<string, unknown>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function hasValidOptionalField(
  record: Record<string, unknown>,
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
    if (!hasValidOptionalField(value, key, entry => entry === null || isFiniteNumber(entry))) {
      return false;
    }
  }
  return true;
}

function isMirrorLayoutMap(value: unknown): boolean {
  return isRecordWithValues(value, entry => Array.isArray(entry) && entry.every(isMirrorLayoutEntry));
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

function isStoredModel(value: unknown): boolean {
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

function isStoredColor(value: unknown): boolean {
  if (!isRecordValue(value)) return false;
  if (typeof value.id !== 'string' || !value.id.trim()) return false;
  if (typeof value.name !== 'undefined' && typeof value.name !== 'string') return false;
  if (typeof value.type !== 'undefined' && typeof value.type !== 'string') return false;
  if (typeof value.value !== 'undefined' && typeof value.value !== 'string') return false;
  if (typeof value.locked !== 'undefined' && typeof value.locked !== 'boolean') return false;
  return true;
}

function isStoredOrderEntry(value: unknown): boolean {
  return value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value));
}

function parseEnvelope(
  value: unknown
): { ok: true; envelope: CloudCollectionsEnvelope } | { ok: false; reason: 'schema' | 'shape' } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ok: false, reason: 'shape' };
  }
  const record = value as Record<string, unknown>;
  if (record.schemaVersion !== CLOUD_COLLECTIONS_SCHEMA_VERSION) {
    return { ok: false, reason: 'schema' };
  }
  if (
    typeof record.revision !== 'number' ||
    !Number.isInteger(record.revision) ||
    record.revision < 0 ||
    !Array.isArray(record.savedModels) ||
    !Array.isArray(record.savedColors) ||
    !Array.isArray(record.colorOrder) ||
    !Array.isArray(record.presetOrder) ||
    !Array.isArray(record.hiddenPresets)
  ) {
    return { ok: false, reason: 'shape' };
  }
  if (
    !record.savedModels.every(isStoredModel) ||
    !record.savedColors.every(isStoredColor) ||
    !record.colorOrder.every(isStoredOrderEntry) ||
    !record.presetOrder.every(isStoredOrderEntry) ||
    !record.hiddenPresets.every(isStoredOrderEntry)
  ) {
    return { ok: false, reason: 'shape' };
  }
  return {
    ok: true,
    envelope: {
      schemaVersion: CLOUD_COLLECTIONS_SCHEMA_VERSION,
      revision: record.revision,
      savedModels: record.savedModels.slice() as SavedModelLike[],
      savedColors: record.savedColors.slice() as SavedColorLike[],
      colorOrder: record.colorOrder.slice() as CloudSyncOrderList,
      presetOrder: record.presetOrder.slice() as CloudSyncOrderList,
      hiddenPresets: record.hiddenPresets.slice() as CloudSyncOrderList,
    },
  };
}

function stableSerialize(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(item => stableSerialize(item)).join(',')}]`;
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map(key => `${JSON.stringify(key)}:${stableSerialize(record[key])}`)
    .join(',')}}`;
}

function sameCollections(current: CloudCollectionsEnvelope, next: CloudSyncLocalCollections): boolean {
  return (
    stableSerialize(current.savedModels) === stableSerialize(next.m) &&
    stableSerialize(current.savedColors) === stableSerialize(next.c) &&
    stableSerialize(current.colorOrder) === stableSerialize(next.o) &&
    stableSerialize(current.presetOrder) === stableSerialize(next.p) &&
    stableSerialize(current.hiddenPresets) === stableSerialize(next.h)
  );
}

function toCollections(envelope: CloudCollectionsEnvelope): CloudSyncLocalCollections {
  return {
    m: envelope.savedModels.slice() as SavedModelLike[],
    c: envelope.savedColors.slice() as SavedColorLike[],
    o: envelope.colorOrder.slice() as CloudSyncOrderList,
    p: envelope.presetOrder.slice() as CloudSyncOrderList,
    h: envelope.hiddenPresets.slice() as CloudSyncOrderList,
  };
}

function applyMutation(
  current: CloudCollectionsEnvelope,
  mutation: CloudCollectionsMutation
): CloudSyncLocalCollections {
  return {
    m: Object.prototype.hasOwnProperty.call(mutation, 'savedModels')
      ? normalizeModelList(mutation.savedModels)
      : current.savedModels,
    c: Object.prototype.hasOwnProperty.call(mutation, 'savedColors')
      ? normalizeSavedColorsList(mutation.savedColors)
      : current.savedColors,
    o: Object.prototype.hasOwnProperty.call(mutation, 'colorOrder')
      ? normalizeList(mutation.colorOrder)
      : current.colorOrder,
    p: Object.prototype.hasOwnProperty.call(mutation, 'presetOrder')
      ? normalizeList(mutation.presetOrder)
      : current.presetOrder,
    h: Object.prototype.hasOwnProperty.call(mutation, 'hiddenPresets')
      ? normalizeList(mutation.hiddenPresets)
      : current.hiddenPresets,
  };
}

function readPerKeyCollections(
  storage: StorageLike,
  keys: CloudCollectionsRepositoryKeys
): CloudSyncLocalCollections {
  return {
    m: normalizeModelList(readStorageValue(storage, keys.models)),
    c: normalizeSavedColorsList(readStorageValue(storage, keys.colors)),
    o: normalizeList(readStorageValue(storage, keys.colorOrder)),
    p: normalizeList(readStorageValue(storage, keys.presetOrder)),
    h: normalizeList(readStorageValue(storage, keys.hiddenPresets)),
  };
}

function perKeyEntries(
  keys: CloudCollectionsRepositoryKeys,
  envelope: CloudCollectionsEnvelope
): Array<[string, unknown]> {
  return [
    [keys.models, envelope.savedModels],
    [keys.colors, envelope.savedColors],
    [keys.colorOrder, envelope.colorOrder],
    [keys.presetOrder, envelope.presetOrder],
    [keys.hiddenPresets, envelope.hiddenPresets],
  ];
}

function repositoryCacheKey(keys: CloudCollectionsRepositoryKeys): string {
  return `${keys.models}:cloudCollections:v1`;
}

function mirrorKeysForMutation(
  keys: CloudCollectionsRepositoryKeys,
  mutation: CloudCollectionsMutation
): Set<string> {
  const out = new Set<string>();
  if (Object.prototype.hasOwnProperty.call(mutation, 'savedModels')) out.add(keys.models);
  if (Object.prototype.hasOwnProperty.call(mutation, 'savedColors')) out.add(keys.colors);
  if (Object.prototype.hasOwnProperty.call(mutation, 'colorOrder')) out.add(keys.colorOrder);
  if (Object.prototype.hasOwnProperty.call(mutation, 'presetOrder')) out.add(keys.presetOrder);
  if (Object.prototype.hasOwnProperty.call(mutation, 'hiddenPresets')) out.add(keys.hiddenPresets);
  return out;
}

export function createCloudCollectionsRepository(args: {
  storage: StorageLike;
  keys: CloudCollectionsRepositoryKeys;
  mutationLock?: CloudCollectionsMutationLockLike;
  reportObserverFailure?: (error: unknown, observerIndex: number) => void;
}): CloudCollectionsRepository {
  const { storage, keys, reportObserverFailure } = args;
  const envelopeKey = repositoryCacheKey(keys);
  const storageObject = storage as object;
  const cached = repositoryCache.get(storageObject)?.get(envelopeKey);
  if (cached) {
    if (args.mutationLock && cached.mutationIsolation !== args.mutationLock.isolation) {
      throw new Error(
        `Cloud collections repository lock isolation is already ${cached.mutationIsolation} for ${envelopeKey}`
      );
    }
    return cached;
  }

  const listeners = new Set<(envelope: CloudCollectionsEnvelope) => void>();
  const pendingMirrorKeys = new Set<string>();
  const rawBackupKey = `${envelopeKey}:corrupt-backup`;
  const mutationLock = args.mutationLock || createInProcessCloudCollectionsMutationLock();
  const mutationLockName = `wardrobe-pro:${envelopeKey}:mutation`;

  const readStoredEnvelopeResult = (): CloudCollectionsReadResult | null => {
    const entry = readStorageEntry(storage, envelopeKey);
    if (entry.kind === 'missing') return null;
    const parsed = entry.kind === 'value' ? parseEnvelope(entry.value) : null;
    if (parsed?.ok) return { ok: true, envelope: parsed.envelope };
    let reason: 'json' | 'schema' | 'shape' = 'shape';
    if (entry.kind === 'corrupt') reason = 'json';
    else if (parsed && 'reason' in parsed) reason = parsed.reason;
    return {
      ok: false,
      corruption: {
        kind: 'corrupt',
        reason,
        envelopeKey,
        rawBackupKey,
        raw: entry.raw,
        repairAvailable: true,
      },
    };
  };

  const readEnvelopeSnapshot = (): CloudCollectionsEnvelope => {
    const stored = readStoredEnvelopeResult();
    if (stored?.ok === false) throw new CloudCollectionsCorruptionError(stored);
    if (stored?.ok === true) return stored.envelope;
    return buildEnvelope(readPerKeyCollections(storage, keys), 0);
  };

  const mirrorEnvelope = (envelope: CloudCollectionsEnvelope, onlyKeys?: ReadonlySet<string>): string[] => {
    const failures: string[] = [];
    for (const [key, value] of perKeyEntries(keys, envelope)) {
      if (onlyKeys && !onlyKeys.has(key)) continue;
      try {
        writeStorageValue(storage, key, value);
        pendingMirrorKeys.delete(key);
      } catch {
        pendingMirrorKeys.add(key);
        failures.push(key);
      }
    }
    return failures;
  };

  const notifyCommitted = (envelope: CloudCollectionsEnvelope): CloudCollectionsCommitResult['warnings'] => {
    const warnings: CloudCollectionsCommitResult['warnings'] = [];
    const committedListeners = Array.from(listeners);
    for (let observerIndex = 0; observerIndex < committedListeners.length; observerIndex += 1) {
      try {
        committedListeners[observerIndex]?.(envelope);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        warnings.push({ kind: 'observer_failure', observerIndex, message });
        try {
          reportObserverFailure?.(error, observerIndex);
        } catch {
          // Reporting is an observer too; it cannot invalidate a durable collections commit.
        }
      }
    }
    return warnings;
  };

  const reconcileMirrorsWithinLock = (envelope: CloudCollectionsEnvelope): string[] => {
    const keysToRepair = new Set(pendingMirrorKeys);
    for (const [key, value] of perKeyEntries(keys, envelope)) {
      const stored = readStorageEntry(storage, key);
      if (stored.kind !== 'value' || stableSerialize(stored.value) !== stableSerialize(value)) {
        keysToRepair.add(key);
      }
    }
    return keysToRepair.size ? mirrorEnvelope(envelope, keysToRepair) : [];
  };

  const ensureInitializedWithinLock = (): CloudCollectionsInitializationResult => {
    const stored = readStoredEnvelopeResult();
    if (stored?.ok === false) throw new CloudCollectionsCorruptionError(stored);
    if (stored?.ok === true) {
      return { initialized: false, envelope: stored.envelope, mirrorFailures: [] };
    }
    const migrated = buildEnvelope(readPerKeyCollections(storage, keys), 0);
    writeStorageValue(storage, envelopeKey, migrated);
    return {
      initialized: true,
      envelope: migrated,
      mirrorFailures: mirrorEnvelope(migrated),
    };
  };

  const commitEnvelope = (
    envelope: CloudCollectionsEnvelope,
    mirrorKeys?: ReadonlySet<string>
  ): CloudCollectionsCommitResult => {
    writeStorageValue(storage, envelopeKey, envelope);
    const mirrorFailures = mirrorEnvelope(envelope, mirrorKeys);
    const warnings = notifyCommitted(envelope);
    return { committed: true, envelope, mirrorFailures, warnings };
  };

  const noChangeResult = (envelope: CloudCollectionsEnvelope): CloudCollectionsCommitResult => ({
    committed: false,
    reason: 'no-change',
    envelope,
    mirrorFailures: [],
    warnings: [],
  });

  const repository: CloudCollectionsRepository = {
    envelopeKey,
    mutationIsolation: mutationLock.isolation,
    read: (): CloudSyncLocalCollections => toCollections(repository.readEnvelope()),
    readEnvelope(): CloudCollectionsEnvelope {
      return readEnvelopeSnapshot();
    },
    readResult(): CloudCollectionsReadResult {
      const stored = readStoredEnvelopeResult();
      if (stored) return stored;
      try {
        return { ok: true, envelope: readEnvelopeSnapshot() };
      } catch (error) {
        if (error instanceof CloudCollectionsCorruptionError) return error.result;
        throw error;
      }
    },
    ensureInitialized(): Promise<CloudCollectionsInitializationResult> {
      return mutationLock.runExclusive(mutationLockName, () => ensureInitializedWithinLock());
    },
    reconcileMirrors(): Promise<string[]> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const initialized = ensureInitializedWithinLock();
        const repaired = reconcileMirrorsWithinLock(initialized.envelope);
        return [...new Set([...initialized.mirrorFailures, ...repaired])];
      });
    },
    transact(mutator: CloudCollectionsMutator): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        const mutation = mutator(buildEnvelope(toCollections(current), current.revision));
        const next = applyMutation(current, mutation);
        if (sameCollections(current, next)) return noChangeResult(current);
        return commitEnvelope(
          buildEnvelope(next, current.revision + 1),
          mirrorKeysForMutation(keys, mutation)
        );
      });
    },
    commit(next: CloudSyncLocalCollections): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        const normalized = toCollections(buildEnvelope(next, current.revision));
        if (sameCollections(current, normalized)) return noChangeResult(current);
        return commitEnvelope(buildEnvelope(next, current.revision + 1));
      });
    },
    commitIfRevision(
      expectedRevision: number,
      next: CloudSyncLocalCollections
    ): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const current = ensureInitializedWithinLock().envelope;
        if (current.revision !== normalizeRevision(expectedRevision)) {
          return {
            committed: false,
            reason: 'revision-mismatch',
            envelope: current,
            mirrorFailures: [],
            warnings: [],
          };
        }
        const normalized = toCollections(buildEnvelope(next, current.revision));
        if (sameCollections(current, normalized)) return noChangeResult(current);
        return commitEnvelope(buildEnvelope(next, current.revision + 1));
      });
    },
    backupCorruptEnvelope(): string {
      const stored = readStoredEnvelopeResult();
      if (stored?.ok !== false) {
        throw new Error(`Cloud collections envelope is not corrupt for ${envelopeKey}`);
      }
      writeStorageValue(storage, rawBackupKey, {
        raw: stored.corruption.raw,
        reason: stored.corruption.reason,
        capturedAt: Date.now(),
      });
      return rawBackupKey;
    },
    resetCorruptEnvelope(next: CloudSyncLocalCollections): Promise<CloudCollectionsCommitResult> {
      return mutationLock.runExclusive(mutationLockName, () => {
        const stored = readStoredEnvelopeResult();
        if (stored?.ok !== false) {
          throw new Error(
            `Cloud collections corruption reset requires a corrupt envelope for ${envelopeKey}`
          );
        }
        return commitEnvelope(buildEnvelope(next, 0));
      });
    },
    subscribe(listener: (envelope: CloudCollectionsEnvelope) => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const byKey = repositoryCache.get(storageObject) || new Map<string, CloudCollectionsRepository>();
  byKey.set(envelopeKey, repository);
  repositoryCache.set(storageObject, byKey);
  return repository;
}
