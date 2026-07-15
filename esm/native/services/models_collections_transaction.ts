import type {
  AppContainer,
  CloudCollectionsEnvelope,
  CloudCollectionsMutation,
  SavedModelLike,
} from '../../../types';

import {
  buildVisibleCorePresets,
  reorderPresetsByStoredOrder,
  splitStoredModels,
} from './models_registry_loading.js';
import { _modelsReportNonFatal } from './models_registry_nonfatal.js';
import { readModelId } from './models_registry_contracts.js';
import { transactModelsCollectionsCanonical } from './models_registry_storage_persistence.js';
import { getModelsRuntimeStateForApp, markModelsRuntimeStateDirty } from './models_registry_state.js';
import { _notify, syncModelsStateToApp } from './models_registry_storage_state.js';

export interface ModelsCollectionsSnapshot {
  envelope: Readonly<CloudCollectionsEnvelope>;
  presets: SavedModelLike[];
  saved: SavedModelLike[];
  hiddenPresets: Set<string>;
}

export interface ModelsCollectionsDecision<T> {
  result: T;
  mutation: CloudCollectionsMutation;
}

export type ModelsCollectionsFailure = {
  reason: 'error';
  message: string;
};

export function buildModelsCollectionsSnapshot(
  App: AppContainer,
  envelope: Readonly<CloudCollectionsEnvelope>
): ModelsCollectionsSnapshot {
  const { userPresets, userModels } = splitStoredModels(App, envelope.savedModels);
  const hiddenPresets = new Set(
    envelope.hiddenPresets.filter((value): value is string => typeof value === 'string')
  );
  const presets = buildVisibleCorePresets(App, hiddenPresets).concat(userPresets);
  reorderPresetsByStoredOrder(
    App,
    presets,
    envelope.presetOrder.filter((value): value is string => typeof value === 'string')
  );
  return { envelope, presets, saved: userModels, hiddenPresets };
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;
  return 'Models persistence failed';
}

function publishCommittedEnvelope(App: AppContainer, envelope: CloudCollectionsEnvelope): void {
  const snapshot = buildModelsCollectionsSnapshot(App, envelope);
  const state = getModelsRuntimeStateForApp(App);
  state.all = snapshot.presets.concat(snapshot.saved);
  state.loaded = true;
  markModelsRuntimeStateDirty(state);
  syncModelsStateToApp(App);
  _notify(App);
}

export function collectPersistedUserModels(
  presets: readonly SavedModelLike[],
  saved: readonly SavedModelLike[]
): SavedModelLike[] {
  return presets.filter(model => !!model?.isUserPreset).concat(saved);
}

export function collectPresetOrder(presets: readonly SavedModelLike[]): string[] {
  const out: string[] = [];
  for (const model of presets) {
    const id = readModelId(model);
    if (id) out.push(id);
  }
  return out;
}

export async function runModelsCollectionsTransaction<T>(
  App: AppContainer,
  build: (snapshot: ModelsCollectionsSnapshot) => ModelsCollectionsDecision<T>
): Promise<{ ok: true; value: T } | { ok: false; failure: ModelsCollectionsFailure }> {
  const decisionRef: { value: ModelsCollectionsDecision<T> | null } = { value: null };
  try {
    const commit = await transactModelsCollectionsCanonical(App, current => {
      const decision = build(buildModelsCollectionsSnapshot(App, current));
      decisionRef.value = decision;
      return decision.mutation;
    });
    const decision = decisionRef.value;
    if (!decision) throw new Error('Models collections transaction produced no decision.');

    if (commit.committed) {
      try {
        publishCommittedEnvelope(App, commit.envelope);
      } catch (error) {
        _modelsReportNonFatal(App, 'modelsCollectionsTransaction.publish', error, 1500);
      }
    }
    return { ok: true, value: decision.result };
  } catch (error) {
    _modelsReportNonFatal(App, 'modelsCollectionsTransaction.persist', error, 1500);
    return { ok: false, failure: { reason: 'error', message: errorMessage(error) } };
  }
}
