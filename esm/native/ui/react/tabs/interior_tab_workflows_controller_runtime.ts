import type {
  CreateInteriorTabWorkflowControllerArgs,
  InteriorTabWorkflowController,
} from './interior_tab_workflows_controller_contracts.js';
import { createInteriorWorkflowModeIds } from './interior_tab_workflows_controller_shared.js';
import { createInteriorTabManualWorkflowController } from './interior_tab_workflows_controller_manual.js';
import { createInteriorTabDrawersWorkflowController } from './interior_tab_workflows_controller_drawers.js';
import { createInteriorTabHandlesWorkflowController } from './interior_tab_workflows_controller_handles.js';
import { createInteriorTabDoorTrimWorkflowController } from './interior_tab_workflows_controller_trim.js';

export {
  CLOSE_DOORS_OPTS,
  DOOR_TRIM_MODE_TOAST,
  type CreateInteriorTabWorkflowControllerArgs,
  type InteriorTabWorkflowController,
  type InteriorTabWorkflowStateLike,
} from './interior_tab_workflows_controller_contracts.js';
export {
  clampInteriorSketchOptionalDim,
  clearInteriorDrawerModeBootstrap,
  createDoorTrimModeOpts,
  scheduleInteriorDrawerModeBootstrap,
} from './interior_tab_workflows_controller_shared.js';

export function createInteriorTabWorkflowController(
  args: CreateInteriorTabWorkflowControllerArgs
): InteriorTabWorkflowController {
  const modeIds = createInteriorWorkflowModeIds();
  return {
    ...createInteriorTabManualWorkflowController({ ...args, modeIds }),
    ...createInteriorTabDrawersWorkflowController({ ...args, modeIds }),
    ...createInteriorTabHandlesWorkflowController(args.app),
    ...createInteriorTabDoorTrimWorkflowController({ ...args, modeIds }),
  };
}
