import type { AppContainer, ModelsMergeResult, SavedModelLike, UnknownRecord } from '../../../types';
import { getCfg } from './store_access.js';
import {
  ensureModelsLoadedViaServiceOrThrow,
  mergeImportedModelsViaServiceOrThrow,
  normalizeUnknownError,
  patchViaActions,
  readFileTextResultViaBrowser,
  readSavedColors,
  renderModelUiViaActionsOrThrow,
  setCfgColorSwatchesOrder,
  setCfgSavedColors,
  writeColorSwatchesOrder,
  writeSavedColors,
} from '../services/api.js';
import {
  asArray,
  mergeSavedColorLists,
  parseSettingsBackup,
  type ParseSettingsBackupResult,
  type ReadBackupFileTextResult,
  readCanonicalSavedColorOrder,
  readSettingsBackupIdList,
  type SettingsBackupData,
  type SettingsBackupSavedColorEntry,
  resolveColorSwatchesOrder,
  SettingsBackupActionError,
  sameSettingsBackupIdList,
} from './settings_backup_shared.js';
import {
  buildRestoreMeta,
  buildSettingsStorageKeys,
  getSettingsStorage,
  readStorageArray,
  sanitizePresetCollections,
  settingsBackupReport,
  writeStorageArray,
} from './settings_backup_support.js';

async function readBackupFileText(file: File): Promise<string> {
  const result = await readFileTextResultViaBrowser(file, {
    unavailableMessage: '[WardrobePro] Failed reading settings backup file.',
    readFailureMessage: '[WardrobePro] Failed reading settings backup file.',
  });
  if (result.ok === false) {
    throw new Error(result.message || '[WardrobePro] Failed reading settings backup file.');
  }
  return result.value;
}

export async function readBackupFileTextSafe(file: File): Promise<ReadBackupFileTextResult> {
  try {
    const text = await readBackupFileText(file);
    return { ok: true, text };
  } catch (error) {
    const message = normalizeUnknownError(
      error,
      '[WardrobePro] Failed reading settings backup file.'
    ).message;
    return { ok: false, reason: 'read-failed', message };
  }
}

export function parseSettingsBackupSafe(text: string): ParseSettingsBackupResult {
  try {
    const data = parseSettingsBackup(text);
    return data ? { ok: true, data } : { ok: false, reason: 'invalid-backup' };
  } catch (error) {
    return {
      ok: false,
      reason: 'invalid-json',
      message: normalizeUnknownError(error, '[WardrobePro] Settings backup JSON parse failed.').message,
    };
  }
}

function readCurrentSavedColors(App: AppContainer): unknown[] {
  const savedColors =
    readSavedColors(App) ??
    (() => {
      const cfg = getCfg(App) || {};
      return Array.isArray(cfg.savedColors) ? cfg.savedColors : [];
    })();
  return asArray(savedColors);
}

type ImportedColorMutation = {
  savedColors?: SettingsBackupSavedColorEntry[];
  colorSwatchesOrder?: string[];
};

function cloneImportedSavedColors(
  value: SettingsBackupSavedColorEntry[] | undefined
): SettingsBackupSavedColorEntry[] | undefined {
  return Array.isArray(value) ? value.slice() : undefined;
}

function cloneImportedColorOrder(value: string[] | undefined): string[] | undefined {
  return Array.isArray(value) ? value.map(entry => String(entry || '')) : undefined;
}

function buildImportedColorConfigPatch(mutation: ImportedColorMutation): UnknownRecord {
  const configPatch: UnknownRecord = {};
  if (typeof mutation.savedColors !== 'undefined') {
    configPatch.savedColors = cloneImportedSavedColors(mutation.savedColors) || [];
  }
  if (typeof mutation.colorSwatchesOrder !== 'undefined') {
    configPatch.colorSwatchesOrder = cloneImportedColorOrder(mutation.colorSwatchesOrder) || [];
  }
  return Object.keys(configPatch).length ? { config: configPatch } : {};
}

function writeImportedColorStorage(
  App: AppContainer,
  op: string,
  storage: ReturnType<typeof getSettingsStorage>,
  key: string,
  value: unknown[]
): void {
  if (writeStorageArray(storage, key, value)) return;
  settingsBackupReport(App, op, new Error(`${op} storage write unavailable`), true);
}

function applyImportedColorMutation(
  App: AppContainer,
  storage: ReturnType<typeof getSettingsStorage>,
  keys: ReturnType<typeof buildSettingsStorageKeys>,
  mutation: ImportedColorMutation,
  metaSource: string
): void {
  const patch = buildImportedColorConfigPatch(mutation);
  if (!Object.keys(patch).length) return;

  const meta = buildRestoreMeta(App, { immediate: true }, metaSource);
  const savedColors = cloneImportedSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneImportedColorOrder(mutation.colorSwatchesOrder);

  if (typeof patchViaActions === 'function' && patchViaActions(App, patch, meta)) {
    if (typeof savedColors !== 'undefined') {
      writeImportedColorStorage(App, `${metaSource}:savedColors`, storage, keys.colors, savedColors);
    }
    if (typeof colorSwatchesOrder !== 'undefined') {
      writeImportedColorStorage(
        App,
        `${metaSource}:colorSwatchesOrder`,
        storage,
        keys.colorSwatchesOrder,
        colorSwatchesOrder
      );
    }
    return;
  }

  const mapsMeta = { ...meta, noStorageWrite: true };

  if (typeof savedColors !== 'undefined') {
    const appliedViaMaps = writeSavedColors(App, savedColors, mapsMeta);
    if (!appliedViaMaps) setCfgSavedColors(App, savedColors, meta);
    writeImportedColorStorage(App, `${metaSource}:savedColors`, storage, keys.colors, savedColors);
  }

  if (typeof colorSwatchesOrder !== 'undefined') {
    const appliedViaMaps = writeColorSwatchesOrder(App, colorSwatchesOrder.slice(), mapsMeta);
    if (!appliedViaMaps) setCfgColorSwatchesOrder(App, colorSwatchesOrder.slice(), meta);
    writeImportedColorStorage(
      App,
      `${metaSource}:colorSwatchesOrder`,
      storage,
      keys.colorSwatchesOrder,
      colorSwatchesOrder
    );
  }
}

export function mergeImportedSavedColors(App: AppContainer, value: SettingsBackupSavedColorEntry[]): number {
  if (!Array.isArray(value) || value.length <= 0) return 0;

  const currentSaved = readCurrentSavedColors(App);
  const merged = mergeSavedColorLists(currentSaved, value);
  if (!merged.changed) return 0;

  const storage = getSettingsStorage(App);
  const keys = buildSettingsStorageKeys(App);
  applyImportedColorMutation(App, storage, keys, { savedColors: merged.list }, 'savedColors.import');

  return merged.added;
}

function writeStorageIdListIfChanged(
  App: AppContainer,
  op: string,
  storage: ReturnType<typeof getSettingsStorage>,
  key: string,
  currentValue: unknown,
  nextValue: string[]
): void {
  if (sameSettingsBackupIdList(currentValue, nextValue)) return;
  if (writeStorageArray(storage, key, nextValue)) return;
  settingsBackupReport(App, op, new Error(`${op} storage write unavailable`), true);
}

function readCurrentColorSwatchesOrder(
  App: AppContainer,
  storage: ReturnType<typeof getSettingsStorage>,
  keys: ReturnType<typeof buildSettingsStorageKeys>
): string[] {
  const cfg = getCfg(App) || {};
  if (Array.isArray(cfg.colorSwatchesOrder)) {
    return readSettingsBackupIdList(cfg.colorSwatchesOrder);
  }
  return readSettingsBackupIdList(readStorageArray(storage, keys.colorSwatchesOrder));
}

export function applyImportedStorageSettings(App: AppContainer, data: SettingsBackupData): void {
  const storage = getSettingsStorage(App);
  const keys = buildSettingsStorageKeys(App);
  const currentPresetOrder = readStorageArray(storage, keys.presetOrder);
  const currentHiddenPresets = readStorageArray(storage, keys.hiddenPresets);
  const currentStorageColorOrder = readStorageArray(storage, keys.colorSwatchesOrder);
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  const currentSavedColors = readCurrentSavedColors(App);
  const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, storage, keys);
  const currentStorageOrderIds = readSettingsBackupIdList(currentStorageColorOrder);
  const canonicalSavedColorOrder = readCanonicalSavedColorOrder(currentSavedColors);
  const colorSwatchesOrder = resolveColorSwatchesOrder(
    currentSavedColors,
    data.colorSwatchesOrder,
    currentLiveColorOrder,
    currentStorageOrderIds,
    canonicalSavedColorOrder
  );

  writeStorageIdListIfChanged(
    App,
    'import:presetOrder',
    storage,
    keys.presetOrder,
    currentPresetOrder,
    presetOrder
  );
  writeStorageIdListIfChanged(
    App,
    'import:hiddenPresets',
    storage,
    keys.hiddenPresets,
    currentHiddenPresets,
    hiddenPresets
  );
  const colorOrderStorageChanged = !sameSettingsBackupIdList(currentStorageColorOrder, colorSwatchesOrder);
  const colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
  if (!colorOrderStorageChanged && !colorOrderLiveChanged) return;

  applyImportedColorMutation(App, storage, keys, { colorSwatchesOrder }, 'colorSwatchesOrder.import');
}

export function applyImportedColorSettings(App: AppContainer, data: SettingsBackupData): number {
  const storage = getSettingsStorage(App);
  const keys = buildSettingsStorageKeys(App);
  const currentPresetOrder = readStorageArray(storage, keys.presetOrder);
  const currentHiddenPresets = readStorageArray(storage, keys.hiddenPresets);
  const currentStorageColorOrder = readStorageArray(storage, keys.colorSwatchesOrder);
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  const currentSavedColors = readCurrentSavedColors(App);
  const merged = mergeSavedColorLists(currentSavedColors, data.savedColors);
  const savedColorsForOrder = merged.changed ? merged.list : currentSavedColors;
  const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, storage, keys);
  const currentStorageOrderIds = readSettingsBackupIdList(currentStorageColorOrder);
  const canonicalSavedColorOrder = readCanonicalSavedColorOrder(savedColorsForOrder);
  const colorSwatchesOrder = resolveColorSwatchesOrder(
    savedColorsForOrder,
    data.colorSwatchesOrder,
    currentLiveColorOrder,
    currentStorageOrderIds,
    canonicalSavedColorOrder
  );

  writeStorageIdListIfChanged(
    App,
    'import:presetOrder',
    storage,
    keys.presetOrder,
    currentPresetOrder,
    presetOrder
  );
  writeStorageIdListIfChanged(
    App,
    'import:hiddenPresets',
    storage,
    keys.hiddenPresets,
    currentHiddenPresets,
    hiddenPresets
  );

  const colorOrderStorageChanged = !sameSettingsBackupIdList(currentStorageColorOrder, colorSwatchesOrder);
  const colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
  const mutation: ImportedColorMutation = {};
  if (merged.changed) mutation.savedColors = merged.list;
  if (colorOrderStorageChanged || colorOrderLiveChanged) mutation.colorSwatchesOrder = colorSwatchesOrder;
  applyImportedColorMutation(App, storage, keys, mutation, 'settingsColors.import');
  return merged.added;
}

export function mergeImportedModelsStrict(App: AppContainer, list: SavedModelLike[]): ModelsMergeResult {
  try {
    return mergeImportedModelsViaServiceOrThrow(App, list, 'settings backup import models merge');
  } catch (error) {
    throw new SettingsBackupActionError(
      'models-unavailable',
      normalizeUnknownError(error, '[WardrobePro] Settings backup model merge failed.').message
    );
  }
}

export function finalizeImportedModels(App: AppContainer, result: ModelsMergeResult): void {
  const added = Number.isFinite(Number(result.added)) ? Number(result.added) : 0;
  const updated = Number.isFinite(Number(result.updated)) ? Number(result.updated) : 0;
  if (added + updated <= 0) return;

  try {
    renderModelUiViaActionsOrThrow(App, 'settings backup import models render');
    ensureModelsLoadedViaServiceOrThrow(
      App,
      { forceRebuild: true, silent: false },
      'settings backup import models ensureLoaded'
    );
  } catch (error) {
    throw new SettingsBackupActionError(
      'models-unavailable',
      normalizeUnknownError(error, '[WardrobePro] Settings backup model refresh failed.').message
    );
  }
}
