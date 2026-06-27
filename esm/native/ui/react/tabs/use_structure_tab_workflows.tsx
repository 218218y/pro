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
  STRUCTURE_HEX_CELL_DIMS_MODE_MESSAGE,
} from './use_structure_tab_workflows_shared.js';
import { useStructureTabWorkflowControllers } from './use_structure_tab_workflows_controllers.js';
import { useStructureTabWorkflowControllerEffects } from './use_structure_tab_workflows_effects.js';
import { useStructureTabRenderStackLinkBadge } from './use_structure_tab_workflows_render.js';
import { enterStructureLibraryGlassEditMode } from './structure_tab_library_glass_edit.js';

export type {
  StructureStackLinkField,
  UseStructureTabWorkflowsArgs,
  UseStructureTabWorkflowsResult,
} from './use_structure_tab_workflows_contracts.js';

export function useStructureTabWorkflows(args: UseStructureTabWorkflowsArgs): UseStructureTabWorkflowsResult {
  const { app, fb, meta, state } = args;
  const { structuralController, workflowController } = useStructureTabWorkflowControllers(args);
  const renderStackLinkBadge = useStructureTabRenderStackLinkBadge(structuralController);

  useStructureTabWorkflowControllerEffects({ workflowController, structuralController });

  const enterCellDimsMode = useCallback(
    (source: string) => {
      const actionMeta = meta.uiOnlyImmediate(`${source}:panelOpen`);
      setUiFlag(app, 'cellDimsPanelOpen', true, actionMeta);
      workflowController.setCellDimsHexMode(false);
      enterStructureEditMode({
        app,
        fb,
        modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
        source,
        message: STRUCTURE_CELL_DIMS_MODE_MESSAGE,
      });
    },
    [app, fb, meta, state.cellDimsModeId, workflowController]
  );

  const exitCellDimsMode = useCallback(
    (source: string) => {
      const actionMeta = meta.uiOnlyImmediate(`${source}:panelClose`);
      setUiFlag(app, 'cellDimsPanelOpen', false, actionMeta);
      setUiFlag(app, 'cellDimsHexPanelOpen', false, actionMeta);
      workflowController.setCellDimsHexMode(false);
      if (state.cellDimsEditActive) {
        exitStructureEditMode({
          app,
          modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
          source,
        });
      }
    },
    [app, meta, state.cellDimsEditActive, state.cellDimsModeId, workflowController]
  );

  const enterHexCellDimsMode = useCallback(
    (source: string) => {
      const actionMeta = meta.uiOnlyImmediate(`${source}:panelOpen`);
      setUiFlag(app, 'cellDimsPanelOpen', true, actionMeta);
      setUiFlag(app, 'cellDimsHexPanelOpen', true, actionMeta);
      workflowController.setCellDimsHexMode(true);
      enterStructureEditMode({
        app,
        fb,
        modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
        source,
        message: STRUCTURE_HEX_CELL_DIMS_MODE_MESSAGE,
      });
    },
    [app, fb, meta, state.cellDimsModeId, workflowController]
  );

  const exitHexCellDimsMode = useCallback(
    (source: string) => {
      setUiFlag(app, 'cellDimsHexPanelOpen', false, meta.uiOnlyImmediate(`${source}:panelClose`));
      workflowController.setCellDimsHexMode(false);
    },
    [app, meta, workflowController]
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
    if (state.wardrobeType !== 'sliding' && Number(state.doors) === 0) return;

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
    state.doors,
    state.isLibraryMode,
    state.libraryUpperDoorsHidden,
    state.wardrobeType,
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
        toast(shouldHideUpperDoors ? 'הדלתות העליונות הוסרו' : 'הדלתות העליונות הוחזרו', 'success');
      }
    } catch {
      // Feedback is best-effort only; the state mutation above is the source of truth.
    }
  }, [app, fb, getUpperDoorsCount, setLibraryUpperDoorsRemoved, state.libraryUpperDoorsHidden]);

  const pickLibraryGlass = useCallback(
    (paintId: string) => {
      enterStructureLibraryGlassEditMode({ app, fb, paintId });
    },
    [app, fb]
  );

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

  const clearCellDimsHexProtrusion = useCallback(() => {
    workflowController.clearCellDimsHexProtrusion();
  }, [workflowController]);

  const clearCellDimsHexDoorWidth = useCallback(() => {
    workflowController.clearCellDimsHexDoorWidth();
  }, [workflowController]);

  const resetAutoWidth = useCallback(() => {
    workflowController.resetAutoWidth();
  }, [workflowController]);

  return {
    commitStructural: structuralController.commitStructural,
    setRaw: structuralController.setRaw,
    enterCellDimsMode,
    exitCellDimsMode,
    enterHexCellDimsMode,
    exitHexCellDimsMode,
    renderStackLinkBadge,
    toggleStackSplit: structuralController.toggleStackSplit,
    toggleStackSplitDecorativeSeparator: structuralController.toggleStackSplitDecorativeSeparator,
    toggleLibraryMode,
    toggleLibraryUpperDoors,
    pickLibraryGlass,
    resetAllCellDimsOverrides,
    clearCellDimsWidth,
    clearCellDimsHeight,
    clearCellDimsDepth,
    clearCellDimsHexProtrusion,
    clearCellDimsHexDoorWidth,
    resetAutoWidth,
    setBaseType: structuralController.setBaseType,
    setBaseLegStyle: structuralController.setBaseLegStyle,
    setBaseLegColor: structuralController.setBaseLegColor,
    setBaseLegPlatformMode: structuralController.setBaseLegPlatformMode,
    setBaseLegPlatformSideMode: structuralController.setBaseLegPlatformSideMode,
    setBaseLegPlatformSideOverhangCm: structuralController.setBaseLegPlatformSideOverhangCm,
    setBaseLegPlatformFrontOverhangCm: structuralController.setBaseLegPlatformFrontOverhangCm,
    setStackSplitDecorativeSeparatorSideOverhangCm:
      structuralController.setStackSplitDecorativeSeparatorSideOverhangCm,
    setStackSplitDecorativeSeparatorFrontOverhangCm:
      structuralController.setStackSplitDecorativeSeparatorFrontOverhangCm,
    setBasePlinthHeightCm: structuralController.setBasePlinthHeightCm,
    setBaseLegHeightCm: structuralController.setBaseLegHeightCm,
    setBaseLegWidthCm: structuralController.setBaseLegWidthCm,
    setSlidingTracksColor: structuralController.setSlidingTracksColor,
  };
}
