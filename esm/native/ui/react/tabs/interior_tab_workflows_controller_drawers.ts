import type { AppContainer } from '../../../../../types';
import { exitPrimaryMode } from '../actions/modes_actions.js';
import {
  enterExtDrawerMode as interiorEnterExtDrawerMode,
  enterManualLayoutMode as interiorEnterManualLayoutMode,
  toggleDividerMode as interiorToggleDividerMode,
  setInternalDrawersEnabled as interiorSetInternalDrawersEnabled,
  setDrawerRunnerType as interiorSetDrawerRunnerType,
} from '../actions/interior_actions.js';
import {
  isSketchInternalDrawersTool,
  mkSketchInternalDrawersTool,
  type ExtDrawerType,
} from './interior_tab_helpers.js';
import type {
  InteriorTabWorkflowController,
  InteriorTabWorkflowStateLike,
  InteriorWorkflowModeIds,
} from './interior_tab_workflows_controller_contracts.js';
import {
  clearInteriorDrawerModeBootstrap,
  scheduleInteriorDrawerModeBootstrap,
} from './interior_tab_workflows_controller_shared.js';
import { CLOSE_DOORS_OPTS } from './interior_tab_workflows_controller_contracts.js';

type CreateInteriorTabDrawersWorkflowControllerArgs = {
  app: AppContainer;
  state: InteriorTabWorkflowStateLike;
  modeIds: InteriorWorkflowModeIds;
};

type InteriorTabDrawersWorkflowController = Pick<
  InteriorTabWorkflowController,
  | 'enterExtDrawer'
  | 'exitExtDrawer'
  | 'toggleDividerMode'
  | 'toggleIntDrawerMode'
  | 'setInternalDrawersEnabled'
  | 'setDrawerRunnerType'
>;

export function createInteriorTabDrawersWorkflowController(
  args: CreateInteriorTabDrawersWorkflowControllerArgs
): InteriorTabDrawersWorkflowController {
  const { app, state, modeIds } = args;
  return {
    enterExtDrawer(type: ExtDrawerType, count?: number) {
      interiorEnterExtDrawerMode(app, type, count);
    },

    exitExtDrawer() {
      exitPrimaryMode(app, modeIds.extDrawer);
    },

    toggleDividerMode() {
      interiorToggleDividerMode(app);
    },

    toggleIntDrawerMode() {
      clearInteriorDrawerModeBootstrap(app);
      const manualToolRaw = typeof state.modeOpts?.manualTool === 'string' ? state.modeOpts.manualTool : '';
      if (state.isManualLayoutMode && isSketchInternalDrawersTool(manualToolRaw)) {
        exitPrimaryMode(app, modeIds.manualLayout, CLOSE_DOORS_OPTS);
        return;
      }
      interiorEnterManualLayoutMode(app, mkSketchInternalDrawersTool(state.sketchIntDrawerHeightCm));
    },

    setDrawerRunnerType(type) {
      interiorSetDrawerRunnerType(app, type);
    },

    setInternalDrawersEnabled(on: boolean) {
      const enabled = !!on;
      const manualToolRaw = typeof state.modeOpts?.manualTool === 'string' ? state.modeOpts.manualTool : '';
      const isSketchInternalDrawerEditing =
        state.isManualLayoutMode && isSketchInternalDrawersTool(manualToolRaw);

      if (enabled === !!state.internalDrawersEnabled) {
        if (!enabled) {
          clearInteriorDrawerModeBootstrap(app);
          return;
        }
        if (!state.hasIntDrawerData && !isSketchInternalDrawerEditing) {
          scheduleInteriorDrawerModeBootstrap(app);
        }
        return;
      }

      if (!enabled) {
        clearInteriorDrawerModeBootstrap(app);
        if (isSketchInternalDrawerEditing) exitPrimaryMode(app, modeIds.manualLayout, CLOSE_DOORS_OPTS);
      }

      interiorSetInternalDrawersEnabled(app, enabled);

      if (
        enabled &&
        !state.internalDrawersEnabled &&
        !state.hasIntDrawerData &&
        !isSketchInternalDrawerEditing
      ) {
        scheduleInteriorDrawerModeBootstrap(app);
      }
    },
  };
}
