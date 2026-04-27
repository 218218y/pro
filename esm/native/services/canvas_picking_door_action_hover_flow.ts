import { getThreeMaybe } from '../runtime/three_access.js';
import { applyDoorActionHoverMarkerMaterial } from './canvas_picking_door_action_hover_remove.js';
import { tryHandleDoorActionHoverMarkerRoute } from './canvas_picking_door_action_hover_marker.js';
import { type DoorActionHoverArgs, __callMaybe } from './canvas_picking_door_hover_targets.js';
import {
  resolveDoorActionHoverModeState,
  resolveDoorActionHoverState,
  shouldApplyGenericDoorActionHoverMarkerFinish,
} from './canvas_picking_door_action_hover_state.js';

export function tryHandleDoorActionHover(args: DoorActionHoverArgs): boolean {
  const modeState = resolveDoorActionHoverModeState(args);
  if (!modeState) return false;

  const THREE = getThreeMaybe(args.App);
  __callMaybe(args.hideLayoutPreview, { App: args.App, THREE });
  __callMaybe(args.hideSketchPreview, { App: args.App, THREE });

  const state = resolveDoorActionHoverState({ hoverArgs: args, modeState });
  if (!state) {
    if (args.doorMarker) args.doorMarker.visible = false;
    return false;
  }

  if (!tryHandleDoorActionHoverMarkerRoute({ hoverArgs: args, modeState, state, THREE })) {
    if (args.doorMarker) args.doorMarker.visible = false;
    return false;
  }

  if (args.doorMarker) args.doorMarker.visible = true;
  if (shouldApplyGenericDoorActionHoverMarkerFinish(modeState)) {
    applyDoorActionHoverMarkerMaterial({ hoverArgs: args, state });
    args.doorMarker?.scale?.set?.(state.width - 0.01, state.regionH - 0.01, 1);
  }
  return true;
}
