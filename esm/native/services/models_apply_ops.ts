// Internal mutation/apply helpers for the Saved Models service.
// Keeps heavy command policy out of the canonical owner `models.ts`.

import type {
  AppContainer,
  ModelsCommandResult,
  ModelsDeleteTemporaryResult,
  ModelsLockResult,
  ModelsMoveDirection,
  ModelsSaveResult,
  ModelsTransferPosition,
  ModelsTransferTargetList,
  SavedModelId,
  SavedModelName,
} from '../../../types';

import { applyModelInternalImpl } from './models_apply_load_ops.js';
import {
  deleteModelByIdInternalImpl,
  deleteTemporaryUserModelsInternalImpl,
  moveModelInternalImpl,
  setModelLockedInternalImpl,
} from './models_apply_list_ops.js';
import {
  overwriteModelFromCurrentInternalImpl,
  saveCurrentModelInternalImpl,
} from './models_apply_snapshot_ops.js';
import { transferModelInternalImpl } from './models_apply_transfer_ops.js';

export function saveCurrentModelInternal(App: AppContainer, name: SavedModelName): ModelsSaveResult {
  return saveCurrentModelInternalImpl(App, name);
}

export function overwriteModelFromCurrentInternal(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return overwriteModelFromCurrentInternalImpl(App, id);
}

export function deleteModelByIdInternal(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return deleteModelByIdInternalImpl(App, id);
}

export function setModelLockedInternal(
  App: AppContainer,
  id: SavedModelId,
  locked: boolean
): ModelsLockResult {
  return setModelLockedInternalImpl(App, id, locked);
}

export function deleteTemporaryUserModelsInternal(App: AppContainer): ModelsDeleteTemporaryResult {
  return deleteTemporaryUserModelsInternalImpl(App);
}

export function moveModelInternal(
  App: AppContainer,
  id: SavedModelId,
  direction: ModelsMoveDirection
): ModelsCommandResult {
  return moveModelInternalImpl(App, id, direction);
}

export function transferModelInternal(
  App: AppContainer,
  id: SavedModelId,
  targetList: ModelsTransferTargetList,
  overId: SavedModelId | null,
  pos: ModelsTransferPosition
): ModelsCommandResult {
  return transferModelInternalImpl(App, id, targetList, overId, pos);
}

export function applyModelInternal(App: AppContainer, id: SavedModelId): ModelsCommandResult {
  return applyModelInternalImpl(App, id);
}
