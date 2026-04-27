import type { CSSProperties, DragEvent } from 'react';

import type { SavedModelId, SavedModelLike } from '../../../../../types';
import type {
  SavedModelsDragIndicatorPos,
  SavedModelsListType,
} from './structure_tab_saved_models_shared.js';

export type StructureTabSavedModelsListProps = {
  list: SavedModelLike[];
  listType: SavedModelsListType;
  emptyText: string;
  selectedId: SavedModelId;
  draggingModelId: SavedModelId;
  dragOverModelId: SavedModelId | '__empty__' | '__end__' | '';
  dragOverPos: SavedModelsDragIndicatorPos;
  onSetSelected: (id: SavedModelId) => void;
  onApplySelected: (id?: string) => void;
  onToggleLock: (id?: string) => void;
  onOverwriteById: (id?: string) => void;
  onDeleteById: (id?: string) => void;
  onListDragLeave: () => void;
  onEmptyZoneDragOver: (event: DragEvent<HTMLElement>) => void;
  onEmptyZoneDragLeave: () => void;
  onEmptyZoneDrop: (listType: SavedModelsListType, event: DragEvent<HTMLElement>) => void;
  onRowDragStart: (id: string, listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
  onRowDragEnd: () => void;
  onRowDragOver: (id: string, event: DragEvent<HTMLDivElement>) => void;
  onRowDrop: (id: string, listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
  onEndDropZoneDragOver: (event: DragEvent<HTMLDivElement>) => void;
  onEndDropZoneDrop: (listType: SavedModelsListType, event: DragEvent<HTMLDivElement>) => void;
};

export type SavedModelsListRowModel = {
  id: string;
  name: string;
  preset: boolean;
  locked: boolean;
  canDrag: boolean;
  canOverwrite: boolean;
  isDragging: boolean;
  isOver: boolean;
};

export const SAVED_MODELS_LIST_WRAP_STYLE: Readonly<CSSProperties> = {
  marginTop: 0,
  marginBottom: 10,
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  background: '#ffffff',
  overflow: 'hidden',
};

export const SAVED_MODELS_LIST_STYLE: Readonly<CSSProperties> = {
  overflow: 'auto',
  maxHeight: 210,
};
