import type {
  CreateStructureTabWorkflowControllerArgs,
  StructureTabWorkflowController,
} from './structure_tab_workflows_controller_contracts.js';
import {
  clearStructureCellDimsOverrides,
  computeStructureAutoWidth,
  emitStructureWorkflowToast,
  reportStructureWorkflowNonFatal,
} from './structure_tab_workflows_controller_shared.js';

export type StructureTabWorkflowCellDimsArgs = Pick<
  CreateStructureTabWorkflowControllerArgs,
  'fb' | 'ops' | 'state'
>;

export function createStructureTabWorkflowCellDimsApi(
  args: StructureTabWorkflowCellDimsArgs
): Pick<
  StructureTabWorkflowController,
  | 'resetAllCellDimsOverrides'
  | 'clearCellDimsWidth'
  | 'clearCellDimsHeight'
  | 'clearCellDimsDepth'
  | 'clearCellDimsHexProtrusion'
  | 'clearCellDimsHexDoorWidth'
  | 'setCellDimsHexMode'
  | 'resetAutoWidth'
> {
  const { fb, ops, state } = args;

  const clearCellDim = (
    key: 'width' | 'height' | 'depth' | 'hexProtrusion' | 'hexDoorWidth',
    opName: string
  ): void => {
    try {
      ops.clearCellDim(key);
    } catch (err) {
      reportStructureWorkflowNonFatal(args, opName, err);
    }
  };

  return {
    resetAllCellDimsOverrides() {
      try {
        const list = ops.getModulesConfiguration();
        if (!list.length) {
          emitStructureWorkflowToast(fb, 'אין מידות מיוחדות לביטול', 'info');
          return;
        }
        const source = 'react:cellDims:resetAll';
        ops.commitModulesConfiguration(clearStructureCellDimsOverrides(list), source);
        emitStructureWorkflowToast(fb, 'חזרנו למידות כלליות שוות לכל התאים', 'success');
      } catch (err) {
        reportStructureWorkflowNonFatal(
          args,
          'structureTabWorkflowsController.resetAllCellDimsOverrides',
          err
        );
        emitStructureWorkflowToast(fb, 'שגיאה בביטול מידות מיוחדות', 'error');
      }
    },

    clearCellDimsWidth() {
      clearCellDim('width', 'structureTabWorkflowsController.clearCellDimsWidth');
    },

    clearCellDimsHeight() {
      clearCellDim('height', 'structureTabWorkflowsController.clearCellDimsHeight');
    },

    clearCellDimsDepth() {
      clearCellDim('depth', 'structureTabWorkflowsController.clearCellDimsDepth');
    },

    clearCellDimsHexProtrusion() {
      clearCellDim('hexProtrusion', 'structureTabWorkflowsController.clearCellDimsHexProtrusion');
    },

    clearCellDimsHexDoorWidth() {
      clearCellDim('hexDoorWidth', 'structureTabWorkflowsController.clearCellDimsHexDoorWidth');
    },

    setCellDimsHexMode(on: boolean) {
      try {
        ops.setCellDimsHexMode(on);
      } catch (err) {
        reportStructureWorkflowNonFatal(args, 'structureTabWorkflowsController.setCellDimsHexMode', err);
      }
    },

    resetAutoWidth() {
      try {
        ops.setAutoWidth(computeStructureAutoWidth(state.wardrobeType, state.doors));
      } catch (err) {
        reportStructureWorkflowNonFatal(args, 'structureTabWorkflowsController.resetAutoWidth', err);
      }
    },
  };
}
