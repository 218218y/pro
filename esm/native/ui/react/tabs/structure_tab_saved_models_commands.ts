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

export async function saveCurrentModelByName(
  modelsApi: ModelsServiceLike,
  name: string
): Promise<SavedModelsActionResult & { kind: 'save' }> {
  const trimmedName = trimName(name);
  if (!trimmedName) return buildActionFailure('save', 'cancelled');

  const res = await modelsApi.saveCurrent(trimmedName);
  return buildCommandActionResult('save', res, {
    id: trimId(res?.id),
    name: trimmedName,
  });
}

export async function overwriteSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): Promise<SavedModelsActionResult & { kind: 'overwrite' }> {
  const identified = identifyModel(modelsApi, 'overwrite', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('overwrite', 'preset', { id: identified.id, name: identified.name });
  }
  if (isLockedModel(identified.model)) {
    return buildActionFailure('overwrite', 'locked', { id: identified.id, name: identified.name });
  }

  return buildCommandActionResult('overwrite', await modelsApi.overwriteFromCurrent(identified.id || ''), {
    id: identified.id,
    name: identified.name,
  });
}

export async function toggleSavedModelLock(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): Promise<SavedModelsActionResult & { kind: 'toggle-lock' }> {
  const identified = identifyModel(modelsApi, 'toggle-lock', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('toggle-lock', 'preset', { id: identified.id, name: identified.name });
  }

  const wantLocked = !isLockedModel(identified.model);
  const res = await modelsApi.setLocked(identified.id || '', wantLocked);
  return buildCommandActionResult('toggle-lock', res, {
    id: identified.id,
    name: identified.name,
    locked: res?.ok ? !!res.locked : wantLocked,
  });
}

export async function deleteSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId
): Promise<SavedModelsActionResult & { kind: 'delete' }> {
  const identified = identifyModel(modelsApi, 'delete', id);
  if (!identified.ok) return identified;
  if (isPresetModel(identified.model)) {
    return buildActionFailure('delete', 'preset', { id: identified.id, name: identified.name });
  }
  if (isLockedModel(identified.model)) {
    return buildActionFailure('delete', 'locked', { id: identified.id, name: identified.name });
  }

  return buildCommandActionResult('delete', await modelsApi.deleteById(identified.id || ''), {
    id: identified.id,
    name: identified.name,
  });
}

export async function moveSavedModel(
  modelsApi: ModelsServiceLike,
  id: SavedModelId,
  dir: SavedModelsMoveDir
): Promise<SavedModelsActionResult & { kind: 'move' }> {
  const trimmedId = trimId(id);
  if (!trimmedId) return buildActionFailure('move', 'missing-selection', { dir });

  const model = getModelMaybeSafe(modelsApi, trimmedId);
  return buildCommandActionResult('move', await modelsApi.move(trimmedId, dir), {
    id: trimmedId,
    name: getModelName(model),
    dir,
  });
}

export async function reorderSavedModelsByDnD(
  modelsApi: ModelsServiceLike,
  ids: SavedModelId[],
  dragId: SavedModelId,
  overId: SavedModelId | null,
  pos: SavedModelsDropPos,
  listType: SavedModelsListType
): Promise<SavedModelsActionResult | null> {
  const plan = buildDnDReorderPlan(ids, dragId, overId, pos);
  if (!plan) return null;

  let lastRes: ModelsCommandResult | null = null;
  for (let index = 0; index < plan.count; index += 1) {
    lastRes = await modelsApi.move(dragId, plan.dir);
    if (!(lastRes && lastRes.ok)) break;
  }

  return buildCommandActionResult('reorder', lastRes, {
    id: trimId(dragId),
    dir: plan.dir,
    listType,
  });
}

export async function transferSavedModelByDnD(
  modelsApi: ModelsServiceLike,
  dragId: SavedModelId,
  targetList: SavedModelsListType,
  overId: SavedModelId | null,
  pos: SavedModelsDropPos
): Promise<SavedModelsActionResult & { kind: 'transfer' }> {
  const trimmedId = trimId(dragId);
  if (!trimmedId) return buildActionFailure('transfer', 'missing-selection', { listType: targetList });
  const fn = getTransferFn(modelsApi);
  if (!fn) return buildActionFailure('transfer', 'not-installed', { listType: targetList, id: trimmedId });
  return buildCommandActionResult('transfer', await fn(trimmedId, targetList, overId, pos), {
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
