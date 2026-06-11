import type { AppContainer } from '../../../../../types';
import {
  setHandleControlEnabled as handlesSetControlEnabled,
  setGlobalHandleType as handlesSetGlobalHandleType,
  setGlobalHandleColor as handlesSetGlobalHandleColor,
  setGlobalEdgeHandleVariant as handlesSetGlobalEdgeVariant,
  setHandleModeColor as handlesSetHandleModeColor,
  setHandleModeEdgeVariant as handlesSetHandleModeEdgeVariant,
  toggleHandleMode as handlesToggleHandleMode,
} from '../actions/handles_actions.js';
import type { EdgeHandleVariant, HandleType, HandleUiColor } from './interior_tab_helpers.js';
import type { InteriorTabWorkflowController } from './interior_tab_workflows_controller_contracts.js';

type InteriorTabHandlesWorkflowController = Pick<
  InteriorTabWorkflowController,
  | 'setHandleControlEnabled'
  | 'setGlobalEdgeHandleVariant'
  | 'setHandleModeEdgeVariant'
  | 'setGlobalHandle'
  | 'setGlobalHandleColor'
  | 'toggleHandleMode'
  | 'setHandleModeColor'
>;

export function createInteriorTabHandlesWorkflowController(
  app: AppContainer
): InteriorTabHandlesWorkflowController {
  return {
    setHandleControlEnabled(on: boolean) {
      handlesSetControlEnabled(app, on);
    },

    setGlobalEdgeHandleVariant(variant: EdgeHandleVariant) {
      handlesSetGlobalEdgeVariant(app, variant);
    },

    setHandleModeEdgeVariant(variant: EdgeHandleVariant) {
      handlesSetHandleModeEdgeVariant(app, variant);
    },

    setGlobalHandle(type: HandleType) {
      handlesSetGlobalHandleType(app, type);
    },

    setGlobalHandleColor(color: HandleUiColor) {
      handlesSetGlobalHandleColor(app, color);
    },

    toggleHandleMode(type?: HandleType) {
      handlesToggleHandleMode(app, type);
    },

    setHandleModeColor(color: HandleUiColor) {
      handlesSetHandleModeColor(app, color);
    },
  };
}
