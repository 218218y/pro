import type {
  AppContainer,
  ModelsCommandResult,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
} from '../../../types';

import { _modelsReportNonFatal } from './models_registry.js';
import {
  cloneNormalizedModel,
  computeInsertIndex,
  demotePresetToSavedModel,
  findInListById,
  getCorePresetById,
  markModelAsCorePresetEntry,
  promoteModelToUserPreset,
} from './models_apply_state.js';
import { ensureModelsCommandState } from './models_apply_ops_shared.js';
import {
  collectPersistedUserModels,
  collectPresetOrder,
  runModelsCollectionsTransaction,
  type ModelsCollectionsSnapshot,
} from './models_collections_transaction.js';

function buildTransferMutation(snapshot: ModelsCollectionsSnapshot) {
  return {
    savedModels: collectPersistedUserModels(snapshot.presets, snapshot.saved),
    presetOrder: collectPresetOrder(snapshot.presets),
    hiddenPresets: Array.from(snapshot.hiddenPresets),
  };
}

function transferSavedToPreset(
  App: AppContainer,
  did: string,
  dropPos: ModelsTransferPosition,
  over: string,
  snapshot: ModelsCollectionsSnapshot
): ModelsCommandResult {
  const savedIndex = findInListById(snapshot.saved, did);
  if (savedIndex < 0) return { ok: false, reason: 'missing' };
  const movedModel = snapshot.saved[savedIndex];
  if (!movedModel) return { ok: false, reason: 'missing' };

  if (movedModel.fromCorePreset && getCorePresetById(App, did) && snapshot.hiddenPresets.has(did)) {
    snapshot.saved.splice(savedIndex, 1);
    snapshot.hiddenPresets.delete(did);
    const restoredCore = cloneNormalizedModel(App, getCorePresetById(App, did));
    if (!restoredCore) return { ok: false, reason: 'core' };
    try {
      markModelAsCorePresetEntry(restoredCore);
    } catch (error) {
      _modelsReportNonFatal(App, 'transferModel.markCore', error, 1500);
    }
    const insertAt = computeInsertIndex(snapshot.presets, dropPos, over);
    snapshot.presets.splice(Math.max(0, Math.min(snapshot.presets.length, insertAt)), 0, restoredCore);
    return { ok: true };
  }

  snapshot.saved.splice(savedIndex, 1);
  try {
    promoteModelToUserPreset(movedModel);
  } catch (error) {
    _modelsReportNonFatal(App, 'transferModel.promoteUserPreset', error, 1500);
  }
  const insertAt = computeInsertIndex(snapshot.presets, dropPos, over);
  snapshot.presets.splice(Math.max(0, Math.min(snapshot.presets.length, insertAt)), 0, movedModel);
  return { ok: true };
}

function transferPresetToSaved(
  App: AppContainer,
  did: string,
  dropPos: ModelsTransferPosition,
  over: string,
  snapshot: ModelsCollectionsSnapshot
): ModelsCommandResult {
  const presetIndex = findInListById(snapshot.presets, did);
  if (presetIndex < 0) return { ok: false, reason: 'missing' };
  const presetModel = snapshot.presets[presetIndex];
  const isUserPreset = !!presetModel?.isUserPreset;
  snapshot.presets.splice(presetIndex, 1);

  let moved: SavedModelLike | null = presetModel || null;
  if (!isUserPreset) {
    snapshot.hiddenPresets.add(did);
    const copy = cloneNormalizedModel(App, presetModel);
    if (!copy) return { ok: false, reason: 'copy' };
    try {
      demotePresetToSavedModel(copy);
      copy.fromCorePreset = true;
      delete copy.locked;
    } catch (error) {
      _modelsReportNonFatal(App, 'transferModel.copyCoreToSaved', error, 1500);
    }
    moved = copy;
  } else if (moved) {
    try {
      demotePresetToSavedModel(moved);
    } catch (error) {
      _modelsReportNonFatal(App, 'transferModel.userPresetToSaved', error, 1500);
    }
  }

  if (!moved) return { ok: false, reason: 'copy' };
  const insertAt = computeInsertIndex(snapshot.saved, dropPos, over);
  snapshot.saved.splice(Math.max(0, Math.min(snapshot.saved.length, insertAt)), 0, moved);
  return { ok: true };
}

export async function transferModelInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  targetList: ModelsTransferTargetList,
  overId: SavedModelId | null,
  pos: ModelsTransferPosition
): Promise<ModelsCommandResult> {
  ensureModelsCommandState(App);
  const did = id != null ? String(id).trim() : '';
  if (!did) return { ok: false, reason: 'id' };

  const target: ModelsTransferTargetList = targetList === 'preset' ? 'preset' : 'saved';
  const dropPos: ModelsTransferPosition = pos === 'before' || pos === 'after' || pos === 'end' ? pos : 'end';
  const over = overId != null ? String(overId).trim() : '';

  const transaction = await runModelsCollectionsTransaction<ModelsCommandResult>(App, snapshot => {
    const result =
      target === 'preset'
        ? transferSavedToPreset(App, did, dropPos, over, snapshot)
        : transferPresetToSaved(App, did, dropPos, over, snapshot);
    return {
      result,
      mutation: result.ok ? buildTransferMutation(snapshot) : {},
    };
  });

  if (transaction.ok === false) {
    return { ok: false, reason: transaction.failure.reason, message: transaction.failure.message };
  }
  return transaction.value;
}
