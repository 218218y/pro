import type {
  AppContainer,
  ModelsMergeResult,
  SavedColorLike,
  SavedModelLike,
  UnknownRecord,
} from '../../../types';
import { getCfg } from './store_access.js';
import {
  ensureModelsLoadedViaServiceOrThrow,
  mergeImportedModelsViaServiceOrThrow,
  normalizeUnknownError,
  patchViaActions,
  readCloudCollectionsEnvelopeViaServiceOrThrow,
  readFileTextResultViaBrowser,
  readSavedColors,
  runPerfAction,
  renderModelUiViaActionsOrThrow,
  setCfgColorSwatchesOrder,
  setCfgSavedColors,
  updateCloudCollectionsViaServiceOrThrow,
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
  sanitizePresetCollections,
  settingsBackupReport,
} from './settings_backup_support.js';

async function readBackupFileText(App: AppContainer, file: File): Promise<string> {
  const result = await readFileTextResultViaBrowser(file, {
    app: App,
    unavailableMessage: '[WardrobePro] Failed reading settings backup file.',
    readFailureMessage: '[WardrobePro] Failed reading settings backup file.',
  });
  if (result.ok === false) {
    throw new Error(result.message || '[WardrobePro] Failed reading settings backup file.');
  }
  return result.value;
}

export async function readBackupFileTextSafe(
  App: AppContainer,
  file: File
): Promise<ReadBackupFileTextResult> {
  try {
    const text = await readBackupFileText(App, file);
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

function toCanonicalSavedColors(value: SettingsBackupSavedColorEntry[] | undefined): SavedColorLike[] {
  if (!Array.isArray(value)) return [];
  return value.map(entry =>
    typeof entry === 'string' ? { id: entry } : { ...entry, id: String(entry.id || '').trim() }
  );
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

function runSettingsBackupImportPerfStep<T>(App: AppContainer, metricName: string, run: () => T): T {
  return typeof runPerfAction === 'function' ? runPerfAction(App, metricName, run) : run();
}

function applyImportedColorMutation(
  App: AppContainer,
  mutation: ImportedColorMutation,
  metaSource: string,
  persist = true
): void {
  const patch = buildImportedColorConfigPatch(mutation);
  if (!Object.keys(patch).length) return;

  const meta = buildRestoreMeta(App, { immediate: true }, metaSource);
  const savedColors = cloneImportedSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneImportedColorOrder(mutation.colorSwatchesOrder);

  if (persist) {
    runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
      updateCloudCollectionsViaServiceOrThrow(
        App,
        {
          ...(typeof savedColors !== 'undefined' ? { savedColors: toCanonicalSavedColors(savedColors) } : {}),
          ...(typeof colorSwatchesOrder !== 'undefined' ? { colorOrder: colorSwatchesOrder } : {}),
        },
        `${metaSource} collections persistence`
      )
    );
  }

  if (typeof patchViaActions === 'function' && patchViaActions(App, patch, meta)) {
    return;
  }

  const mapsMeta = { ...meta, noStorageWrite: true };

  if (typeof savedColors !== 'undefined') {
    const appliedViaMaps = writeSavedColors(App, savedColors, mapsMeta);
    if (!appliedViaMaps) setCfgSavedColors(App, savedColors, meta);
  }

  if (typeof colorSwatchesOrder !== 'undefined') {
    const appliedViaMaps = writeColorSwatchesOrder(App, colorSwatchesOrder.slice(), mapsMeta);
    if (!appliedViaMaps) setCfgColorSwatchesOrder(App, colorSwatchesOrder.slice(), meta);
  }
}

export function mergeImportedSavedColors(App: AppContainer, value: SettingsBackupSavedColorEntry[]): number {
  if (!Array.isArray(value) || value.length <= 0) return 0;

  const currentSaved = readCurrentSavedColors(App);
  const merged = mergeSavedColorLists(currentSaved, value);
  if (!merged.changed) return 0;

  applyImportedColorMutation(App, { savedColors: merged.list }, 'savedColors.import');

  return merged.added;
}

function readCurrentColorSwatchesOrder(App: AppContainer, storedOrder: unknown): string[] {
  const cfg = getCfg(App) || {};
  if (Array.isArray(cfg.colorSwatchesOrder)) {
    return readSettingsBackupIdList(cfg.colorSwatchesOrder);
  }
  return readSettingsBackupIdList(storedOrder);
}

export function applyImportedStorageSettings(App: AppContainer, data: SettingsBackupData): void {
  const current = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'settings storage import');
  const currentPresetOrder = current.presetOrder;
  const currentHiddenPresets = current.hiddenPresets;
  const currentStorageColorOrder = current.colorOrder;
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  const currentSavedColors = readCurrentSavedColors(App);
  const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, currentStorageColorOrder);
  const currentStorageOrderIds = readSettingsBackupIdList(currentStorageColorOrder);
  const canonicalSavedColorOrder = readCanonicalSavedColorOrder(currentSavedColors);
  const colorSwatchesOrder = resolveColorSwatchesOrder(
    currentSavedColors,
    data.colorSwatchesOrder,
    currentLiveColorOrder,
    currentStorageOrderIds,
    canonicalSavedColorOrder
  );

  const presetOrderChanged = !sameSettingsBackupIdList(currentPresetOrder, presetOrder);
  const hiddenPresetsChanged = !sameSettingsBackupIdList(currentHiddenPresets, hiddenPresets);
  const colorOrderStorageChanged = !sameSettingsBackupIdList(currentStorageColorOrder, colorSwatchesOrder);
  const colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
  if (presetOrderChanged || hiddenPresetsChanged || colorOrderStorageChanged) {
    runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
      updateCloudCollectionsViaServiceOrThrow(
        App,
        {
          ...(presetOrderChanged ? { presetOrder } : {}),
          ...(hiddenPresetsChanged ? { hiddenPresets } : {}),
          ...(colorOrderStorageChanged ? { colorOrder: colorSwatchesOrder } : {}),
        },
        'settings storage import persistence'
      )
    );
  }
  if (!colorOrderLiveChanged) return;

  applyImportedColorMutation(App, { colorSwatchesOrder }, 'colorSwatchesOrder.import', false);
}

export function applyImportedColorSettings(App: AppContainer, data: SettingsBackupData): number {
  const current = readCloudCollectionsEnvelopeViaServiceOrThrow(App, 'settings color import');
  const currentPresetOrder = current.presetOrder;
  const currentHiddenPresets = current.hiddenPresets;
  const currentStorageColorOrder = current.colorOrder;
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  const currentSavedColors = readCurrentSavedColors(App);
  const merged = mergeSavedColorLists(currentSavedColors, data.savedColors);
  const savedColorsForOrder = merged.changed ? merged.list : currentSavedColors;
  const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, currentStorageColorOrder);
  const currentStorageOrderIds = readSettingsBackupIdList(currentStorageColorOrder);
  const canonicalSavedColorOrder = readCanonicalSavedColorOrder(savedColorsForOrder);
  const colorSwatchesOrder = resolveColorSwatchesOrder(
    savedColorsForOrder,
    data.colorSwatchesOrder,
    currentLiveColorOrder,
    currentStorageOrderIds,
    canonicalSavedColorOrder
  );

  const presetOrderChanged = !sameSettingsBackupIdList(currentPresetOrder, presetOrder);
  const hiddenPresetsChanged = !sameSettingsBackupIdList(currentHiddenPresets, hiddenPresets);
  const colorOrderStorageChanged = !sameSettingsBackupIdList(currentStorageColorOrder, colorSwatchesOrder);
  const colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
  const mutation: ImportedColorMutation = {};
  if (merged.changed) mutation.savedColors = merged.list;
  if (colorOrderStorageChanged || colorOrderLiveChanged) mutation.colorSwatchesOrder = colorSwatchesOrder;
  if (presetOrderChanged || hiddenPresetsChanged || merged.changed || colorOrderStorageChanged) {
    runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
      updateCloudCollectionsViaServiceOrThrow(
        App,
        {
          ...(presetOrderChanged ? { presetOrder } : {}),
          ...(hiddenPresetsChanged ? { hiddenPresets } : {}),
          ...(merged.changed ? { savedColors: toCanonicalSavedColors(merged.list) } : {}),
          ...(colorOrderStorageChanged ? { colorOrder: colorSwatchesOrder } : {}),
        },
        'settings color import persistence'
      )
    );
  }
  applyImportedColorMutation(App, mutation, 'settingsColors.import', false);
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
    ensureModelsLoadedViaServiceOrThrow(
      App,
      { forceRebuild: true, silent: false },
      'settings backup import models refresh'
    );
    renderModelUiViaActionsOrThrow(App, 'settings backup import models render');
  } catch (error) {
    settingsBackupReport(App, 'import:models.refresh', error, true);
  }
}
