import type { SavedModelId } from '../../../../../types';

import { structureTabReportNonFatal } from './structure_tab_shared.js';
import type {
  SavedModelsDragIndicatorPos,
  SavedModelsDropPos,
  SavedModelsListType,
} from './structure_tab_saved_models_shared.js';

export type SavedModelsDndCurrentTargetLike = {
  getBoundingClientRect: () => { top: number; height: number };
};

export type SavedModelsDataTransferLike = Pick<DataTransfer, 'getData' | 'setData' | 'effectAllowed'>;

export type SavedModelsDragEventLike = {
  currentTarget: SavedModelsDndCurrentTargetLike;
  clientY: number;
  dataTransfer?: SavedModelsDataTransferLike | null;
  preventDefault?: (() => void) | null;
  stopPropagation?: (() => void) | null;
};

type SetModelIdState = (value: SavedModelId | ((prev: SavedModelId) => SavedModelId)) => void;
type SetDragOverModelIdState = (
  value:
    | SavedModelId
    | '__empty__'
    | '__end__'
    | ''
    | ((prev: SavedModelId | '__empty__' | '__end__' | '') => SavedModelId | '__empty__' | '__end__' | '')
) => void;
type SetDragOverPosState = (
  value: SavedModelsDragIndicatorPos | ((prev: SavedModelsDragIndicatorPos) => SavedModelsDragIndicatorPos)
) => void;
type SetDraggingListTypeState = (
  value: SavedModelsListType | '' | ((prev: SavedModelsListType | '') => SavedModelsListType | '')
) => void;
type SavedModelsReportNonFatal = (scope: string, err: unknown) => void;

type SavedModelsDndCommandLike = {
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

export type SavedModelsDndEventsController = {
  clearDragState: () => void;
  handleListDragLeave: () => void;
  handleHeaderDragEnter: (target: SavedModelsListType, event: SavedModelsDragEventLike) => void;
  handleHeaderDragOver: (target: SavedModelsListType, event: SavedModelsDragEventLike) => void;
  handleHeaderDrop: (target: SavedModelsListType, event: SavedModelsDragEventLike) => void;
  handleEmptyZoneDragOver: (event: SavedModelsDragEventLike) => void;
  handleEmptyZoneDragLeave: () => void;
  handleEmptyZoneDrop: (listType: SavedModelsListType, event: SavedModelsDragEventLike) => void;
  handleRowDragStart: (
    id: SavedModelId,
    listType: SavedModelsListType,
    event: SavedModelsDragEventLike
  ) => void;
  handleRowDragEnd: () => void;
  handleRowDragOver: (id: SavedModelId, event: SavedModelsDragEventLike) => void;
  handleRowDrop: (id: SavedModelId, listType: SavedModelsListType, event: SavedModelsDragEventLike) => void;
  handleEndDropZoneDragOver: (event: SavedModelsDragEventLike) => void;
  handleEndDropZoneDrop: (listType: SavedModelsListType, event: SavedModelsDragEventLike) => void;
};

export type CreateSavedModelsDndEventsControllerArgs = {
  draggingModelId: SavedModelId;
  dragOverModelId: SavedModelId | '__empty__' | '__end__' | '';
  dragOverPos: SavedModelsDragIndicatorPos;
  setDraggingModelId: SetModelIdState;
  setDragOverModelId: SetDragOverModelIdState;
  setDragOverPos: SetDragOverPosState;
  setDraggingListType: SetDraggingListTypeState;
  commandController: SavedModelsDndCommandLike;
  reportNonFatal?: SavedModelsReportNonFatal;
};

function runEventStep(
  event: { preventDefault?: (() => void) | null; stopPropagation?: (() => void) | null } | null | undefined,
  key: 'preventDefault' | 'stopPropagation'
): void {
  const fn = event?.[key];
  if (typeof fn === 'function') Reflect.apply(fn, event, []);
}

export function resolveSavedModelsDropPos(
  target: SavedModelsDndCurrentTargetLike,
  clientY: number
): Exclude<SavedModelsDropPos, 'end'> {
  const rect = target.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  return clientY < midY ? 'before' : 'after';
}

export function createSavedModelsDndEventsController(
  args: CreateSavedModelsDndEventsControllerArgs
): SavedModelsDndEventsController {
  const {
    draggingModelId,
    dragOverModelId,
    dragOverPos,
    setDraggingModelId,
    setDragOverModelId,
    setDragOverPos,
    setDraggingListType,
    commandController,
    reportNonFatal = structureTabReportNonFatal,
  } = args;

  function clearDragState() {
    setDraggingModelId('');
    setDragOverModelId('');
    setDragOverPos('');
    setDraggingListType('');
  }

  function resolveDraggedId(event: SavedModelsDragEventLike): SavedModelId {
    return commandController.resolveDraggedId(draggingModelId, event.dataTransfer);
  }

  function applyDrop(
    listType: SavedModelsListType,
    dragId: SavedModelId,
    overId: SavedModelId | null,
    pos: SavedModelsDropPos
  ) {
    commandController.applyDrop(listType, dragId, overId, pos);
  }

  return {
    clearDragState,

    handleListDragLeave() {
      setDragOverModelId('');
      setDragOverPos('');
    },

    handleHeaderDragEnter(target: SavedModelsListType, event: SavedModelsDragEventLike) {
      if (!draggingModelId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      commandController.openListIfClosed(target);
    },

    handleHeaderDragOver(target: SavedModelsListType, event: SavedModelsDragEventLike) {
      if (!draggingModelId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      commandController.openListIfClosed(target);
    },

    handleHeaderDrop(target: SavedModelsListType, event: SavedModelsDragEventLike) {
      if (!draggingModelId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const dragId = resolveDraggedId(event);
      if (!dragId) {
        clearDragState();
        return;
      }
      applyDrop(target, dragId, null, 'end');
      clearDragState();
    },

    handleEmptyZoneDragOver(event: SavedModelsDragEventLike) {
      if (!draggingModelId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      if (dragOverModelId !== '__empty__') setDragOverModelId('__empty__');
      if (dragOverPos !== 'after') setDragOverPos('after');
    },

    handleEmptyZoneDragLeave() {
      if (dragOverModelId !== '__empty__') return;
      setDragOverModelId('');
      setDragOverPos('');
    },

    handleEmptyZoneDrop(listType: SavedModelsListType, event: SavedModelsDragEventLike) {
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const dragId = resolveDraggedId(event);
      if (dragId) applyDrop(listType, dragId, null, 'end');
      clearDragState();
    },

    handleRowDragStart(id: SavedModelId, listType: SavedModelsListType, event: SavedModelsDragEventLike) {
      try {
        if (event.dataTransfer) {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', id);
        }
      } catch (err) {
        reportNonFatal('savedModels:dnd:start', err);
      }
      setDraggingModelId(id);
      setDraggingListType(listType);
      setDragOverModelId('');
      setDragOverPos('');
    },

    handleRowDragEnd() {
      clearDragState();
    },

    handleRowDragOver(id: SavedModelId, event: SavedModelsDragEventLike) {
      if (!draggingModelId || draggingModelId === id) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const pos = resolveSavedModelsDropPos(event.currentTarget, event.clientY);
      if (dragOverModelId !== id) setDragOverModelId(id);
      if (dragOverPos !== pos) setDragOverPos(pos);
    },

    handleRowDrop(id: SavedModelId, listType: SavedModelsListType, event: SavedModelsDragEventLike) {
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const dragId = resolveDraggedId(event);
      if (dragId && dragId !== id) {
        const pos = resolveSavedModelsDropPos(event.currentTarget, event.clientY);
        applyDrop(listType, dragId, id, pos);
      }
      clearDragState();
    },

    handleEndDropZoneDragOver(event: SavedModelsDragEventLike) {
      if (!draggingModelId) return;
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      if (dragOverModelId !== '__end__') setDragOverModelId('__end__');
      if (dragOverPos !== 'after') setDragOverPos('after');
    },

    handleEndDropZoneDrop(listType: SavedModelsListType, event: SavedModelsDragEventLike) {
      runEventStep(event, 'preventDefault');
      runEventStep(event, 'stopPropagation');
      const dragId = resolveDraggedId(event);
      if (dragId) applyDrop(listType, dragId, null, 'end');
      clearDragState();
    },
  };
}
