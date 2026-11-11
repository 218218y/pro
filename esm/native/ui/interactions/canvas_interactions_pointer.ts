import type { AppContainer } from '../../../../types';
import {
  cancelCanvasPostBuildHoverRefresh,
  consumeSuppressNextCanvasPostClickHoverRefresh,
  getViewportCameraControls,
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
  type PointerInfo,
} from './canvas_interactions_shared.js';

const KEYBOARD_PAN_STEP_PX = 24;
const KEYBOARD_PAN_DELTAS = new Map<string, readonly [number, number]>([
  ['ArrowUp', [0, KEYBOARD_PAN_STEP_PX]],
  ['ArrowDown', [0, -KEYBOARD_PAN_STEP_PX]],
  ['ArrowLeft', [KEYBOARD_PAN_STEP_PX, 0]],
  ['ArrowRight', [-KEYBOARD_PAN_STEP_PX, 0]],
]);

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

  const isNearClickStart = (point: PointerInfo, start: NonNullable<CanvasInteractionState['clickStart']>) =>
    Math.abs(point.cx - start.cx) <= start.maxDistPx && Math.abs(point.cy - start.cy) <= start.maxDistPx;

  const onPointerDown = (event: PointerEvent): void => {
    state.clickStart = null;
    cancelCanvasPostBuildHoverRefresh(App);
    try {
      const xy = getClientXY(event, App);
      if (!xy) return;
      if (event.isPrimary && event.button === 0) {
        // OrbitControls pans on modified left drags. A stationary Shift+click
        // still commits an axis-locked authoring preview.
        const pansOnDrag =
          event.pointerType === 'mouse' && (event.shiftKey || event.ctrlKey || event.metaKey);
        state.clickStart = { ...xy, maxDistPx: pansOnDrag ? 0 : opts.clickMaxDistPx };
      }

      try {
        if (typeof deps.domEl.setPointerCapture === 'function' && typeof xy.pointerId === 'number') {
          deps.domEl.setPointerCapture(xy.pointerId);
        }
      } catch (err) {
        reportCanvasInteractionsNonFatal(App, 'pointerDown.capture', err);
      }
    } catch {
      state.clickStart = null;
    }

    rectOps.invalidateRectCache();

    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'pointerDown.triggerRender', err);
    }
  };

  const onPointerUp = (event: PointerEvent): void => {
    const start = state.clickStart;
    state.clickStart = null;
    rectOps.invalidateRectCache();

    const point = getClientXY(event, App);
    if (
      !start ||
      !event.isPrimary ||
      event.button !== 0 ||
      !point ||
      point.pointerId !== start.pointerId ||
      !isNearClickStart(point, start)
    ) {
      cancelCanvasPostBuildHoverRefresh(App);
      return;
    }

    if (opts.notesClickFirst && callNotesFirst(App)) return;
    commitAtClientPoint(point, 'pointer');
  };

  const onPointerCancel: EventListener = () => {
    state.clickStart = null;
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

  const onMoveRender = (event: PointerEvent): void => {
    const start = state.clickStart;
    if (start && event.pointerId === start.pointerId) {
      const point = getClientXY(event, App);
      if (event.buttons !== 1 || !point || !isNearClickStart(point, start)) state.clickStart = null;
    }
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

  const onNavigationKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const delta = KEYBOARD_PAN_DELTAS.get(event.key);
    if (!delta) return;
    const controls = getViewportCameraControls(App)?.controls;
    if (!controls?.enabled || !controls.enablePan || !controls.pan) return;
    event.preventDefault();
    try {
      controls.pan(...delta);
      deps.triggerRender(false);
    } catch (err) {
      reportCanvasInteractionsNonFatal(App, 'keyboardPan', err);
    }
  };

  return {
    onPointerDown,
    onPointerUp,
    onPointerCancel,
    onWheel,
    onClick,
    onMoveRender,
    onNavigationKeyDown,
    commitKeyboardAtClientPoint,
  };
}
