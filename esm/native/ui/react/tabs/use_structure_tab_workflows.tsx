import { useCallback } from 'react';

import { enterStructureEditMode, exitStructureEditMode } from './structure_tab_shared.js';
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

  const toggleLibraryMode = useCallback(() => {
    workflowController.toggleLibraryMode();
  }, [workflowController]);

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
