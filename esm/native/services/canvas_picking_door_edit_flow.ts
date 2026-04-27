// Canvas picking door edit click routing.
//
// Keeps the canonical click entrypoint stable while delegating trim, split,
// remove, hinge, groove, and sketch-box mutation policy to focused helpers.

import type { AppContainer, UnknownRecord } from '../../../types';

import { handleCanvasDoorTrimClick } from './canvas_picking_door_trim_click.js';
import { handleCanvasDoorSplitClick } from './canvas_picking_door_split_click.js';
import { handleCanvasDoorRemoveClick } from './canvas_picking_door_remove_click.js';
import {
  handleCanvasDoorHingeClick,
  handleCanvasDoorGrooveClick,
} from './canvas_picking_door_hinge_groove_click.js';

export interface CanvasDoorEditClickArgs {
  App: AppContainer;
  foundPartId: string | null;
  effectiveDoorId: string | null;
  activeStack: 'top' | 'bottom';
  foundModuleStack: 'top' | 'bottom';
  doorHitY: number | null;
  doorHitPoint: UnknownRecord | null;
  doorHitObject: UnknownRecord | null;
  isSplitEditMode: boolean;
  isRemoveDoorMode: boolean;
  isHingeEditMode: boolean;
  isGrooveEditMode: boolean;
  isDoorTrimMode: boolean;
}

export function tryHandleCanvasDoorEditClick(args: CanvasDoorEditClickArgs): boolean {
  const {
    App,
    foundPartId,
    effectiveDoorId,
    activeStack,
    foundModuleStack,
    doorHitY,
    doorHitPoint,
    doorHitObject,
    isSplitEditMode,
    isRemoveDoorMode,
    isHingeEditMode,
    isGrooveEditMode,
    isDoorTrimMode,
  } = args;

  if (isDoorTrimMode) {
    return handleCanvasDoorTrimClick({
      App,
      effectiveDoorId,
      foundPartId,
      doorHitPoint,
      doorHitObject,
    });
  }

  if (isSplitEditMode && effectiveDoorId) {
    return handleCanvasDoorSplitClick({
      App,
      effectiveDoorId,
      foundModuleStack,
      doorHitY,
    });
  }

  if (isRemoveDoorMode && effectiveDoorId) {
    return handleCanvasDoorRemoveClick({
      App,
      effectiveDoorId,
      foundPartId,
      foundModuleStack,
    });
  }

  if (isHingeEditMode && effectiveDoorId) {
    return handleCanvasDoorHingeClick({ App, effectiveDoorId });
  }

  if (isGrooveEditMode) {
    return handleCanvasDoorGrooveClick({
      App,
      effectiveDoorId,
      foundPartId,
      activeStack,
      foundModuleStack,
      doorHitObject,
    });
  }

  return false;
}
