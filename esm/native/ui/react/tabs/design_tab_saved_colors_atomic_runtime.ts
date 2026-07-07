import type { ActionMetaLike, AppContainer } from '../../../../../types';

import {
  getStorageKey,
  getStorageServiceMaybe,
  patchViaActions,
  reportError,
  setStorageJSON,
} from '../../../services/api.js';
import {
  runHistoryBatch,
  setCfgColorSwatchesOrder,
  setCfgSavedColors,
  setUiColorChoice,
} from '../actions/store_actions.js';

import type { SavedColor } from './design_tab_multicolor_panel.js';
import {
  readSavedColorPerfMetricPrefix,
  runSavedColorPerfStep,
} from './design_tab_saved_colors_perf_runtime.js';

type SavedColorsAtomicMutation = {
  savedColors?: SavedColor[];
  colorSwatchesOrder?: string[];
  colorChoice?: string;
};

function shouldSkipStorageWrite(meta: ActionMetaLike | undefined): boolean {
  return !!(meta && typeof meta === 'object' && meta.noStorageWrite === true);
}

function cloneSavedColors(savedColors: SavedColor[] | undefined): SavedColor[] | undefined {
  if (!Array.isArray(savedColors)) return undefined;
  return savedColors.slice();
}

function cloneColorSwatchesOrder(colorSwatchesOrder: string[] | undefined): string[] | undefined {
  if (!Array.isArray(colorSwatchesOrder)) return undefined;
  return colorSwatchesOrder.map(value => String(value || ''));
}

function buildSavedColorsMutationPatch(mutation: SavedColorsAtomicMutation): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const configPatch: Record<string, unknown> = {};
  const uiPatch: Record<string, unknown> = {};

  if (typeof mutation.savedColors !== 'undefined')
    configPatch.savedColors = cloneSavedColors(mutation.savedColors);
  if (typeof mutation.colorSwatchesOrder !== 'undefined') {
    configPatch.colorSwatchesOrder = cloneColorSwatchesOrder(mutation.colorSwatchesOrder);
  }
  if (typeof mutation.colorChoice === 'string' && mutation.colorChoice)
    uiPatch.colorChoice = mutation.colorChoice;

  if (Object.keys(configPatch).length) patch.config = configPatch;
  if (Object.keys(uiPatch).length) patch.ui = uiPatch;
  return patch;
}

function hasStorageJsonWriter(app: AppContainer): boolean {
  const storage = getStorageServiceMaybe(app);
  return !!(storage && typeof storage.setJSON === 'function');
}

function reportSavedColorsStorageWriteFailure(app: AppContainer, key: string): void {
  reportError(
    app,
    new Error(`[WardrobePro] Saved colors storage write failed for ${key}.`),
    {
      where: 'native/ui/react/tabs/design_tab_saved_colors_atomic_runtime',
      op: 'persistSavedColorsStorage.setStorageJSON',
      fatal: false,
    },
    { consoleOutput: false }
  );
}

function writeSavedColorsStorageJSON(app: AppContainer, key: string, value: unknown): boolean {
  if (!hasStorageJsonWriter(app)) return false;
  const ok = runSavedColorPerfStep(app, 'design.savedColor.storage.write', () =>
    setStorageJSON(app, key, value)
  );
  if (!ok) reportSavedColorsStorageWriteFailure(app, key);
  return ok;
}

function persistSavedColorsStorage(
  app: AppContainer,
  mutation: SavedColorsAtomicMutation,
  meta?: ActionMetaLike
): void {
  if (shouldSkipStorageWrite(meta)) return;
  if (typeof mutation.savedColors === 'undefined' && typeof mutation.colorSwatchesOrder === 'undefined')
    return;

  const metricPrefix = readSavedColorPerfMetricPrefix(meta, 'design.savedColor.storage');
  runSavedColorPerfStep(app, `${metricPrefix}.storage`, () => {
    const savedColorsKey = getStorageKey(app, 'SAVED_COLORS', 'wardrobeSavedColors');
    if (typeof mutation.savedColors !== 'undefined') {
      writeSavedColorsStorageJSON(app, savedColorsKey, cloneSavedColors(mutation.savedColors) || []);
    }
    if (typeof mutation.colorSwatchesOrder !== 'undefined') {
      writeSavedColorsStorageJSON(
        app,
        `${savedColorsKey}:order`,
        cloneColorSwatchesOrder(mutation.colorSwatchesOrder) || []
      );
    }
  });
}

function createFallbackMutationMeta(meta: ActionMetaLike | undefined): ActionMetaLike {
  return { ...(meta || {}), noStorageWrite: true };
}

export function applySavedColorsAtomicMutation(
  app: AppContainer,
  mutation: SavedColorsAtomicMutation,
  meta?: ActionMetaLike
): void {
  const patch = buildSavedColorsMutationPatch(mutation);
  if (!Object.keys(patch).length) return;

  const metricPrefix = readSavedColorPerfMetricPrefix(meta);
  if (runSavedColorPerfStep(app, `${metricPrefix}.patch`, () => patchViaActions(app, patch, meta))) {
    persistSavedColorsStorage(app, mutation, meta);
    return;
  }

  const savedColors = cloneSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneColorSwatchesOrder(mutation.colorSwatchesOrder);
  const colorChoice = typeof mutation.colorChoice === 'string' ? mutation.colorChoice : '';

  const fallbackMeta = createFallbackMutationMeta(meta);

  runSavedColorPerfStep(app, `${metricPrefix}.fallback`, () =>
    runHistoryBatch(
      app,
      () => {
        if (typeof savedColors !== 'undefined') setCfgSavedColors(app, savedColors, fallbackMeta);
        if (typeof colorSwatchesOrder !== 'undefined')
          setCfgColorSwatchesOrder(app, colorSwatchesOrder, fallbackMeta);
        if (colorChoice) setUiColorChoice(app, colorChoice, meta);
      },
      meta
    )
  );
  persistSavedColorsStorage(app, mutation, meta);
}
