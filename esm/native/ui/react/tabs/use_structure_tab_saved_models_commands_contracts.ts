import type { Dispatch, SetStateAction } from 'react';

import type { SavedModelId, ModelsServiceLike, SavedModelLike } from '../../../../../types';

import type { SavedModelsFeedbackLike } from './structure_tab_saved_models_shared.js';

export type SavedModelsOpenSetter = Dispatch<SetStateAction<boolean>>;

export type SavedModelsCommandHookState = {
  modelsApi: ModelsServiceLike;
  fb: SavedModelsFeedbackLike;
  models: SavedModelLike[];
  presetModels: SavedModelLike[];
  savedModels: SavedModelLike[];
  selectedId: SavedModelId;
  presetModelsOpen: boolean;
  savedModelsOpen: boolean;
  setPresetModelsOpen: SavedModelsOpenSetter;
  setSavedModelsOpen: SavedModelsOpenSetter;
  refresh: () => void;
};

export type UseStructureTabSavedModelsCommandsResult = SavedModelsCommandHookState & {
  setSelected: (id: SavedModelId) => void;
  applySelected: (idOverride?: string) => void;
  saveCurrent: () => Promise<void>;
  overwriteById: (idOverride?: string) => Promise<void>;
  toggleLock: (idOverride?: string) => void;
  deleteById: (idOverride?: string) => Promise<void>;
  deleteSelected: () => Promise<void>;
  moveById: (id: string, dir: 'up' | 'down') => void;
  moveSelected: (dir: 'up' | 'down') => void;
};
