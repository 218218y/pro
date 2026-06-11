import { useCallback, useMemo } from 'react';

import {
  commitStructureRawValue,
  enterStructureEditMode,
  exitStructureEditMode,
} from './structure_tab_shared.js';
import type {
  DisplayedValueReader,
  StructureTabNumericKey,
} from './structure_tab_structure_mutations_shared.js';
import { readUiRawNumberFromApp } from './structure_tab_structural_controller_shared.js';
import { createStructureTabWorkflowCellDimsApi } from './structure_tab_workflows_controller_cell_dims.js';
import {
  createStructureWorkflowOps,
  createStructureWorkflowState,
  STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID,
  STRUCTURE_CELL_DIMS_MODE_MESSAGE,
  STRUCTURE_HEX_CELL_DIMS_MODE_MESSAGE,
} from './use_structure_tab_workflows_shared.js';
import type { StructureCellDimsControlsProps } from './structure_tab_dimensions_section_cell_dims.js';
import type { StructureTabViewState } from './use_structure_tab_view_state_contracts.js';
import { useApp, useMeta, useUiFeedback } from '../hooks.js';
import { setUiFlag } from '../actions/store_actions.js';

type UseStructureCellDimsControlsPropsArgs = {
  state: StructureTabViewState;
  sourcePrefix?: string;
  editModeMessage?: string;
  hexModeMessage?: string;
};

function readDisplayedStructureValue(
  app: ReturnType<typeof useApp>,
  state: StructureTabViewState,
  key: StructureTabNumericKey
): number {
  switch (key) {
    case 'width':
      return Number(state.width) || 0;
    case 'height':
      return Number(state.height) || 0;
    case 'depth':
      return Number(state.depth) || 0;
    case 'doors':
      return Number(state.doors) || 0;
    case 'stackSplitLowerHeight':
      return Number(state.stackSplitLowerHeight) || 0;
    case 'stackSplitLowerDepth':
      return Number(state.stackSplitLowerDepth) || 0;
    case 'stackSplitLowerWidth':
      return Number(state.stackSplitLowerWidth) || 0;
    case 'stackSplitLowerDoors':
      return Number(state.stackSplitLowerDoors) || 0;
    case 'cellDimsWidth':
    case 'cellDimsHeight':
    case 'cellDimsDepth':
    case 'cellDimsHexProtrusion':
    case 'cellDimsHexDoorWidth':
      return readUiRawNumberFromApp(app, key);
    default:
      return 0;
  }
}

export function useStructureCellDimsControlsProps(
  args: UseStructureCellDimsControlsPropsArgs
): StructureCellDimsControlsProps {
  const { state } = args;
  const app = useApp();
  const meta = useMeta();
  const fb = useUiFeedback();
  const sourcePrefix = args.sourcePrefix || 'react:structure:cellDims';
  const editModeMessage = args.editModeMessage || STRUCTURE_CELL_DIMS_MODE_MESSAGE;
  const hexModeMessage = args.hexModeMessage || STRUCTURE_HEX_CELL_DIMS_MODE_MESSAGE;

  const workflowState = useMemo(() => createStructureWorkflowState(state), [state]);
  const workflowOps = useMemo(() => createStructureWorkflowOps(app, meta), [app, meta]);
  const cellDimsWorkflow = useMemo(
    () => createStructureTabWorkflowCellDimsApi({ fb, ops: workflowOps, state: workflowState }),
    [fb, workflowOps, workflowState]
  );

  const getDisplayedRawValue: DisplayedValueReader = useCallback(
    key => readDisplayedStructureValue(app, state, key),
    [app, state]
  );

  const onSetRaw = useCallback(
    (key: StructureTabNumericKey, nextValue: number) => {
      commitStructureRawValue({
        app,
        meta,
        key,
        nextValue,
        getDisplayedRawValue,
        wardrobeType: state.wardrobeType,
        isChestMode: state.isChestMode,
        isManualWidth: state.isManualWidth,
        width: state.width,
        height: state.height,
        depth: state.depth,
        doors: state.doors,
        structureSelectRaw: state.structureSelectRaw,
        singleDoorPosRaw: state.singleDoorPosRaw,
        chestCommodeEnabled: state.chestCommodeEnabled,
        chestCommodeMirrorWidthManual: state.chestCommodeMirrorWidthManual,
      });
    },
    [app, getDisplayedRawValue, meta, state]
  );

  const onEnterCellDimsMode = useCallback(() => {
    const source = `${sourcePrefix}:on`;
    setUiFlag(app, 'cellDimsPanelOpen', true, meta.uiOnlyImmediate(`${source}:panelOpen`));
    cellDimsWorkflow.setCellDimsHexMode(false);
    enterStructureEditMode({
      app,
      fb,
      modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
      source,
      message: editModeMessage,
    });
  }, [app, cellDimsWorkflow, editModeMessage, fb, meta, sourcePrefix, state.cellDimsModeId]);

  const onExitCellDimsMode = useCallback(() => {
    const source = `${sourcePrefix}:off`;
    const actionMeta = meta.uiOnlyImmediate(`${source}:panelClose`);
    setUiFlag(app, 'cellDimsPanelOpen', false, actionMeta);
    setUiFlag(app, 'cellDimsHexPanelOpen', false, actionMeta);
    cellDimsWorkflow.setCellDimsHexMode(false);
    if (state.cellDimsEditActive) {
      exitStructureEditMode({
        app,
        modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
        source,
      });
    }
  }, [app, cellDimsWorkflow, meta, sourcePrefix, state.cellDimsEditActive, state.cellDimsModeId]);

  const onEnterHexCellDimsMode = useCallback(() => {
    const source = `${sourcePrefix}Hex:on`;
    const actionMeta = meta.uiOnlyImmediate(`${source}:panelOpen`);
    setUiFlag(app, 'cellDimsPanelOpen', true, actionMeta);
    setUiFlag(app, 'cellDimsHexPanelOpen', true, actionMeta);
    cellDimsWorkflow.setCellDimsHexMode(true);
    enterStructureEditMode({
      app,
      fb,
      modeId: String(state.cellDimsModeId || STRUCTURE_CELL_DIMS_MODE_FALLBACK_ID),
      source,
      message: hexModeMessage,
    });
  }, [app, cellDimsWorkflow, fb, hexModeMessage, meta, sourcePrefix, state.cellDimsModeId]);

  const onExitHexCellDimsMode = useCallback(() => {
    const source = `${sourcePrefix}Hex:off`;
    setUiFlag(app, 'cellDimsHexPanelOpen', false, meta.uiOnlyImmediate(`${source}:panelClose`));
    cellDimsWorkflow.setCellDimsHexMode(false);
  }, [app, cellDimsWorkflow, meta, sourcePrefix]);

  return {
    isSliding: state.isSliding,
    cellDimsEditActive: state.cellDimsEditActive,
    cellDimsPanelOpen: state.cellDimsPanelOpen,
    cellDimsHexPanelOpen: state.cellDimsHexPanelOpen,
    hasAnyCellDimsOverrides: state.hasAnyCellDimsOverrides,
    defaultCellWidth: state.defaultCellWidth,
    width: state.width,
    cellDimsWidth: state.cellDimsWidth,
    cellDimsHeight: state.cellDimsHeight,
    cellDimsDepth: state.cellDimsDepth,
    cellDimsHexMode: state.cellDimsHexMode,
    cellDimsHexProtrusion: state.cellDimsHexProtrusion,
    cellDimsHexDoorWidth: state.cellDimsHexDoorWidth,
    height: state.height,
    depth: state.depth,
    onSetRaw,
    onResetAllCellDimsOverrides: cellDimsWorkflow.resetAllCellDimsOverrides,
    onEnterCellDimsMode,
    onExitCellDimsMode,
    onEnterHexCellDimsMode,
    onExitHexCellDimsMode,
    onClearCellDimsWidth: cellDimsWorkflow.clearCellDimsWidth,
    onClearCellDimsHeight: cellDimsWorkflow.clearCellDimsHeight,
    onClearCellDimsDepth: cellDimsWorkflow.clearCellDimsDepth,
    onClearCellDimsHexProtrusion: cellDimsWorkflow.clearCellDimsHexProtrusion,
    onClearCellDimsHexDoorWidth: cellDimsWorkflow.clearCellDimsHexDoorWidth,
  };
}
