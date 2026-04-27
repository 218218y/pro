import type {
  AppContainer,
  ModelsCommandResult,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelLike,
} from '../../../types';

import {
  _getStoredHiddenPresets,
  _modelsReportNonFatal,
  _setStoredHiddenPresets,
} from './models_registry.js';
import {
  cloneNormalizedModel,
  commitModels,
  computeInsertIndex,
  demotePresetToSavedModel,
  findInListById,
  getCorePresetById,
  markModelAsCorePresetEntry,
  promoteModelToUserPreset,
  splitModels,
} from './models_apply_state.js';
import { ensureModelsCommandState } from './models_apply_ops_shared.js';

export function transferModelInternalImpl(
  App: AppContainer,
  id: SavedModelId,
  targetList: ModelsTransferTargetList,
  overId: SavedModelId | null,
  pos: ModelsTransferPosition
): ModelsCommandResult {
  ensureModelsCommandState(App);
  const did = id != null ? String(id).trim() : '';
  if (!did) return { ok: false, reason: 'id' };

  const target: ModelsTransferTargetList = targetList === 'preset' ? 'preset' : 'saved';
  const dropPos: ModelsTransferPosition = pos === 'before' || pos === 'after' || pos === 'end' ? pos : 'end';
  const over = overId != null ? String(overId).trim() : '';
  const hidden = new Set<string>(_getStoredHiddenPresets(App));
  const { presets, saved } = splitModels(App);

  if (target === 'preset') {
    return transferSavedModelToPreset(App, did, dropPos, over, hidden, presets, saved);
  }

  return transferPresetModelToSaved(App, did, dropPos, over, hidden, presets, saved);
}

function transferSavedModelToPreset(
  App: AppContainer,
  did: string,
  dropPos: ModelsTransferPosition,
  over: string,
  hidden: Set<string>,
  presets: SavedModelLike[],
  saved: SavedModelLike[]
): ModelsCommandResult {
  const savedIndex = findInListById(saved, did);
  if (savedIndex < 0) return { ok: false, reason: 'missing' };

  const movedModel = saved[savedIndex];
  if (!movedModel) return { ok: false, reason: 'missing' };

  if (movedModel.fromCorePreset && getCorePresetById(App, did) && hidden.has(did)) {
    saved.splice(savedIndex, 1);
    hidden.delete(did);
    _setStoredHiddenPresets(App, Array.from(hidden));

    const restoredCore = cloneNormalizedModel(App, getCorePresetById(App, did));
    if (!restoredCore) return { ok: false, reason: 'core' };

    try {
      markModelAsCorePresetEntry(restoredCore);
    } catch (e) {
      _modelsReportNonFatal(App, 'transferModel.markCore', e, 1500);
    }

    const insertAt = computeInsertIndex(presets, dropPos, over);
    presets.splice(Math.max(0, Math.min(presets.length, insertAt)), 0, restoredCore);
    commitModels(App, presets, saved);
    return { ok: true };
  }

  saved.splice(savedIndex, 1);
  try {
    promoteModelToUserPreset(movedModel);
  } catch (e) {
    _modelsReportNonFatal(App, 'transferModel.promoteUserPreset', e, 1500);
  }

  const insertAt = computeInsertIndex(presets, dropPos, over);
  presets.splice(Math.max(0, Math.min(presets.length, insertAt)), 0, movedModel);
  commitModels(App, presets, saved);
  return { ok: true };
}

function transferPresetModelToSaved(
  App: AppContainer,
  did: string,
  dropPos: ModelsTransferPosition,
  over: string,
  hidden: Set<string>,
  presets: SavedModelLike[],
  saved: SavedModelLike[]
): ModelsCommandResult {
  const presetIndex = findInListById(presets, did);
  if (presetIndex < 0) return { ok: false, reason: 'missing' };

  const presetModel = presets[presetIndex];
  const isUserPreset = !!presetModel?.isUserPreset;
  presets.splice(presetIndex, 1);

  let moved: SavedModelLike | null = presetModel || null;
  if (!isUserPreset) {
    hidden.add(did);
    const copy = cloneNormalizedModel(App, presetModel);
    if (!copy) return { ok: false, reason: 'copy' };

    try {
      demotePresetToSavedModel(copy);
      copy.fromCorePreset = true;
      delete copy.locked;
    } catch (e) {
      _modelsReportNonFatal(App, 'transferModel.copyCoreToSaved', e, 1500);
    }

    moved = copy;
    _setStoredHiddenPresets(App, Array.from(hidden));
  } else if (moved) {
    try {
      demotePresetToSavedModel(moved);
    } catch (e) {
      _modelsReportNonFatal(App, 'transferModel.userPresetToSaved', e, 1500);
    }
  }

  if (!moved) return { ok: false, reason: 'copy' };
  const insertAt = computeInsertIndex(saved, dropPos, over);
  saved.splice(Math.max(0, Math.min(saved.length, insertAt)), 0, moved);
  commitModels(App, presets, saved);
  return { ok: true };
}
