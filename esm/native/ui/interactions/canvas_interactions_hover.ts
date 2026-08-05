import type { AppContainer } from '../../../../types';
import { disposeViewerMeasurementHoverTooltip } from './canvas_measurement_hover_tooltip.js';
import { cancelCanvasPostBuildHoverRefresh, updateCanvasPostBuildHoverRefresh } from '../../services/api.js';
import {
  cancelQueuedCanvasHoverRefresh,
  createClearTransientHoverPreview,
  createHoverCursorApplier,
  getClientXY,
  getInteractionTimers,
  refreshCanvasHoverAtClientPoint,
  reportCanvasInteractionsNonFatal,
  toNdcFromClient,
  type CanvasInteractionState,
  type CanvasInteractionsDeps,
  type CanvasRectOps,
} from './canvas_interactions_shared.js';

export function createCanvasHoverInteractionOps(
  App: AppContainer,
  deps: CanvasInteractionsDeps,
  state: CanvasInteractionState,
  rectOps: CanvasRectOps
) {
  const timers = getInteractionTimers(App);
  const clearTransientHoverPreview = createClearTransientHoverPreview(App, deps.domEl, state);
  const applyHoverCursorFromResult = createHoverCursorApplier(App, deps.domEl, state);

  const flushQueuedHover = (): void => {
    state.hoverRafId = 0;
    if (!state.hoverMoveQueued) return;
    state.hoverMoveQueued = false;

    refreshCanvasHoverAtClientPoint({
      App,
      deps,
      state,
      rectOps,
      applyHoverCursorFromResult,
      cx: state.hoverLastCx,
      cy: state.hoverLastCy,
      rectMaxAgeMs: 24,
      invalidateRectCache: false,
      op: 'hover.flushQueued',
    });

    if (state.hoverMoveQueued && !state.hoverRafId) {
      state.hoverRafId = timers.requestAnimationFrame(flushQueuedHover);
    }
  };

  const onPointerMove: EventListener = e => {
    const now = Date.now();
    try {
      const xy = getClientXY(e, App);
      if (!xy) return;

      state.hoverLastCx = xy.cx;
      state.hoverLastCy = xy.cy;
      const rect = rectOps.readRectCached(24);
      const ndc = rect ? toNdcFromClient(xy.cx, xy.cy, rect) : null;
      if (ndc) updateCanvasPostBuildHoverRefresh(App, ndc.x, ndc.y);

      if (!state.hoverMoveQueued) {
        state.hoverMoveQueued = true;
        if (!state.hoverRafId) state.hoverRafId = timers.requestAnimationFrame(flushQueuedHover);
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'move', err);
    }

    rectOps.invalidateRectCache();
    return void now;
  };

  const onPointerLeave: EventListener = () => {
    state.hasDown = false;
    state.downPointerId = null;
    cancelQueuedCanvasHoverRefresh(App, state, timers, 'pointerleave.cancelRaf');
    cancelCanvasPostBuildHoverRefresh(App);
    rectOps.invalidateRectCache();
    clearTransientHoverPreview();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'triggerRender(pointerleave)', err);
    }
  };

  const disposeHover = (): void => {
    rectOps.invalidateRectCache();
    cancelQueuedCanvasHoverRefresh(App, state, timers, 'cancelRaf');
    cancelCanvasPostBuildHoverRefresh(App);
    disposeViewerMeasurementHoverTooltip(deps.domEl);
  };

  return { onPointerMove, onPointerLeave, disposeHover };
}
