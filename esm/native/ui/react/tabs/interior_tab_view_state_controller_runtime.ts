import type {
  CreateInteriorTabViewStateControllerArgs,
  InteriorTabViewStateController,
  InteriorTabViewStateSyncInput,
} from './interior_tab_view_state_controller_contracts.js';

import { createInteriorTabSketchViewStateController } from './interior_tab_view_state_controller_sketch.js';
import { createInteriorTabDoorTrimViewStateController } from './interior_tab_view_state_controller_trim.js';

export {
  patchInteriorSketchShelfDepthDraftMap,
  patchInteriorSketchShelfDepthMap,
} from './interior_tab_view_state_controller_shared.js';
export type {
  CreateInteriorTabViewStateControllerArgs,
  InteriorTabViewStateController,
  InteriorTabViewStateSyncInput,
} from './interior_tab_view_state_controller_contracts.js';

export function createInteriorTabViewStateController(
  args: CreateInteriorTabViewStateControllerArgs
): InteriorTabViewStateController {
  const sketchController = createInteriorTabSketchViewStateController(args);
  const doorTrimController = createInteriorTabDoorTrimViewStateController(args);

  return {
    syncFromViewState(input: InteriorTabViewStateSyncInput) {
      sketchController.syncSlidingWardrobeExtDrawerGuard(
        input.wardrobeType,
        input.isExtDrawerMode,
        input.modeExtDrawer
      );
      sketchController.syncSketchShelvesState(input.isSketchToolActive, input.manualToolRaw);
      doorTrimController.syncDoorTrimPanelState(input.isDoorTrimMode);
      doorTrimController.syncDoorTrimDraftState(input.isDoorTrimMode, input.modeOpts);
      sketchController.syncSketchBoxPanelState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchBoxDraftState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchStorageHeightState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchBoxCorniceState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchBoxBaseState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchExtDrawersState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchIntDrawersState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncSketchShelfDepthState(input.isSketchToolActive, input.manualToolRaw);
      sketchController.syncManualUiToolState(input.isManualLayoutMode, input.manualTool);
    },
    ...sketchController,
    ...doorTrimController,
  };
}
