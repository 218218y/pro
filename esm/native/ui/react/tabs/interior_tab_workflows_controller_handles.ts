import type { AppContainer } from '../../../../../types';
import {
  setHandleControlEnabled as handlesSetControlEnabled,
  setGlobalHandleType as handlesSetGlobalHandleType,
  setGlobalHandleSize,
  setHandleModeSize,
  enterHandleResetMode,
  setGlobalHandleColor as handlesSetGlobalHandleColor,
  setGlobalEdgeHandleVariant as handlesSetGlobalEdgeVariant,
  setHandleModeColor as handlesSetHandleModeColor,
  setHandleModeEdgeVariant as handlesSetHandleModeEdgeVariant,
  toggleHandleMode as handlesToggleHandleMode,
  enterManualHandlePositionMode as handlesEnterManualHandlePositionMode,
} from '../actions/handles_actions.js';
import type { EdgeHandleVariant, HandleType, HandleUiColor } from './interior_tab_helpers.js';
import type { InteriorTabWorkflowController } from './interior_tab_workflows_controller_contracts.js';

type InteriorTabHandlesWorkflowController = Pick<
  InteriorTabWorkflowController,
  | 'setHandleControlEnabled'
  | 'setGlobalEdgeHandleVariant'
  | 'setHandleModeEdgeVariant'
  | 'setGlobalHandle'
  | 'setGlobalHandleSize'
  | 'setHandleModeSize'
  | 'enterHandleResetMode'
  | 'setGlobalHandleColor'
  | 'toggleHandleMode'
  | 'setHandleModeColor'
  | 'enterManualHandlePositionMode'
>;

export function createInteriorTabHandlesWorkflowController(
  app: AppContainer
): InteriorTabHandlesWorkflowController {
  return {
    setGlobalHandleSize: size => setGlobalHandleSize(app, size),
    setHandleModeSize: size => setHandleModeSize(app, size),
    enterHandleResetMode: () => enterHandleResetMode(app),
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

    enterManualHandlePositionMode() {
      handlesEnterManualHandlePositionMode(app);
    },
  };
}
