import { useCallback, useMemo, useState } from 'react';
import type { DragEvent } from 'react';

import {
  createDesignTabSavedSwatchesController,
  resolveSelectedSavedColor,
} from './design_tab_saved_swatches_controller_runtime.js';
import { createDesignTabSavedSwatchesDndController } from './design_tab_saved_swatches_dnd_controller_runtime.js';
import type { DesignTabSwatchDropPos } from './design_tab_shared.js';
import type {
  DesignTabSavedSwatchesModel,
  UseDesignTabSavedSwatchesArgs,
} from './design_tab_color_manager_shared.js';
import type { SavedColor } from './design_tab_multicolor_panel.js';

export function useDesignTabSavedSwatches(args: UseDesignTabSavedSwatchesArgs): DesignTabSavedSwatchesModel {
  const { app, colorChoice, feedback, savedColors, orderedSwatches, applyColorChoice } = args;
  const canReorderColorSwatches = orderedSwatches.length >= 2;

  const [draggingColorId, setDraggingColorId] = useState('');
  const [dragOverColorId, setDragOverColorId] = useState('');
  const [dragOverColorPos, setDragOverColorPos] = useState<DesignTabSwatchDropPos>('');

  const selectedCustom = useMemo(
    () => resolveSelectedSavedColor(savedColors, colorChoice),
    [colorChoice, savedColors]
  );

  const commandController = useMemo(
    () =>
      createDesignTabSavedSwatchesController({
        app,
        feedback,
        savedColors,
        orderedSwatches,
        colorChoice,
        applyColorChoice,
      }),
    [app, applyColorChoice, colorChoice, feedback, orderedSwatches, savedColors]
  );

  const dndController = useMemo(
    () =>
      createDesignTabSavedSwatchesDndController({
        canReorderColorSwatches,
        draggingColorId,
        dragOverColorId,
        dragOverColorPos,
        setDraggingColorId,
        setDragOverColorId,
        setDragOverColorPos,
        reorderByDnD: commandController.reorderByDnD,
      }),
    [
      canReorderColorSwatches,
      draggingColorId,
      dragOverColorId,
      dragOverColorPos,
      commandController,
      setDraggingColorId,
      setDragOverColorId,
      setDragOverColorPos,
    ]
  );

  const onPickSwatch = useCallback(
    (color: SavedColor) => {
      const id = String(color.id || '');
      if (id.indexOf('saved_') === 0) {
        applyColorChoice(id, 'react:design:palette:saved');
        return;
      }
      applyColorChoice(String(color.value || ''), 'react:design:palette:default');
    },
    [applyColorChoice]
  );

  const onSwatchRowDragLeave = useCallback(() => {
    dndController.handleRowDragLeave();
  }, [dndController]);

  const onSwatchDragStart = useCallback(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      dndController.handleDragStart(id, event);
    },
    [dndController]
  );

  const onSwatchDragEnd = useCallback(() => {
    dndController.handleDragEnd();
  }, [dndController]);

  const onSwatchDragOver = useCallback(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      dndController.handleDragOver(id, event);
    },
    [dndController]
  );

  const onSwatchDrop = useCallback(
    (id: string, event: DragEvent<HTMLDivElement>) => {
      dndController.handleDrop(id, event);
    },
    [dndController]
  );

  const onSwatchEndDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      dndController.handleEndDragOver(event);
    },
    [dndController]
  );

  const onSwatchEndDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      dndController.handleEndDrop(event);
    },
    [dndController]
  );

  const toggleSelectedColorLock = useCallback(() => {
    commandController.toggleSelectedLock(selectedCustom);
  }, [commandController, selectedCustom]);

  const toggleColorLockById = useCallback(
    (id: string) => {
      commandController.toggleLockById(id);
    },
    [commandController]
  );

  const deleteSelectedColor = useCallback(() => {
    void commandController.deleteSelected(selectedCustom);
  }, [commandController, selectedCustom]);

  return {
    selectedCustom,
    canReorderColorSwatches,
    draggingColorId,
    dragOverColorId,
    dragOverColorPos,
    onPickSwatch,
    onSwatchRowDragLeave,
    onSwatchDragStart,
    onSwatchDragEnd,
    onSwatchDragOver,
    onSwatchDrop,
    onSwatchEndDragOver,
    onSwatchEndDrop,
    toggleSelectedColorLock,
    toggleColorLockById,
    deleteSelectedColor,
  };
}
