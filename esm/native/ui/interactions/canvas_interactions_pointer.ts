import type { AppContainer } from '../../../../types';
import {
  cancelCanvasPostBuildHoverRefresh,
  consumeSuppressNextCanvasPostClickHoverRefresh,
  requestCanvasPostBuildHoverRefresh,
  resolveCanvasPrecisionAxisLockedClientPoint,
} from '../../services/api.js';
import {
  callNotesFirst,
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
  type CanvasInteractionsOptions,
  type CanvasRectOps,
} from './canvas_interactions_shared.js';

export function createCanvasPointerInteractionOps(
  App: AppContainer,
  deps: CanvasInteractionsDeps,
  state: CanvasInteractionState,
  opts: Required<CanvasInteractionsOptions>,
  rectOps: CanvasRectOps
) {
  const timers = getInteractionTimers(App);
  const applyHoverCursorFromResult = createHoverCursorApplier(App, deps.domEl, state);
  const clearTransientHoverPreview = createClearTransientHoverPreview(App, deps.domEl, state);

  const commitAtClientPoint = (
    upXy: NonNullable<ReturnType<typeof getClientXY>>,
    source: 'pointer' | 'keyboard'
  ): boolean => {
    let clickNdc: { x: number; y: number } | null = null;

    try {
      const rect = rectOps.readRectCached(0);
      const authoringPoint = resolveCanvasPrecisionAxisLockedClientPoint(App, { cx: upXy.cx, cy: upXy.cy });
      clickNdc = rect ? toNdcFromClient(authoringPoint.cx, authoringPoint.cy, rect) : null;
      if (clickNdc && typeof deps.handleCanvasClickNDC === 'function') {
        deps.handleCanvasClickNDC(clickNdc.x, clickNdc.y, App);
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, source === 'keyboard' ? 'keyboardCommit.click' : 'click', err);
      clickNdc = null;
    }

    let suppressPostClickHoverRefresh = false;
    if (clickNdc) {
      suppressPostClickHoverRefresh = consumeSuppressNextCanvasPostClickHoverRefresh(App);
      cancelQueuedCanvasHoverRefresh(App, state, timers, 'hover.cancelBeforePostClickRefresh');
      clearTransientHoverPreview();
      state.hoverLastCx = upXy.cx;
      state.hoverLastCy = upXy.cy;
      if (suppressPostClickHoverRefresh) {
        cancelCanvasPostBuildHoverRefresh(App);
      } else {
        requestCanvasPostBuildHoverRefresh(
          App,
          clickNdc.x,
          clickNdc.y,
          source === 'keyboard'
            ? 'canvas.keyboard.enter.postBuildHover'
            : 'canvas.pointer.click.postBuildHover'
        );
      }
    }

    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal(
        App,
        source === 'keyboard' ? 'triggerRender(keyboardCommit)' : 'triggerRender(click)',
        err
      );
    }

    if (clickNdc && !suppressPostClickHoverRefresh) {
      const hoverCx = upXy.cx;
      const hoverCy = upXy.cy;
      try {
        state.hoverRafId = timers.requestAnimationFrame(() => {
          state.hoverRafId = 0;
          if (state.disposed) return;
          const refreshCx = state.hoverMoveQueued ? state.hoverLastCx : hoverCx;
          const refreshCy = state.hoverMoveQueued ? state.hoverLastCy : hoverCy;
          state.hoverMoveQueued = false;
          refreshCanvasHoverAtClientPoint({
            App,
            deps,
            state,
            rectOps,
            applyHoverCursorFromResult,
            cx: refreshCx,
            cy: refreshCy,
            rectMaxAgeMs: 0,
            invalidateRectCache: true,
            syncPickingMatrices: true,
            op: source === 'keyboard' ? 'hover.refreshAfterKeyboardCommit' : 'hover.refreshAfterClick',
          });
          try {
            if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
          } catch (err) {
            reportCanvasInteractionsNonFatal(
              App,
              source === 'keyboard'
                ? 'triggerRender(hover.refreshAfterKeyboardCommit)'
                : 'triggerRender(hover.refreshAfterClick)',
              err
            );
          }
        });
      } catch (err) {
        reportCanvasInteractionsNonFatal(
          App,
          source === 'keyboard'
            ? 'hover.scheduleRefreshAfterKeyboardCommit'
            : 'hover.scheduleRefreshAfterClick',
          err
        );
      }
    }

    return clickNdc !== null;
  };

  const onPointerDown: EventListener = e => {
    try {
      const xy = getClientXY(e, App);
      if (!xy) return;
      state.downX = xy.cx;
      state.downY = xy.cy;
      state.downPointerId = xy.pointerId;
      state.hasDown = true;
      cancelCanvasPostBuildHoverRefresh(App);

      try {
        if (typeof deps.domEl.setPointerCapture === 'function' && typeof xy.pointerId === 'number') {
          deps.domEl.setPointerCapture(xy.pointerId);
        }
      } catch (err) {
        reportCanvasInteractionsNonFatal(App, 'pointerDown.capture', err);
      }
    } catch {
      state.hasDown = false;
      state.downPointerId = null;
    }

    rectOps.invalidateRectCache();

    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'pointerDown.triggerRender', err);
    }
  };

  const onPointerUp: EventListener = e => {
    let isClick = true;
    let upXy: ReturnType<typeof getClientXY> = null;

    try {
      upXy = getClientXY(e, App);
      if (upXy && state.hasDown) {
        if (state.downPointerId != null && upXy.pointerId != null && state.downPointerId !== upXy.pointerId)
          return;

        const dx = Math.abs(upXy.cx - state.downX);
        const dy = Math.abs(upXy.cy - state.downY);
        if (dx > opts.clickMaxDistPx || dy > opts.clickMaxDistPx) isClick = false;
      }
    } catch {
      // pointer-compatibility: coordinate probing may fail on exotic events; preserve the conservative click decision.
    }

    state.hasDown = false;
    state.downPointerId = null;
    rectOps.invalidateRectCache();

    if (opts.notesClickFirst && callNotesFirst(App)) return;
    if (!isClick) {
      cancelCanvasPostBuildHoverRefresh(App);
      return;
    }

    if (upXy) commitAtClientPoint(upXy, 'pointer');
  };

  const onPointerCancel: EventListener = () => {
    state.hasDown = false;
    state.downPointerId = null;
    rectOps.invalidateRectCache();
    cancelCanvasPostBuildHoverRefresh(App);
  };

  const onWheel: EventListener = () => {
    rectOps.invalidateRectCache();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'wheel.triggerRender', err);
    }
  };

  const onClick: EventListener = () => {
    rectOps.invalidateRectCache();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'click.triggerRender', err);
    }
  };

  const onMoveRender: EventListener = () => {
    const now = Date.now();
    rectOps.invalidateRectCache();
    if (now - state.lastMoveAt > opts.moveThrottleMs) {
      state.lastMoveAt = now;
      try {
        if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
      } catch (err) {
        reportCanvasInteractionsNonFatal(App, 'move.triggerRender', err);
      }
    }
  };

  const commitKeyboardAtClientPoint = (cx: number, cy: number): boolean =>
    commitAtClientPoint({ cx, cy, pointerId: null }, 'keyboard');

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onWheel,
    onClick,
    onMoveRender,
    commitKeyboardAtClientPoint,
  };
}
