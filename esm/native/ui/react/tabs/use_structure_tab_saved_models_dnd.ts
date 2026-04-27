import { useMemo, useState } from 'react';
import type { Dispatch, DragEvent, SetStateAction } from 'react';

import type { SavedModelId } from '../../../../../types';
import { createSavedModelsDndController } from './structure_tab_saved_models_dnd_controller_runtime.js';
import { createSavedModelsDndEventsController } from './structure_tab_saved_models_dnd_events_controller_runtime.js';
import type {
  SavedModelsDragIndicatorPos,
  SavedModelsFeedbackLike,
  SavedModelsListType,
} from './structure_tab_saved_models_shared.js';

export type UseStructureTabSavedModelsDndArgs = {
  modelsApi: import('../../../../../types').ModelsServiceLike;
  fb: SavedModelsFeedbackLike;
  presetModels: import('../../../../../types').SavedModelLike[];
  savedModels: import('../../../../../types').SavedModelLike[];
  refresh: () => void;
  presetModelsOpen: boolean;
  savedModelsOpen: boolean;
  setPresetModelsOpen: Dispatch<SetStateAction<boolean>>;
  setSavedModelsOpen: Dispatch<SetStateAction<boolean>>;
};

export type UseStructureTabSavedModelsDndResult = {
  draggingModelId: SavedModelId;
  dragOverModelId: SavedModelId | '__empty__' | '__end__' | '';
  dragOverPos: SavedModelsDragIndicatorPos;
  draggingListType: SavedModelsListType | '';
  clearDragState: () => void;
  openListIfClosed: (target: SavedModelsListType) => void;
  handleListDragLeave: () => void;
  handleHeaderDragEnter: (target: SavedModelsListType, event: DragEvent<HTMLElement>) => void;
  handleHeaderDragOver: (target: SavedModelsListType, event: DragEvent<HTMLElement>) => void;
  handleHeaderDrop: (target: SavedModelsListType, event: DragEvent<HTMLElement>) => void;
  handleEmptyZoneDragOver: (event: DragEvent<HTMLElement>) => void;
  handleEmptyZoneDragLeave: () => void;
  handleEmptyZoneDrop: (listType: SavedModelsListType, event: DragEvent<HTMLElement>) => void;
  handleRowDragStart: (id: string, listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
  handleRowDragEnd: () => void;
  handleRowDragOver: (id: string, event: DragEvent<HTMLDivElement>) => void;
  handleRowDrop: (id: string, listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
  handleEndDropZoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
  handleEndDropZoneDrop: (listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
};

export function useStructureTabSavedModelsDnd(
  args: UseStructureTabSavedModelsDndArgs
): UseStructureTabSavedModelsDndResult {
  const [draggingModelId, setDraggingModelId] = useState('');
  const [dragOverModelId, setDragOverModelId] = useState('');
  const [dragOverPos, setDragOverPos] = useState<SavedModelsDragIndicatorPos>('');
  const [draggingListType, setDraggingListType] = useState<SavedModelsListType | ''>('');

  const dndController = useMemo(
    () =>
      createSavedModelsDndController({
        modelsApi: args.modelsApi,
        fb: args.fb,
        presetModels: args.presetModels,
        savedModels: args.savedModels,
        refresh: args.refresh,
        draggingListType,
        presetModelsOpen: args.presetModelsOpen,
        savedModelsOpen: args.savedModelsOpen,
        setPresetModelsOpen: args.setPresetModelsOpen,
        setSavedModelsOpen: args.setSavedModelsOpen,
      }),
    [
      args.fb,
      args.modelsApi,
      args.presetModels,
      args.presetModelsOpen,
      args.refresh,
      args.savedModels,
      args.savedModelsOpen,
      args.setPresetModelsOpen,
      args.setSavedModelsOpen,
      draggingListType,
    ]
  );

  const eventsController = useMemo(
    () =>
      createSavedModelsDndEventsController({
        draggingModelId,
        dragOverModelId,
        dragOverPos,
        setDraggingModelId,
        setDragOverModelId,
        setDragOverPos,
        setDraggingListType,
        commandController: dndController,
      }),
    [draggingModelId, dragOverModelId, dragOverPos, dndController]
  );

  return {
    draggingModelId,
    dragOverModelId,
    dragOverPos,
    draggingListType,
    clearDragState: eventsController.clearDragState,
    openListIfClosed: dndController.openListIfClosed,
    handleListDragLeave: eventsController.handleListDragLeave,
    handleHeaderDragEnter: eventsController.handleHeaderDragEnter,
    handleHeaderDragOver: eventsController.handleHeaderDragOver,
    handleHeaderDrop: eventsController.handleHeaderDrop,
    handleEmptyZoneDragOver: eventsController.handleEmptyZoneDragOver,
    handleEmptyZoneDragLeave: eventsController.handleEmptyZoneDragLeave,
    handleEmptyZoneDrop: eventsController.handleEmptyZoneDrop,
    handleRowDragStart: eventsController.handleRowDragStart,
    handleRowDragEnd: eventsController.handleRowDragEnd,
    handleRowDragOver: eventsController.handleRowDragOver,
    handleRowDrop: eventsController.handleRowDrop,
    handleEndDropZoneDragOver: eventsController.handleEndDropZoneDragOver,
    handleEndDropZoneDrop: eventsController.handleEndDropZoneDrop,
  };
}
