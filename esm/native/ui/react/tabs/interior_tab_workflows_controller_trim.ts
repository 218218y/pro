import type { AppContainer } from '../../../../../types';
import { enterPrimaryMode } from '../actions/modes_actions.js';
import { readDoorTrimAxis, readDoorTrimSpan } from './interior_tab_view_state_shared.js';
import type { DoorTrimUiAxis, DoorTrimUiColor, DoorTrimUiSpan } from './interior_tab_helpers.js';
import {
  DOOR_TRIM_MODE_TOAST,
  type InteriorTabWorkflowController,
  type InteriorTabWorkflowStateLike,
  type InteriorWorkflowModeIds,
} from './interior_tab_workflows_controller_contracts.js';
import { createDoorTrimModeOpts } from './interior_tab_workflows_controller_shared.js';

type CreateInteriorTabDoorTrimWorkflowControllerArgs = {
  app: AppContainer;
  state: InteriorTabWorkflowStateLike;
  modeIds: InteriorWorkflowModeIds;
};

type InteriorTabDoorTrimWorkflowController = Pick<
  InteriorTabWorkflowController,
  'activateDoorTrimMode' | 'setDoorTrimColorAndMaybeRefresh'
>;

export function createInteriorTabDoorTrimWorkflowController(
  args: CreateInteriorTabDoorTrimWorkflowControllerArgs
): InteriorTabDoorTrimWorkflowController {
  const { app, state, modeIds } = args;
  return {
    activateDoorTrimMode(
      axis: DoorTrimUiAxis,
      span: DoorTrimUiSpan,
      sizeCm?: number | '',
      crossSizeCm?: number | ''
    ) {
      enterPrimaryMode(app, modeIds.doorTrim, {
        modeOpts: createDoorTrimModeOpts({
          axis,
          span,
          color: state.doorTrimColor,
          sizeCm,
          crossSizeCm,
        }),
        cursor: 'alias',
        toast: DOOR_TRIM_MODE_TOAST,
      });
    },

    setDoorTrimColorAndMaybeRefresh(color: DoorTrimUiColor) {
      if (color === state.doorTrimColor) return;
      state.setDoorTrimColor(color);
      if (!state.isDoorTrimMode) return;

      const activeAxis = readDoorTrimAxis(state.modeOpts.trimAxis, 'horizontal');
      const activeSpan = readDoorTrimSpan(
        state.modeOpts.trimSpan,
        activeAxis === 'vertical' ? state.doorTrimVerticalSpan : state.doorTrimHorizontalSpan
      );
      const activeSize =
        activeAxis === 'vertical' ? state.doorTrimVerticalCustomCm : state.doorTrimHorizontalCustomCm;
      const activeCrossSize =
        activeAxis === 'vertical' ? state.doorTrimVerticalCrossCm : state.doorTrimHorizontalCrossCm;

      enterPrimaryMode(app, modeIds.doorTrim, {
        modeOpts: {
          ...state.modeOpts,
          ...createDoorTrimModeOpts({
            axis: activeAxis,
            span: activeSpan,
            color,
            sizeCm: activeSize,
            crossSizeCm: activeCrossSize,
          }),
        },
        cursor: 'alias',
        toast: DOOR_TRIM_MODE_TOAST,
      });
    },
  };
}
