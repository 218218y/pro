export type {
  CreateStructureTabWorkflowControllerArgs,
  StructureTabWorkflowController,
  StructureWorkflowOps,
  StructureWorkflowState,
  StructureWorkflowToastKind,
} from './structure_tab_workflows_controller_contracts.js';

import type {
  CreateStructureTabWorkflowControllerArgs,
  StructureTabWorkflowController,
} from './structure_tab_workflows_controller_contracts.js';
import { createStructureTabWorkflowCellDimsApi } from './structure_tab_workflows_controller_cell_dims.js';
import { createStructureTabWorkflowLibraryApi } from './structure_tab_workflows_controller_library.js';
export {
  buildStructureLibraryInvariantArgs,
  buildStructureLibraryToggleArgs,
  clearStructureCellDimsOverrides,
  computeStructureAutoWidth,
} from './structure_tab_workflows_controller_shared.js';

export function createStructureTabWorkflowController(
  args: CreateStructureTabWorkflowControllerArgs
): StructureTabWorkflowController {
  return {
    ...createStructureTabWorkflowLibraryApi(args),
    ...createStructureTabWorkflowCellDimsApi(args),
  };
}
