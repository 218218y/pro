// Canvas picking click flow.
//
// Extracted from canvas_picking_core.ts to keep the owner file thin while
// preserving the canonical exported click entrypoint there.
import type { AppContainer } from '../../../types';
import { isNotesScreenDrawMode } from '../runtime/notes_access.js';
import {
  __wp_reportPickingIssue,
  __wp_ensurePickingRefs,
  __wp_toast,
} from './canvas_picking_core_helpers.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { resolveCanvasPickingClickModeState } from './canvas_picking_click_mode_state.js';
import { createCanvasPickingClickModuleRefs } from './canvas_picking_click_module_refs.js';
import { resetCanvasPickingEmptyClick } from './canvas_picking_click_empty.js';
import { routeCanvasPickingClick } from './canvas_picking_click_route.js';
import { syncCanvasPickingViewportMatrices } from './canvas_picking_viewport_matrices.js';
import { getThreeMaybe } from '../runtime/three_access.js';
import { commitDoorArchAction, resolveDoorArchAction } from './canvas_picking_door_arch_actions.js';
import { readActiveDoorArchTool, readSplitVariant } from './canvas_picking_door_edit_shared.js';
import { tryHandleCanvasDoorCustomSplitScreenRemoveClick } from './canvas_picking_door_split_click_custom.js';
import { requireViewerMeasurementTool } from './viewer_measurement_tool_loader.js';
import { tryHandleRoomOpeningPlacementClick } from './room_opening_placement.js';
import { tryHandleRoomDoorToggleClick } from './room_door_interaction.js';

export function __coreHandleCanvasClickNDC(App: AppContainer, ndcX: number, ndcY: number): void {
  const { raycaster: __wpRaycaster, mouse: __wpMouse } = __wp_ensurePickingRefs(App);
  if (!__wpRaycaster || !__wpMouse) return;
  try {
    if (isNotesScreenDrawMode(App)) return;
  } catch (err) {
    __wp_reportPickingIssue(App, err, {
      where: 'canvasPicking.click',
      op: 'notesDrawGuard',
      throttleMs: 1000,
    });
  }

  syncCanvasPickingViewportMatrices(App);

  if (
    tryHandleRoomOpeningPlacementClick({
      App,
      ndcX,
      ndcY,
      raycaster: __wpRaycaster,
      mouse: __wpMouse,
    })
  ) {
    return;
  }

  if (
    tryHandleRoomDoorToggleClick({
      App,
      ndcX,
      ndcY,
      raycaster: __wpRaycaster,
      mouse: __wpMouse,
    })
  ) {
    return;
  }

  const modeState = resolveCanvasPickingClickModeState(App);
  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: modeState.__isRemoveDoorMode,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
  });
  if (modeState.__isMeasureMode) {
    requireViewerMeasurementTool().tryHandleViewerMeasurementClick({
      App,
      hitState,
      ndcX,
      ndcY,
      raycaster: __wpRaycaster,
      mouse: __wpMouse,
    });
    return;
  }
  const splitVariant = readSplitVariant(App);
  const archTool = readActiveDoorArchTool(App, {
    split: modeState.__isSplitEditMode,
    groove: modeState.__isGrooveEditMode,
    paint: modeState.__isPaintMode,
    splitVariant,
  });
  if (archTool) {
    const THREE = getThreeMaybe(App);
    if (!THREE) return;
    const action = resolveDoorArchAction({
      App,
      THREE,
      ...archTool,
      hit: hitState,
      raycaster: __wpRaycaster,
    });
    if (action) commitDoorArchAction(App, action);
    else if (!resetCanvasPickingEmptyClick({ App, hitState, modeState }) && hitState?.effectiveDoorId)
      __wp_toast(App, 'אין מקום לצורה במיקום הזה. הזז את הסמן ובדוק את התצוגה המקדימה.', 'error');
    return;
  }
  // A cut is a gap in the door mesh, so the ray can hit a selector or carcass
  // behind it. Match the hover's projected cut line whenever no door was hit;
  // a resolved door retains priority over neighboring screen-space candidates.
  if (
    modeState.__isSplitEditMode &&
    splitVariant === 'custom' &&
    !hitState?.effectiveDoorId &&
    tryHandleCanvasDoorCustomSplitScreenRemoveClick({ App, ndcX, ndcY })
  ) {
    return;
  }
  if (!hitState) {
    if (modeState.__isSplitEditMode || modeState.__isGrooveEditMode || modeState.__isPaintMode) {
      resetCanvasPickingEmptyClick({ App, hitState, modeState });
    }
    return;
  }

  const moduleRefs = createCanvasPickingClickModuleRefs({
    App,
    foundModuleIndex: hitState.foundModuleIndex,
    foundModuleStack: hitState.foundModuleStack,
  });

  routeCanvasPickingClick({
    App,
    ndcX,
    ndcY,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
    modeState,
    hitState,
    moduleRefs,
  });
}
