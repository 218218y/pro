import { useMemo } from 'react';

import { createStructureTabLibraryEnv, mergeUiOverride } from './structure_tab_library_helpers.js';
import { createLibraryPresetController } from '../../../features/library_preset/library_preset.js';
import { createStructureTabWorkflowController } from './structure_tab_workflows_controller_runtime.js';
import { createStructureTabStructuralController } from './structure_tab_structural_controller_runtime.js';
import type { UseStructureTabWorkflowsArgs } from './use_structure_tab_workflows_contracts.js';
import {
  createStructureWorkflowOps,
  createStructureWorkflowState,
} from './use_structure_tab_workflows_shared.js';

export function useStructureTabWorkflowControllers(args: UseStructureTabWorkflowsArgs): {
  structuralController: ReturnType<typeof createStructureTabStructuralController>;
  workflowController: ReturnType<typeof createStructureTabWorkflowController>;
} {
  const { app, meta, fb, state, setHingeDirection } = args;
  const libraryEnv = useMemo(() => createStructureTabLibraryEnv(app, meta), [app, meta]);
  const libraryPreset = useMemo(() => createLibraryPresetController(), []);
  const workflowState = useMemo(() => createStructureWorkflowState(state), [state]);
  const workflowOps = useMemo(() => createStructureWorkflowOps(app, meta), [app, meta]);

  const structuralController = useMemo(
    () =>
      createStructureTabStructuralController({
        app,
        meta,
        wardrobeType: state.wardrobeType,
        isChestMode: state.isChestMode,
        isManualWidth: state.isManualWidth,
        width: state.width,
        height: state.height,
        depth: state.depth,
        doors: state.doors,
        structureSelectRaw: state.structureSelectRaw,
        singleDoorPosRaw: state.singleDoorPosRaw,
        shouldShowSingleDoor: state.shouldShowSingleDoor,
        shouldShowHingeBtn: state.shouldShowHingeBtn,
        hingeDirection: state.hingeDirection,
        stackSplitEnabled: state.stackSplitEnabled,
        stackSplitDecorativeSeparatorEnabled: state.stackSplitDecorativeSeparatorEnabled,
        stackSplitLowerHeight: state.stackSplitLowerHeight,
        stackSplitLowerDepth: state.stackSplitLowerDepth,
        stackSplitLowerWidth: state.stackSplitLowerWidth,
        stackSplitLowerDoors: state.stackSplitLowerDoors,
        stackSplitLowerDepthManual: state.stackSplitLowerDepthManual,
        stackSplitLowerWidthManual: state.stackSplitLowerWidthManual,
        stackSplitLowerDoorsManual: state.stackSplitLowerDoorsManual,
        onSetHingeDirection: setHingeDirection,
      }),
    [
      app,
      meta,
      state.wardrobeType,
      state.isChestMode,
      state.isManualWidth,
      state.width,
      state.height,
      state.depth,
      state.doors,
      state.structureSelectRaw,
      state.singleDoorPosRaw,
      state.shouldShowSingleDoor,
      state.shouldShowHingeBtn,
      state.hingeDirection,
      state.stackSplitEnabled,
      state.stackSplitDecorativeSeparatorEnabled,
      state.stackSplitLowerHeight,
      state.stackSplitLowerDepth,
      state.stackSplitLowerWidth,
      state.stackSplitLowerDoors,
      state.stackSplitLowerDepthManual,
      state.stackSplitLowerWidthManual,
      state.stackSplitLowerDoorsManual,
      setHingeDirection,
    ]
  );

  const workflowController = useMemo(
    () =>
      createStructureTabWorkflowController({
        fb,
        libraryEnv,
        libraryPreset,
        state: workflowState,
        mergeUiOverride,
        ops: workflowOps,
      }),
    [fb, libraryEnv, libraryPreset, workflowState, workflowOps]
  );

  return { structuralController, workflowController };
}
