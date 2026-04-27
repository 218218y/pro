import type { ModelsServiceLike, SavedModelId, SavedModelLike } from '../../../../../types';

import { getModelId } from './structure_tab_saved_models_shared.js';
import type { SavedModelsFeedbackLike, SavedModelsMoveDir } from './structure_tab_saved_models_shared.js';

export type SavedModelsCommandController = {
  applySelected: (idOverride?: string) => void;
  saveCurrent: () => Promise<void>;
  overwriteById: (idOverride?: string) => Promise<void>;
  toggleLock: (idOverride?: string) => void;
  deleteById: (idOverride?: string) => Promise<void>;
  moveById: (id: string, dir: SavedModelsMoveDir) => void;
  moveSelected: (dir: SavedModelsMoveDir) => void;
};

export type CreateSavedModelsCommandControllerArgs = {
  fb: SavedModelsFeedbackLike;
  modelsApi: ModelsServiceLike;
  models: SavedModelLike[];
  selectedId: SavedModelId;
  setSelected: (id: SavedModelId) => void;
};

export function resolveCommandTargetId(selectedId: SavedModelId, idOverride?: string): SavedModelId {
  return String(idOverride === null || idOverride === undefined ? selectedId : idOverride || '').trim();
}

export function syncSelectedSavedModelId(models: SavedModelLike[], selectedId: SavedModelId): SavedModelId {
  const trimmedId = String(selectedId || '').trim();
  if (!trimmedId) return '';
  return models.some(model => getModelId(model) === trimmedId) ? trimmedId : '';
}
