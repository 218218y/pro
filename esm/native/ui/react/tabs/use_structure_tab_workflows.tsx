import { useCallback } from 'react';

import { callDoorsAction } from '../../../services/api.js';
import { enterStructureEditMode, exitStructureEditMode } from './structure_tab_shared.js';
import { runHistoryBatch, setUiFlag } from '../actions/store_actions.js';
import type {
  UseStructureTabWorkflowsArgs,
  UseStructureTabWorkflowsResult,
} from './use_structure_tab_workflows_contracts.js';
import {
  STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID,
  STRUCTURE_CELL_DIMS_MODE_MESSAGE,
} from './use_structure_tab_workflows_shared.js';
import { useStructureTabWorkflowControllers } from './use_structure_tab_workflows_controllers.js';
import { useStructureTabWorkflowControllerEffects } from './use_structure_tab_workflows_effects.js';
import { useStructureTabRenderStackLinkBadge } from './use_structure_tab_workflows_render.js';

export type {
  StructureStackLinkField,
  UseStructureTabWorkflowsArgs,
  UseStructureTabWorkflowsResult,
} from './use_structure_tab_workflows_contracts.js';

export function useStructureTabWorkflows(args: UseStructureTabWorkflowsArgs): UseStructureTabWorkflowsResult {
  const { app, fb, state } = args;
  const { structuralController, workflowController } = useStructureTabWorkflowControllers(args);
  const renderStackLinkBadge = useStructureTabRenderStackLinkBadge(structuralController);

  useStructureTabWorkflowControllerEffects({ workflowController, structuralController });

  const enterCellDimsMode = useCallback(
    (source: string) => {
      enterStructureEditMode({
        app,
        fb,
        modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
        source,
        message: STRUCTURE_CELL_DIMS_MODE_MESSAGE,
      });
    },
    [app, fb, state.cellDimsModeId]
  );

  const exitCellDimsMode = useCallback(
    (source: string) => {
      exitStructureEditMode({
        app,
        modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
        source,
      });
    },
    [app, state.cellDimsModeId]
  );

  const getUpperDoorsCount = useCallback((): number => {
    return Math.max(0, Math.round(Number(state.doors) || 0));
  }, [state.doors]);

  const setLibraryUpperDoorsRemoved = useCallback(
    (upperDoorsCount: number, on: boolean, meta: { source: string; immediate: boolean }) => {
      if (upperDoorsCount <= 0) return;
      if (on) setUiFlag(app, 'removeDoorsEnabled', true, meta);
      for (let doorId = 1; doorId <= upperDoorsCount; doorId += 1) {
        callDoorsAction(app, 'setRemoved', `d${doorId}_full`, !!on, meta);
      }
    },
    [app]
  );

  const toggleLibraryMode = useCallback(() => {
    const wasLibraryMode = !!state.isLibraryMode;
    const shouldHideUpperDoorsInLibrary = !!state.libraryUpperDoorsHidden;
    const upperDoorsCount = getUpperDoorsCount();

    workflowController.toggleLibraryMode();

    if (upperDoorsCount <= 0 || !shouldHideUpperDoorsInLibrary) return;

    const meta = {
      source: wasLibraryMode
        ? 'react:structure:libraryUpperDoors:restoreForRegular'
        : 'react:structure:libraryUpperDoors:applyForLibrary',
      immediate: true,
    };

    runHistoryBatch(
      app,
      () => {
        setUiFlag(app, 'libraryUpperDoorsHidden', true, meta);
        setLibraryUpperDoorsRemoved(upperDoorsCount, !wasLibraryMode, meta);
      },
      meta
    );
  }, [
    app,
    getUpperDoorsCount,
    setLibraryUpperDoorsRemoved,
    state.isLibraryMode,
    state.libraryUpperDoorsHidden,
    workflowController,
  ]);

  const toggleLibraryUpperDoors = useCallback(() => {
    const upperDoorsCount = getUpperDoorsCount();
    if (upperDoorsCount <= 0) return;

    const shouldHideUpperDoors = !state.libraryUpperDoorsHidden;
    const meta = {
      source: shouldHideUpperDoors
        ? 'react:structure:libraryUpperDoors:remove'
        : 'react:structure:libraryUpperDoors:restore',
      immediate: true,
    };

    runHistoryBatch(
      app,
      () => {
        setUiFlag(app, 'libraryUpperDoorsHidden', shouldHideUpperDoors, meta);
        setLibraryUpperDoorsRemoved(upperDoorsCount, shouldHideUpperDoors, meta);
      },
      meta
    );

    try {
      const toast = fb?.toast;
      if (typeof toast === 'function') {
        toast(
          shouldHideUpperDoors ? 'הדלתות העליונות הוסרו' : 'הדלתות העליונות הוחזרו',
          'success'
        );
      }
    } catch {
      // Feedback is best-effort only; the state mutation above is the source of truth.
    }
  }, [app, fb, getUpperDoorsCount, setLibraryUpperDoorsRemoved, state.libraryUpperDoorsHidden]);

  const resetAllCellDimsOverrides = useCallback(() => {
    workflowController.resetAllCellDimsOverrides();
  }, [workflowController]);

  const clearCellDimsWidth = useCallback(() => {
    workflowController.clearCellDimsWidth();
  }, [workflowController]);

  const clearCellDimsHeight = useCallback(() => {
    workflowController.clearCellDimsHeight();
  }, [workflowController]);

  const clearCellDimsDepth = useCallback(() => {
    workflowController.clearCellDimsDepth();
  }, [workflowController]);

  const resetAutoWidth = useCallback(() => {
    workflowController.resetAutoWidth();
  }, [workflowController]);

  return {
    commitStructural: structuralController.commitStructural,
    setRaw: structuralController.setRaw,
    enterCellDimsMode,
    exitCellDimsMode,
    renderStackLinkBadge,
    toggleStackSplit: structuralController.toggleStackSplit,
    toggleLibraryMode,
    toggleLibraryUpperDoors,
    resetAllCellDimsOverrides,
    clearCellDimsWidth,
    clearCellDimsHeight,
    clearCellDimsDepth,
    resetAutoWidth,
    setBaseType: structuralController.setBaseType,
    setBaseLegStyle: structuralController.setBaseLegStyle,
    setBaseLegColor: structuralController.setBaseLegColor,
    setBaseLegHeightCm: structuralController.setBaseLegHeightCm,
    setBaseLegWidthCm: structuralController.setBaseLegWidthCm,
    setSlidingTracksColor: structuralController.setSlidingTracksColor,
  };
}
