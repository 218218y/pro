import type { ActionMetaLike, AppContainer } from '../../../../../types';

import { getStorageKey, patchViaActions, setStorageJSON } from '../../../services/api.js';
import {
  runHistoryBatch,
  setCfgColorSwatchesOrder,
  setCfgSavedColors,
  setUiColorChoice,
} from '../actions/store_actions.js';

import type { SavedColor } from './design_tab_multicolor_panel.js';

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

function persistSavedColorsStorage(
  app: AppContainer,
  mutation: SavedColorsAtomicMutation,
  meta?: ActionMetaLike
): void {
  if (shouldSkipStorageWrite(meta)) return;
  if (typeof mutation.savedColors === 'undefined' && typeof mutation.colorSwatchesOrder === 'undefined')
    return;

  const savedColorsKey = getStorageKey(app, 'SAVED_COLORS', 'wardrobeSavedColors');
  if (typeof mutation.savedColors !== 'undefined') {
    setStorageJSON(app, savedColorsKey, cloneSavedColors(mutation.savedColors) || []);
  }
  if (typeof mutation.colorSwatchesOrder !== 'undefined') {
    setStorageJSON(
      app,
      `${savedColorsKey}:order`,
      cloneColorSwatchesOrder(mutation.colorSwatchesOrder) || []
    );
  }
}

export function applySavedColorsAtomicMutation(
  app: AppContainer,
  mutation: SavedColorsAtomicMutation,
  meta?: ActionMetaLike
): void {
  const patch = buildSavedColorsMutationPatch(mutation);
  if (!Object.keys(patch).length) return;

  if (patchViaActions(app, patch, meta)) {
    persistSavedColorsStorage(app, mutation, meta);
    return;
  }

  const savedColors = cloneSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneColorSwatchesOrder(mutation.colorSwatchesOrder);
  const colorChoice = typeof mutation.colorChoice === 'string' ? mutation.colorChoice : '';

  runHistoryBatch(
    app,
    () => {
      if (typeof savedColors !== 'undefined') setCfgSavedColors(app, savedColors, meta);
      if (typeof colorSwatchesOrder !== 'undefined') setCfgColorSwatchesOrder(app, colorSwatchesOrder, meta);
      if (colorChoice) setUiColorChoice(app, colorChoice, meta);
    },
    meta
  );
}
