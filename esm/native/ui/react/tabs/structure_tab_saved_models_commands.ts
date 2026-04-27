import type {
  ModelsCommandResult,
  ModelsServiceLike,
  SavedModelId,
  SavedModelLike,
} from '../../../../../types';

import type { SavedModelsActionResult } from './structure_tab_saved_models_command_results.js';
import type {
  SavedModelsDropPos,
  SavedModelsListType,
  SavedModelsMoveDir,
} from './structure_tab_saved_models_shared.js';
import {
  buildDnDReorderPlan,
  getModelName,
  getTransferFn,
  isLockedModel,
  isPresetModel,
  normalizeModelName,
} from './structure_tab_saved_models_shared.js';
import {
  buildActionFailure,
  buildCommandActionResult,
  identifyModel,
  trimId,
  trimName,
} from './structure_tab_saved_models_command_results.js';

export function applySavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): SavedModelsActionResult & { kind: 'apply' } {
  const identified = identifyModel(modelsApi, 'apply', id);
  if (!identified.ok) return identified;

  return buildCommandActionResult('apply', modelsApi.apply(identified.id || ''), {
    id: identified.id,
    name: identified.name,
  });
}

export function saveCurrentModelByName(
  modelsApi: ModelsServiceLike,
  name: string
): SavedModelsActionResult & { kind: 'save' } {
  const trimmedName = trimName(name);
  if (!trimmedName) return buildActionFailure('save', 'cancelled');

  const res = modelsApi.saveCurrent(trimmedName);
  return buildCommandActionResult('save', res, {
    id: trimId(res?.id),
    name: trimmedName,
  });
}

export function overwriteSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): SavedModelsActionResult & { kind: 'overwrite' } {
  const identified = identifyModel(modelsApi, 'overwrite', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('overwrite', 'preset', { id: identified.id, name: identified.name });
  }
  if (isLockedModel(identified.model)) {
    return buildActionFailure('overwrite', 'locked', { id: identified.id, name: identified.name });
  }

  return buildCommandActionResult('overwrite', modelsApi.overwriteFromCurrent(identified.id || ''), {
    id: identified.id,
    name: identified.name,
  });
}

export function toggleSavedModelLock(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): SavedModelsActionResult & { kind: 'toggle-lock' } {
  const identified = identifyModel(modelsApi, 'toggle-lock', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('toggle-lock', 'preset', { id: identified.id, name: identified.name });
  }

  const wantLocked = !isLockedModel(identified.model);
  const res = modelsApi.setLocked(identified.id || '', wantLocked);
  return buildCommandActionResult('toggle-lock', res, {
    id: identified.id,
    name: identified.name,
    locked: res?.ok ? !!res.locked : wantLocked,
  });
}

export function deleteSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): SavedModelsActionResult & { kind: 'delete' } {
  const identified = identifyModel(modelsApi, 'delete', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('delete', 'preset', { id: identified.id, name: identified.name });
  }
  if (isLockedModel(identified.model)) {
    return buildActionFailure('delete', 'locked', { id: identified.id, name: identified.name });
  }

  return buildCommandActionResult('delete', modelsApi.deleteById(identified.id || ''), {
    id: identified.id,
    name: identified.name,
  });
}

export function moveSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId,
  dir: SavedModelsMoveDir
): SavedModelsActionResult & { kind: 'move' } {
  const trimmedId = trimId(id);
  if (!trimmedId) return buildActionFailure('move', 'missing-selection', { dir });

  const model = getModelMaybeSafe(modelsApi, trimmedId);
  return buildCommandActionResult('move', modelsApi.move(trimmedId, dir), {
    id: trimmedId,
    name: getModelName(model),
    dir,
  });
}

export function reorderSavedModelsByDnD(
  modelsApi: ModelsServiceLike,
  ids: SavedModelId[],
  dragId: SavedModelId,
  overId: SavedModelId | null,
  pos: SavedModelsDropPos,
  listType: SavedModelsListType
): SavedModelsActionResult | null {
  const plan = buildDnDReorderPlan(ids, dragId, overId, pos);
  if (!plan) return null;

  let lastRes: ModelsCommandResult | null = null;
  for (let index = 0; index < plan.count; index += 1) {
    lastRes = modelsApi.move(dragId, plan.dir);
    if (!(lastRes && lastRes.ok)) break;
  }

  return buildCommandActionResult('reorder', lastRes, {
    id: trimId(dragId),
    dir: plan.dir,
    listType,
  });
}

export function transferSavedModelByDnD(
  modelsApi: ModelsServiceLike,
  dragId: SavedModelId,
  targetList: SavedModelsListType,
  overId: SavedModelId | null,
  pos: SavedModelsDropPos
): SavedModelsActionResult & { kind: 'transfer' } {
  const trimmedId = trimId(dragId);
  if (!trimmedId) return buildActionFailure('transfer', 'missing-selection', { listType: targetList });
  const fn = getTransferFn(modelsApi);
  if (!fn) return buildActionFailure('transfer', 'not-installed', { listType: targetList, id: trimmedId });
  return buildCommandActionResult('transfer', fn(trimmedId, targetList, overId, pos), {
    id: trimmedId,
    listType: targetList,
  });
}

export function findExistingSavedModelByName(
  models: SavedModelLike[],
  wantedName: string
): SavedModelLike | null {
  const normalizedWanted = normalizeModelName(wantedName);
  if (!normalizedWanted) return null;
  for (const model of models) {
    if (!model || isPresetModel(model)) continue;
    if (normalizeModelName(getModelName(model)) === normalizedWanted) return model;
  }
  return null;
}

function getModelMaybeSafe(modelsApi: ModelsServiceLike, id: SavedModelId): SavedModelLike | null {
  try {
    return modelsApi.getById(id);
  } catch {
    return null;
  }
}
