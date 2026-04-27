import type { AppContainer } from '../../../../../types';
import { exitPrimaryMode } from '../actions/modes_actions.js';
import {
  enterExtDrawerMode as interiorEnterExtDrawerMode,
  toggleDividerMode as interiorToggleDividerMode,
  toggleIntDrawerMode as interiorToggleDrawerMode,
  setInternalDrawersEnabled as interiorSetInternalDrawersEnabled,
} from '../actions/interior_actions.js';
import type { ExtDrawerType } from './interior_tab_helpers.js';
import type {
  InteriorTabWorkflowController,
  InteriorTabWorkflowStateLike,
  InteriorWorkflowModeIds,
} from './interior_tab_workflows_controller_contracts.js';
import {
  clearInteriorDrawerModeBootstrap,
  scheduleInteriorDrawerModeBootstrap,
} from './interior_tab_workflows_controller_shared.js';

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
      interiorToggleDrawerMode(app);
    },

    setInternalDrawersEnabled(on: boolean) {
      const enabled = !!on;
      if (enabled === !!state.internalDrawersEnabled) {
        if (!enabled) {
          clearInteriorDrawerModeBootstrap(app);
          return;
        }
        if (!state.hasIntDrawerData && !state.isIntDrawerMode) scheduleInteriorDrawerModeBootstrap(app);
        return;
      }
      if (!enabled) clearInteriorDrawerModeBootstrap(app);
      interiorSetInternalDrawersEnabled(app, enabled);
      if (enabled && !state.internalDrawersEnabled && !state.hasIntDrawerData && !state.isIntDrawerMode) {
        scheduleInteriorDrawerModeBootstrap(app);
      }
    },
  };
}
