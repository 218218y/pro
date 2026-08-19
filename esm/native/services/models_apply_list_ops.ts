import type {
  AppContainer,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLockResult,
  ModelsMoveDirection,
  SavedModelId,
  SavedModelLike,
} from '../../../types';

import { _modelsReportNonFatal } from './models_registry.js';
import {
  cloneNormalizedModel,
  findInListById,
  isLockedModel,
  isPresetModel,
  isUserPresetModel,
  setLockedFlag,
} from './models_apply_state.js';
import { ensureModelsCommandState } from './models_apply_ops_shared.js';
import {
  collectPersistedUserModels,
  collectPresetOrder,
  runModelsCollectionsTransaction,
} from './models_collections_transaction.js';
import { readModelId } from './models_registry_contracts.js';

export async function deleteModelByIdInternalImpl(
  App: AppContainer,
  id: SavedModelId
): Promise<ModelsCommandResult> {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const transaction = await runModelsCollectionsTransaction<ModelsCommandResult>(App, snapshot => {
    const idx = snapshot.envelope.savedModels.findIndex(model => readModelId(model) === id);
    if (idx < 0) {
      const corePreset = snapshot.presets.find(model => readModelId(model) === id);
      return {
        result: corePreset ? { ok: false, reason: 'preset' } : { ok: false, reason: 'missing' },
        mutation: {},
      };
    }
    const model = snapshot.envelope.savedModels[idx];
    if (isPresetModel(model) && !isUserPresetModel(model)) {
      return { result: { ok: false, reason: 'preset' }, mutation: {} };
    }
    if (isLockedModel(model)) return { result: { ok: false, reason: 'locked' }, mutation: {} };
    return {
      result: { ok: true },
      mutation: {
        savedModels: snapshot.envelope.savedModels.filter(entry => readModelId(entry) !== id),
        ...(isPresetModel(model)
          ? { presetOrder: snapshot.envelope.presetOrder.filter(entry => entry !== id) }
          : {}),
      },
    };
  });
  if (transaction.ok === false) {
    return { ok: false, reason: transaction.failure.reason, message: transaction.failure.message };
  }
  return transaction.value;
}

export async function setModelLockedInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  locked: boolean
): Promise<ModelsLockResult> {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  const want = !!locked;
  const transaction = await runModelsCollectionsTransaction<ModelsLockResult>(App, snapshot => {
    const idx = snapshot.envelope.savedModels.findIndex(model => readModelId(model) === id);
    if (idx < 0) {
      const corePreset = snapshot.presets.find(model => readModelId(model) === id);
      return {
        result: corePreset
          ? { ok: false, reason: 'preset', locked: false }
          : { ok: false, reason: 'missing', locked: false },
        mutation: {},
      };
    }
    const model = snapshot.envelope.savedModels[idx];
    if (isPresetModel(model) && !isUserPresetModel(model)) {
      return { result: { ok: false, reason: 'preset', locked: false }, mutation: {} };
    }
    const nextModel = cloneNormalizedModel(App, model);
    if (!nextModel) return { result: { ok: false, reason: 'normalize', locked: false }, mutation: {} };
    try {
      setLockedFlag(nextModel, want);
    } catch (e) {
      _modelsReportNonFatal(App, 'setModelLocked', e, 1500);
    }
    const savedModels = snapshot.envelope.savedModels.slice();
    savedModels[idx] = nextModel;
    return { result: { ok: true, locked: want }, mutation: { savedModels } };
  });
  if (transaction.ok === false) {
    return {
      ok: false,
      reason: transaction.failure.reason,
      message: transaction.failure.message,
      locked: false,
    };
  }
  return transaction.value;
}

export async function deleteTemporaryUserModelsInternalImpl(
  App: AppContainer
): Promise<ModelsDeleteTemporaryResult> {
  ensureModelsCommandState(App);

  const transaction = await runModelsCollectionsTransaction<ModelsDeleteTemporaryResult>(App, snapshot => {
    let removed = 0;
    const savedModels: SavedModelLike[] = [];
    for (const model of snapshot.envelope.savedModels) {
      if (model.isPreset || isLockedModel(model)) savedModels.push(model);
      else removed += 1;
    }
    return {
      result: { ok: true, removed },
      mutation: removed > 0 ? { savedModels } : {},
    };
  });
  if (transaction.ok === false) {
    return {
      ok: false,
      reason: transaction.failure.reason,
      message: transaction.failure.message,
      removed: 0,
    };
  }
  return transaction.value;
}

export async function moveModelInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  direction: ModelsMoveDirection
): Promise<ModelsCommandResult> {
  ensureModelsCommandState(App);
  if (!id) return { ok: false, reason: 'id' };

  if (direction !== 'up' && direction !== 'down') return { ok: false, reason: 'direction' };
  const transaction = await runModelsCollectionsTransaction<ModelsCommandResult>(App, snapshot => {
    const presetIndex = findInListById(snapshot.presets, id);
    const savedIndex = findInListById(snapshot.saved, id);
    const isPreset = presetIndex >= 0;
    const list = isPreset ? snapshot.presets : snapshot.saved;
    const idx = isPreset ? presetIndex : savedIndex;
    if (idx < 0) return { result: { ok: false, reason: 'missing' }, mutation: {} };
    const model = list[idx];
    if (!isPreset && isLockedModel(model)) {
      return { result: { ok: false, reason: 'locked' }, mutation: {} };
    }
    if (!isPreset && direction === 'up' && idx === 0 && snapshot.presets.length > 0) {
      return { result: { ok: false, reason: 'overPreset' }, mutation: {} };
    }
    const swapWith = direction === 'up' ? idx - 1 : idx + 1;
    if (swapWith < 0 || swapWith >= list.length) {
      return { result: { ok: false, reason: 'edge' }, mutation: {} };
    }
    const currentModel = list[idx];
    const swapModel = list[swapWith];
    if (!currentModel || !swapModel) {
      return { result: { ok: false, reason: 'missing' }, mutation: {} };
    }
    list[idx] = swapModel;
    list[swapWith] = currentModel;
    return {
      result: { ok: true },
      mutation: isPreset
        ? { presetOrder: collectPresetOrder(snapshot.presets) }
        : { savedModels: collectPersistedUserModels(snapshot.presets, snapshot.saved) },
    };
  });
  if (transaction.ok === false) {
    return { ok: false, reason: transaction.failure.reason, message: transaction.failure.message };
  }
  return transaction.value;
}
