import type { ModelsServiceLike, SavedModelId, SavedModelLike } from '../../../../../types';

import { reportSavedModelsActionResult } from './structure_tab_saved_models_action_feedback.js';
import {
  reorderSavedModelsByDnD,
  transferSavedModelByDnD,
} from './structure_tab_saved_models_command_flows.js';
import { getDragIdFromDataTransfer, getModelId } from './structure_tab_saved_models_shared.js';
import type {
  SavedModelsDropPos,
  SavedModelsFeedbackLike,
  SavedModelsListType,
} from './structure_tab_saved_models_shared.js';

export type SavedModelsDndController = {
  openListIfClosed: (target: SavedModelsListType) => void;
  resolveDraggedId: (
    draggingModelId: SavedModelId,
    dataTransfer?: Pick<DataTransfer, 'getData'> | null
  ) => SavedModelId;
  applyDrop: (
    listType: SavedModelsListType,
    dragId: SavedModelId,
    overId: SavedModelId | null,
    pos: SavedModelsDropPos
  ) => void;
};

type SavedModelsOpenSetter = (value: boolean | ((prev: boolean) => boolean)) => void;

export type CreateSavedModelsDndControllerArgs = {
  modelsApi: ModelsServiceLike;
  fb: SavedModelsFeedbackLike;
  presetModels: SavedModelLike[];
  savedModels: SavedModelLike[];
  refresh: () => void;
  draggingListType: SavedModelsListType | '';
  presetModelsOpen: boolean;
  savedModelsOpen: boolean;
  setPresetModelsOpen: SavedModelsOpenSetter;
  setSavedModelsOpen: SavedModelsOpenSetter;
};

function readModelIds(models: SavedModelLike[]): SavedModelId[] {
  return models.map(model => getModelId(model));
}

export function createSavedModelsDndController(
  args: CreateSavedModelsDndControllerArgs
): SavedModelsDndController {
  const {
    modelsApi,
    fb,
    presetModels,
    savedModels,
    refresh,
    draggingListType,
    presetModelsOpen,
    savedModelsOpen,
    setPresetModelsOpen,
    setSavedModelsOpen,
  } = args;

  function reorderWithinList(
    ids: SavedModelId[],
    dragId: SavedModelId,
    overId: SavedModelId | null,
    pos: SavedModelsDropPos,
    listType: SavedModelsListType
  ) {
    const result = reorderSavedModelsByDnD(modelsApi, ids, dragId, overId, pos, listType);
    if (!result) return;
    reportSavedModelsActionResult(fb, result);
  }

  function transferByDnD(
    dragId: SavedModelId,
    targetList: SavedModelsListType,
    overId: SavedModelId | null,
    pos: SavedModelsDropPos
  ) {
    const result = transferSavedModelByDnD(modelsApi, dragId, targetList, overId, pos);
    if (result.ok) refresh();
    reportSavedModelsActionResult(fb, result);
  }

  return {
    openListIfClosed(target: SavedModelsListType) {
      if (target === 'preset') {
        if (!presetModelsOpen) setPresetModelsOpen(true);
        return;
      }
      if (!savedModelsOpen) setSavedModelsOpen(true);
    },

    resolveDraggedId(draggingModelId: SavedModelId, dataTransfer?: Pick<DataTransfer, 'getData'> | null) {
      return String(draggingModelId || getDragIdFromDataTransfer(dataTransfer)).trim();
    },

    applyDrop(
      listType: SavedModelsListType,
      dragId: SavedModelId,
      overId: SavedModelId | null,
      pos: SavedModelsDropPos
    ) {
      if (!dragId) return;
      if (draggingListType && draggingListType !== listType) {
        transferByDnD(dragId, listType, overId, pos);
        return;
      }
      if (listType === 'preset') {
        reorderWithinList(readModelIds(presetModels), dragId, overId, pos, 'preset');
        return;
      }
      reorderWithinList(readModelIds(savedModels), dragId, overId, pos, 'saved');
    },
  };
}
