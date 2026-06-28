// Canvas picking click flow.
//
// Extracted from canvas_picking_core.ts to keep the owner file thin while
// preserving the canonical exported click entrypoint there.
import type { AppContainer } from '../../../types';
import { isNotesScreenDrawMode } from '../runtime/notes_access.js';
import { __wp_reportPickingIssue, __wp_ensurePickingRefs } from './canvas_picking_core_helpers.js';
import { resolveCanvasPickingClickHitState } from './canvas_picking_click_hit_flow.js';
import { resolveCanvasPickingClickModeState } from './canvas_picking_click_mode_state.js';
import { createCanvasPickingClickModuleRefs } from './canvas_picking_click_module_refs.js';
import { routeCanvasPickingClick } from './canvas_picking_click_route.js';
import { syncCanvasPickingViewportMatrices } from './canvas_picking_viewport_matrices.js';
import { readSplitVariant } from './canvas_picking_door_edit_shared.js';
import { tryHandleCanvasDoorCustomSplitScreenRemoveClick } from './canvas_picking_door_split_click_custom.js';
import { tryHandleViewerMeasurementClick } from './viewer_measurement_tool.js';

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

  const modeState = resolveCanvasPickingClickModeState(App);
  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX,
    ndcY,
    isRemoveDoorMode: modeState.__isRemoveDoorMode,
    raycaster: __wpRaycaster,
    mouse: __wpMouse,
  });
  if (!hitState) {
    if (modeState.__isMeasureMode) {
      tryHandleViewerMeasurementClick({
        App,
        hitState: null,
        ndcX,
        ndcY,
        raycaster: __wpRaycaster,
        mouse: __wpMouse,
      });
      return;
    }
    if (
      modeState.__isSplitEditMode &&
      readSplitVariant(App) === 'custom' &&
      tryHandleCanvasDoorCustomSplitScreenRemoveClick({ App, ndcX, ndcY })
    ) {
      return;
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
