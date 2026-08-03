import type {
  AppContainer,
  CloudCollectionsMutation,
  ModelsMergeResult,
  SavedColorLike,
  UnknownRecord,
} from '../../../types';
import { getCfg } from './store_access.js';
import {
  ensureModelsLoadedViaServiceOrThrow,
  normalizeUnknownError,
  patchViaActions,
  planImportedModelsCollectionsMutation,
  readFileTextResultViaBrowser,
  runPerfPhase,
  renderModelUiViaActionsOrThrow,
  transactCloudCollectionsViaServiceOrThrow,
  writeColorSwatchesOrderOrThrow,
  writeSavedColorsOrThrow,
} from '../services/api.js';
import {
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
import type { SettingsBackupImportWarning } from './settings_backup_contracts.js';

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

export interface SettingsImportPlan {
  data: SettingsBackupData;
  presetOrder: string[];
  hiddenPresets: string[];
}

export interface SettingsImportCommitResult {
  modelsMergeResult: ModelsMergeResult;
  colorsAdded: number;
  warnings: SettingsBackupImportWarning[];
}

export function buildSettingsImportPlan(App: AppContainer, data: SettingsBackupData): SettingsImportPlan {
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  return {
    data,
    presetOrder: presetCollections.presetOrder,
    hiddenPresets: presetCollections.hiddenPresets,
  };
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
  return runPerfPhase(App, metricName, metricName.split('.').at(-1) || 'step', run);
}

async function publishImportedColorMutation(
  App: AppContainer,
  mutation: ImportedColorMutation,
  metaSource: string
): Promise<void> {
  const patch = buildImportedColorConfigPatch(mutation);
  if (!Object.keys(patch).length) return;

  const meta = buildRestoreMeta(App, { immediate: true }, metaSource);
  const savedColors = cloneImportedSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneImportedColorOrder(mutation.colorSwatchesOrder);

  if (typeof patchViaActions === 'function' && patchViaActions(App, patch, meta)) {
    return;
  }

  const mapsMeta = { ...meta, noStorageWrite: true };

  if (typeof savedColors !== 'undefined') {
    await writeSavedColorsOrThrow(App, savedColors, mapsMeta);
  }

  if (typeof colorSwatchesOrder !== 'undefined') {
    await writeColorSwatchesOrderOrThrow(App, colorSwatchesOrder.slice(), mapsMeta);
  }
}

export async function commitSettingsImportPlan(
  App: AppContainer,
  plan: SettingsImportPlan
): Promise<SettingsImportCommitResult> {
  if (plan.data.savedModels.length > 0) {
    try {
      ensureModelsLoadedViaServiceOrThrow(App, { silent: true }, 'settings backup import models preparation');
    } catch (error) {
      throw new SettingsBackupActionError(
        'models-unavailable',
        normalizeUnknownError(error, '[WardrobePro] Settings backup model preparation failed.').message
      );
    }
  }

  let modelsMergeResult: ModelsMergeResult = { added: 0, updated: 0 };
  let colorsAdded = 0;
  let savedColorsChanged = false;
  let savedColorsForPublish: SettingsBackupSavedColorEntry[] = [];
  let colorOrderLiveChanged = false;
  let colorOrderStorageChanged = false;
  let modelCollectionsChanged = false;

  const commit = await runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
    transactCloudCollectionsViaServiceOrThrow(
      App,
      current => {
        const modelDecision = planImportedModelsCollectionsMutation(App, current, plan.data.savedModels);
        modelsMergeResult = modelDecision.result;
        modelCollectionsChanged = !!modelDecision.mutation.savedModels;

        const mergedColors = mergeSavedColorLists(current.savedColors, plan.data.savedColors);
        const savedColorsForOrder = mergedColors.changed ? mergedColors.list : current.savedColors;
        const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, current.colorOrder);
        const currentStorageOrderIds = readSettingsBackupIdList(current.colorOrder);
        const canonicalSavedColorOrder = readCanonicalSavedColorOrder(savedColorsForOrder);
        const colorSwatchesOrder = resolveColorSwatchesOrder(
          savedColorsForOrder,
          plan.data.colorSwatchesOrder,
          currentLiveColorOrder,
          currentStorageOrderIds,
          canonicalSavedColorOrder
        );

        colorsAdded = mergedColors.added;
        savedColorsChanged = mergedColors.changed;
        savedColorsForPublish = mergedColors.list;
        colorOrderStorageChanged = !sameSettingsBackupIdList(current.colorOrder, colorSwatchesOrder);
        colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
        const presetOrderChanged = !sameSettingsBackupIdList(current.presetOrder, plan.presetOrder);
        const hiddenPresetsChanged = !sameSettingsBackupIdList(current.hiddenPresets, plan.hiddenPresets);
        modelCollectionsChanged = modelCollectionsChanged || presetOrderChanged || hiddenPresetsChanged;

        const mutation: CloudCollectionsMutation = {
          ...modelDecision.mutation,
          ...(savedColorsChanged ? { savedColors: toCanonicalSavedColors(mergedColors.list) } : {}),
          ...(colorOrderStorageChanged ? { colorOrder: colorSwatchesOrder } : {}),
          ...(presetOrderChanged ? { presetOrder: plan.presetOrder } : {}),
          ...(hiddenPresetsChanged ? { hiddenPresets: plan.hiddenPresets } : {}),
        };
        return mutation;
      },
      'settings backup import canonical transaction'
    )
  );

  const warnings: SettingsBackupImportWarning[] = [];
  const colorMutation: ImportedColorMutation = {};
  if (savedColorsChanged) colorMutation.savedColors = savedColorsForPublish;
  if (colorOrderStorageChanged || colorOrderLiveChanged) {
    colorMutation.colorSwatchesOrder = readSettingsBackupIdList(commit.envelope.colorOrder);
  }
  try {
    await publishImportedColorMutation(App, colorMutation, 'settingsBackup.import');
  } catch (error) {
    settingsBackupReport(App, 'import:colors.refresh', error, true);
    warnings.push({
      effect: 'colors-refresh',
      message: 'Settings were imported, but the live color controls could not be refreshed.',
    });
  }

  const modelWarning = finalizeImportedModels(App, modelsMergeResult, modelCollectionsChanged);
  if (modelWarning) warnings.push(modelWarning);
  return { modelsMergeResult, colorsAdded, warnings };
}

export async function mergeImportedSavedColors(
  App: AppContainer,
  value: SettingsBackupSavedColorEntry[]
): Promise<number> {
  if (!Array.isArray(value) || value.length <= 0) return 0;

  let added = 0;
  let changed = false;
  let savedColorsForPublish: SettingsBackupSavedColorEntry[] = [];
  await runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
    transactCloudCollectionsViaServiceOrThrow(
      App,
      current => {
        const merged = mergeSavedColorLists(current.savedColors, value);
        added = merged.added;
        changed = merged.changed;
        savedColorsForPublish = merged.list;
        return changed ? { savedColors: toCanonicalSavedColors(merged.list) } : {};
      },
      'savedColors.import collections persistence'
    )
  );
  if (!changed) return 0;

  await publishImportedColorMutation(App, { savedColors: savedColorsForPublish }, 'savedColors.import');

  return added;
}

function readCurrentColorSwatchesOrder(App: AppContainer, storedOrder: unknown): string[] {
  const cfg = getCfg(App) || {};
  if (Array.isArray(cfg.colorSwatchesOrder)) {
    return readSettingsBackupIdList(cfg.colorSwatchesOrder);
  }
  return readSettingsBackupIdList(storedOrder);
}

export async function applyImportedStorageSettings(
  App: AppContainer,
  data: SettingsBackupData
): Promise<void> {
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  let colorOrderLiveChanged = false;
  const result = await runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
    transactCloudCollectionsViaServiceOrThrow(
      App,
      current => {
        const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, current.colorOrder);
        const currentStorageOrderIds = readSettingsBackupIdList(current.colorOrder);
        const canonicalSavedColorOrder = readCanonicalSavedColorOrder(current.savedColors);
        const colorSwatchesOrder = resolveColorSwatchesOrder(
          current.savedColors,
          data.colorSwatchesOrder,
          currentLiveColorOrder,
          currentStorageOrderIds,
          canonicalSavedColorOrder
        );
        const presetOrderChanged = !sameSettingsBackupIdList(current.presetOrder, presetOrder);
        const hiddenPresetsChanged = !sameSettingsBackupIdList(current.hiddenPresets, hiddenPresets);
        const colorOrderStorageChanged = !sameSettingsBackupIdList(current.colorOrder, colorSwatchesOrder);
        colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
        return {
          ...(presetOrderChanged ? { presetOrder } : {}),
          ...(hiddenPresetsChanged ? { hiddenPresets } : {}),
          ...(colorOrderStorageChanged ? { colorOrder: colorSwatchesOrder } : {}),
        };
      },
      'settings storage import persistence'
    )
  );
  if (!colorOrderLiveChanged) return;

  await publishImportedColorMutation(
    App,
    { colorSwatchesOrder: readSettingsBackupIdList(result.envelope.colorOrder) },
    'colorSwatchesOrder.import'
  );
}

export async function applyImportedColorSettings(
  App: AppContainer,
  data: SettingsBackupData
): Promise<number> {
  const presetCollections = sanitizePresetCollections(App, data.presetOrder, data.hiddenPresets);
  const presetOrder = presetCollections.presetOrder;
  const hiddenPresets = presetCollections.hiddenPresets;
  let colorsAdded = 0;
  let savedColorsChanged = false;
  let savedColorsForPublish: SettingsBackupSavedColorEntry[] = [];
  let colorOrderLiveChanged = false;
  let colorOrderStorageChanged = false;
  const result = await runSettingsBackupImportPerfStep(App, 'settingsBackup.import.collections.commit', () =>
    transactCloudCollectionsViaServiceOrThrow(
      App,
      current => {
        const merged = mergeSavedColorLists(current.savedColors, data.savedColors);
        const savedColorsForOrder = merged.changed ? merged.list : current.savedColors;
        const currentLiveColorOrder = readCurrentColorSwatchesOrder(App, current.colorOrder);
        const currentStorageOrderIds = readSettingsBackupIdList(current.colorOrder);
        const canonicalSavedColorOrder = readCanonicalSavedColorOrder(savedColorsForOrder);
        const colorSwatchesOrder = resolveColorSwatchesOrder(
          savedColorsForOrder,
          data.colorSwatchesOrder,
          currentLiveColorOrder,
          currentStorageOrderIds,
          canonicalSavedColorOrder
        );

        colorsAdded = merged.added;
        savedColorsChanged = merged.changed;
        savedColorsForPublish = merged.list;
        colorOrderStorageChanged = !sameSettingsBackupIdList(current.colorOrder, colorSwatchesOrder);
        colorOrderLiveChanged = !sameSettingsBackupIdList(currentLiveColorOrder, colorSwatchesOrder);
        return {
          ...(!sameSettingsBackupIdList(current.presetOrder, presetOrder) ? { presetOrder } : {}),
          ...(!sameSettingsBackupIdList(current.hiddenPresets, hiddenPresets) ? { hiddenPresets } : {}),
          ...(savedColorsChanged ? { savedColors: toCanonicalSavedColors(merged.list) } : {}),
          ...(colorOrderStorageChanged ? { colorOrder: colorSwatchesOrder } : {}),
        };
      },
      'settings color import persistence'
    )
  );

  const mutation: ImportedColorMutation = {};
  if (savedColorsChanged) mutation.savedColors = savedColorsForPublish;
  if (colorOrderStorageChanged || colorOrderLiveChanged) {
    mutation.colorSwatchesOrder = readSettingsBackupIdList(result.envelope.colorOrder);
  }
  await publishImportedColorMutation(App, mutation, 'settingsColors.import');
  return colorsAdded;
}

export function finalizeImportedModels(
  App: AppContainer,
  result: ModelsMergeResult,
  force = false
): SettingsBackupImportWarning | null {
  const added = Number.isFinite(Number(result.added)) ? Number(result.added) : 0;
  const updated = Number.isFinite(Number(result.updated)) ? Number(result.updated) : 0;
  if (!force && added + updated <= 0) return null;

  try {
    ensureModelsLoadedViaServiceOrThrow(
      App,
      { forceRebuild: true, silent: false },
      'settings backup import models refresh'
    );
    renderModelUiViaActionsOrThrow(App, 'settings backup import models render');
    return null;
  } catch (error) {
    settingsBackupReport(App, 'import:models.refresh', error, true);
    return {
      effect: 'models-refresh',
      message: 'Settings were imported, but the live model controls could not be refreshed.',
    };
  }
}
