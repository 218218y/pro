import type { AppContainer } from '../../../../types';
import {
  createClearTransientHoverPreview,
  createHoverCursorApplier,
  getClientXY,
  getInteractionTimers,
  reportCanvasInteractionsNonFatal,
  toNdcFromClient,
  type CanvasInteractionState,
  type CanvasInteractionsDeps,
} from './canvas_interactions_shared.js';

export function createCanvasHoverInteractionOps(
  App: AppContainer,
  deps: CanvasInteractionsDeps,
  state: CanvasInteractionState,
  rectOps: {
    invalidateRectCache: () => void;
    readRectCached: (
      maxAgeMs?: number
    ) => { left: number; top: number; width: number; height: number } | null;
  }
) {
  const timers = getInteractionTimers(App);
  const clearTransientHoverPreview = createClearTransientHoverPreview(App, deps.domEl, state);
  const applyHoverCursorFromResult = createHoverCursorApplier(App, deps.domEl, state);

  const flushQueuedHover = (): void => {
    state.hoverRafId = 0;
    if (!state.hoverMoveQueued) return;
    state.hoverMoveQueued = false;

    let hoverRes: unknown = null;
    try {
      const rect = rectOps.readRectCached(24);
      const ndc = rect ? toNdcFromClient(state.hoverLastCx, state.hoverLastCy, rect) : null;
      if (ndc && typeof deps.handleCanvasHoverNDC === 'function') {
        hoverRes = deps.handleCanvasHoverNDC(ndc.x, ndc.y, App);
      }
    } catch {
      hoverRes = null;
    }

    applyHoverCursorFromResult(hoverRes);

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
    state.hoverMoveQueued = false;
    if (state.hoverRafId) {
      try {
        timers.cancelAnimationFrame(state.hoverRafId);
      } catch (err) {
        reportCanvasInteractionsNonFatal(App, 'pointerleave.cancelRaf', err);
      }
      state.hoverRafId = 0;
    }
    rectOps.invalidateRectCache();
    clearTransientHoverPreview();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'triggerRender(pointerleave)', err);
    }
  };

  const disposeHover = (): void => {
    state.hoverMoveQueued = false;
    rectOps.invalidateRectCache();
    if (state.hoverRafId) {
      try {
        timers.cancelAnimationFrame(state.hoverRafId);
      } catch (err) {
        reportCanvasInteractionsNonFatal(App, 'cancelRaf', err);
      }
      state.hoverRafId = 0;
    }
  };

  return { onPointerMove, onPointerLeave, disposeHover };
}
