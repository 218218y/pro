import type { ActionMetaLike, AppContainer } from '../../../../../types';

import {
  patchViaActions,
  readCloudCollectionsEnvelopeViaServiceOrThrow,
  reportError,
  transactCloudCollectionsViaServiceOrThrow,
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

export type SavedColorsAtomicMutator = (current: {
  savedColors: SavedColor[];
  colorSwatchesOrder: string[];
}) => SavedColorsAtomicMutation;

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

function readStringColorOrder(values: readonly unknown[]): string[] {
  return values.filter((value): value is string => typeof value === 'string');
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

function reportSavedColorsStorageWriteFailure(app: AppContainer, error: unknown): void {
  reportError(
    app,
    error,
    {
      where: 'native/ui/react/tabs/design_tab_saved_colors_atomic_runtime',
      op: 'persistSavedColorsStorage.updateCollections',
      fatal: false,
    },
    { consoleOutput: false }
  );
}

async function resolveSavedColorsMutation(
  app: AppContainer,
  mutator: SavedColorsAtomicMutator,
  meta?: ActionMetaLike
): Promise<SavedColorsAtomicMutation | null> {
  if (shouldSkipStorageWrite(meta)) {
    const current = readCloudCollectionsEnvelopeViaServiceOrThrow(
      app,
      'design saved colors store-only mutation'
    );
    return mutator({
      savedColors: current.savedColors.slice() as SavedColor[],
      colorSwatchesOrder: readStringColorOrder(current.colorOrder),
    });
  }

  const metricPrefix = readSavedColorPerfMetricPrefix(meta, 'design.savedColor.storage');
  return await runSavedColorPerfStep(app, `${metricPrefix}.storage`, async () => {
    try {
      let requested: SavedColorsAtomicMutation = {};
      const result = await runSavedColorPerfStep(app, 'design.savedColor.storage.commit', () =>
        transactCloudCollectionsViaServiceOrThrow(
          app,
          current => {
            requested = mutator({
              savedColors: current.savedColors.slice() as SavedColor[],
              colorSwatchesOrder: readStringColorOrder(current.colorOrder),
            });
            return {
              ...(typeof requested.savedColors !== 'undefined'
                ? { savedColors: cloneSavedColors(requested.savedColors) || [] }
                : {}),
              ...(typeof requested.colorSwatchesOrder !== 'undefined'
                ? { colorOrder: cloneColorSwatchesOrder(requested.colorSwatchesOrder) || [] }
                : {}),
            };
          },
          'design saved colors persistence'
        )
      );
      return {
        ...(typeof requested.savedColors !== 'undefined'
          ? { savedColors: result.envelope.savedColors as SavedColor[] }
          : {}),
        ...(typeof requested.colorSwatchesOrder !== 'undefined'
          ? { colorSwatchesOrder: readStringColorOrder(result.envelope.colorOrder) }
          : {}),
        ...(typeof requested.colorChoice === 'string' ? { colorChoice: requested.colorChoice } : {}),
      };
    } catch (error) {
      reportSavedColorsStorageWriteFailure(app, error);
      return null;
    }
  });
}

function createStoreOnlyMutationMeta(meta: ActionMetaLike | undefined): ActionMetaLike {
  return { ...meta, noStorageWrite: true };
}

export async function applySavedColorsAtomicMutation(
  app: AppContainer,
  mutator: SavedColorsAtomicMutator,
  meta?: ActionMetaLike
): Promise<boolean> {
  const mutation = await resolveSavedColorsMutation(app, mutator, meta);
  if (!mutation) return false;
  const patch = buildSavedColorsMutationPatch(mutation);
  if (!Object.keys(patch).length) return true;

  const metricPrefix = readSavedColorPerfMetricPrefix(meta);
  if (runSavedColorPerfStep(app, `${metricPrefix}.patch`, () => patchViaActions(app, patch, meta))) {
    return true;
  }

  const savedColors = cloneSavedColors(mutation.savedColors);
  const colorSwatchesOrder = cloneColorSwatchesOrder(mutation.colorSwatchesOrder);
  const colorChoice = typeof mutation.colorChoice === 'string' ? mutation.colorChoice : '';

  const ownerMeta = meta;
  const runDirectStoreMutation = (meta: ActionMetaLike): void => {
    runHistoryBatch(
      app,
      () => {
        if (typeof savedColors !== 'undefined') setCfgSavedColors(app, savedColors, meta);
        if (typeof colorSwatchesOrder !== 'undefined')
          setCfgColorSwatchesOrder(app, colorSwatchesOrder, meta);
        if (colorChoice) setUiColorChoice(app, colorChoice, ownerMeta);
      },
      ownerMeta
    );
  };

  runSavedColorPerfStep(app, `${metricPrefix}.direct`, () =>
    runDirectStoreMutation(createStoreOnlyMutationMeta(ownerMeta))
  );
  return true;
}
