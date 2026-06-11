import type { ActionMetaLike, AppContainer } from '../../../types';
import { getCfg } from './store_access.js';
import {
  assertApp,
  getModelsServiceMaybe,
  getStorageKey,
  getStorageServiceMaybe,
  metaMerge,
  metaRestore,
  normalizeUnknownError,
  readSavedColors,
  reportError,
} from '../services/api.js';
import {
  cloneJsonArray,
  normalizeSettingsBackupId,
  readCanonicalSavedColorOrder,
  readSavedColorList,
  readSavedModelList,
  readSettingsBackupIdList,
  resolveColorSwatchesOrder,
  sanitizeSettingsBackupCollectionIds,
  type SettingsBackupData,
  type SettingsBackupIdList,
  type SettingsStorageKeys,
  type SettingsStorageServiceLike,
  isRecord,
  SettingsBackupActionError,
} from './settings_backup_shared.js';

function isSettingsStorageService(value: unknown): value is SettingsStorageServiceLike {
  return isRecord(value);
}

export function requireSettingsBackupApp(app: unknown): AppContainer {
  return assertApp(app, 'ui/settings_backup');
}

export function getSettingsStorage(App: AppContainer): SettingsStorageServiceLike | null {
  const storage = getStorageServiceMaybe(App);
  return isSettingsStorageService(storage) ? storage : null;
}

export function buildSettingsStorageKeys(App: AppContainer): SettingsStorageKeys {
  const models = getStorageKey(App, 'SAVED_MODELS', 'wardrobeSavedModels');
  const colors = getStorageKey(App, 'SAVED_COLORS', 'wardrobeSavedColors');
  return {
    models,
    presetOrder: `${models}:presetOrder`,
    hiddenPresets: `${models}:hiddenPresets`,
    colors,
    colorSwatchesOrder: `${colors}:order`,
  };
}

export function settingsBackupReport(
  App: AppContainer | null | undefined,
  op: string,
  error: unknown,
  nonFatal = false
): void {
  try {
    reportError(App, error, { where: 'ui/settings_backup', op, fatal: false, nonFatal });
  } catch {
    // ignore reporting failures
  }
}

export function buildRestoreMeta(
  App: AppContainer,
  meta: ActionMetaLike | null,
  source: string
): ActionMetaLike {
  const restored = metaRestore(App, meta || {}, source);
  return metaMerge(App, restored, undefined, source);
}

export function readStorageArray(storage: SettingsStorageServiceLike | null, key: string): unknown[] {
  try {
    if (storage && typeof storage.getJSON === 'function') {
      const value = storage.getJSON(key, []);
      return Array.isArray(value) ? value : [];
    }
    if (storage && typeof storage.getString === 'function') {
      const value = storage.getString(key);
      if (!value) return [];
      const parsed = JSON.parse(String(value));
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch {
    // ignore secondary export-read failures
  }
  return [];
}

export function writeStorageArray(
  storage: SettingsStorageServiceLike | null,
  key: string,
  value: unknown
): boolean {
  const arr = Array.isArray(value) ? value : [];
  if (!storage) return false;
  if (typeof storage.setJSON === 'function') {
    storage.setJSON(key, arr);
    return true;
  }
  if (typeof storage.setString === 'function') {
    storage.setString(key, JSON.stringify(arr));
    return true;
  }
  return false;
}

function readAvailablePresetIds(App: AppContainer): Set<string> | null {
  const modelsService = getModelsServiceMaybe(App);
  if (!modelsService || typeof modelsService.getAll !== 'function') return null;
  try {
    const allModels = modelsService.getAll();
    const presetIds = new Set<string>();
    for (let i = 0; i < allModels.length; i += 1) {
      const model = allModels[i];
      if (!model || !model.isPreset) continue;
      const id = normalizeSettingsBackupId(model.id);
      if (id) presetIds.add(id);
    }
    return presetIds.size > 0 ? presetIds : null;
  } catch (error) {
    settingsBackupReport(App, 'presetCollections:readAvailablePresetIds', error, true);
    return null;
  }
}

export function sanitizePresetCollections(
  App: AppContainer,
  presetOrder: unknown,
  hiddenPresets: unknown
): { presetOrder: SettingsBackupIdList; hiddenPresets: SettingsBackupIdList } {
  const availablePresetIds = readAvailablePresetIds(App);
  return {
    presetOrder: sanitizeSettingsBackupCollectionIds(presetOrder, availablePresetIds),
    hiddenPresets: sanitizeSettingsBackupCollectionIds(hiddenPresets, availablePresetIds),
  };
}

function readCurrentExportColorSwatchesOrder(
  cfg: Record<string, unknown> | null,
  storage: SettingsStorageServiceLike | null,
  keys: SettingsStorageKeys,
  savedColors: unknown
): SettingsBackupIdList {
  const liveOrder = readSettingsBackupIdList(
    cfg && Array.isArray(cfg.colorSwatchesOrder) ? cfg.colorSwatchesOrder : []
  );
  const storageOrder = readSettingsBackupIdList(readStorageArray(storage, keys.colorSwatchesOrder));
  const canonicalSavedColorOrder = readCanonicalSavedColorOrder(savedColors);
  return resolveColorSwatchesOrder(savedColors, liveOrder, storageOrder, canonicalSavedColorOrder);
}

function readExportedModelsForBackup(App: AppContainer): unknown[] {
  const modelsService = getModelsServiceMaybe(App);
  if (!modelsService || typeof modelsService.exportUserModels !== 'function') return [];

  try {
    const exportedModels = modelsService.exportUserModels();
    return Array.isArray(exportedModels) ? cloneJsonArray(exportedModels) : [];
  } catch (error) {
    throw new SettingsBackupActionError(
      'error',
      normalizeUnknownError(error, '[WardrobePro] Settings backup model export failed.').message
    );
  }
}

export function buildExportBackupData(App: AppContainer): SettingsBackupData {
  const storage = getSettingsStorage(App);
  const keys = buildSettingsStorageKeys(App);
  const exportedModels = readExportedModelsForBackup(App);
  const modelsToSave =
    exportedModels.length > 0 ? cloneJsonArray(exportedModels) : readStorageArray(storage, keys.models);

  const cfg = getCfg(App) || null;
  const savedColorsFromStore =
    readSavedColors(App) ?? (cfg && Array.isArray(cfg.savedColors) ? cfg.savedColors : []);
  const colorsToSave =
    Array.isArray(savedColorsFromStore) && savedColorsFromStore.length > 0
      ? savedColorsFromStore
      : readStorageArray(storage, keys.colors);
  const savedModels = readSavedModelList(modelsToSave);
  const savedColors = readSavedColorList(colorsToSave);
  const presetCollections = sanitizePresetCollections(
    App,
    readStorageArray(storage, keys.presetOrder),
    readStorageArray(storage, keys.hiddenPresets)
  );

  return {
    type: 'system_backup',
    timestamp: Date.now(),
    presetOrder: presetCollections.presetOrder,
    hiddenPresets: presetCollections.hiddenPresets,
    savedModels,
    savedColors,
    colorSwatchesOrder: readCurrentExportColorSwatchesOrder(cfg, storage, keys, savedColors),
  };
}
