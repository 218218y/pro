import type { AppContainer } from '../../../../types';
import {
  callNotesFirst,
  getClientXY,
  reportCanvasInteractionsNonFatal,
  toNdcFromClient,
  type CanvasInteractionState,
  type CanvasInteractionsDeps,
  type CanvasInteractionsOptions,
} from './canvas_interactions_shared.js';

export function createCanvasPointerInteractionOps(
  App: AppContainer,
  deps: CanvasInteractionsDeps,
  state: CanvasInteractionState,
  opts: Required<CanvasInteractionsOptions>,
  rectOps: {
    invalidateRectCache: () => void;
    readRectCached: (
      maxAgeMs?: number
    ) => { left: number; top: number; width: number; height: number } | null;
  }
) {
  const onPointerDown: EventListener = e => {
    try {
      const xy = getClientXY(e);
      if (!xy) return;
      state.downX = xy.cx;
      state.downY = xy.cy;
      state.downPointerId = xy.pointerId;
      state.hasDown = true;

      try {
        if (typeof deps.domEl.setPointerCapture === 'function' && typeof xy.pointerId === 'number') {
          deps.domEl.setPointerCapture(xy.pointerId);
        }
      } catch (err) {
        reportCanvasInteractionsNonFatal('pointerDown.capture', err);
      }
    } catch {
      state.hasDown = false;
      state.downPointerId = null;
    }

    rectOps.invalidateRectCache();

    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal('pointerDown.triggerRender', err);
    }
  };

  const onPointerUp: EventListener = e => {
    let isClick = true;

    try {
      const xy = getClientXY(e);
      if (xy && state.hasDown) {
        if (state.downPointerId != null && xy.pointerId != null && state.downPointerId !== xy.pointerId)
          return;

        const dx = Math.abs(xy.cx - state.downX);
        const dy = Math.abs(xy.cy - state.downY);
        if (dx > opts.clickMaxDistPx || dy > opts.clickMaxDistPx) isClick = false;
      }
    } catch {
      // swallow
    }

    state.hasDown = false;
    state.downPointerId = null;
    rectOps.invalidateRectCache();

    if (opts.notesClickFirst && callNotesFirst(App)) return;
    if (!isClick) return;

    try {
      const rect = rectOps.readRectCached(24);
      const xy = getClientXY(e);
      const ndc = rect && xy ? toNdcFromClient(xy.cx, xy.cy, rect) : null;
      if (ndc && typeof deps.handleCanvasClickNDC === 'function') {
        deps.handleCanvasClickNDC(ndc.x, ndc.y, App);
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal('click', err);
    }

    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal('triggerRender(click)', err);
    }
  };

  const onPointerCancel: EventListener = () => {
    state.hasDown = false;
    state.downPointerId = null;
    rectOps.invalidateRectCache();
  };

  const onWheel: EventListener = () => {
    rectOps.invalidateRectCache();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(false);
    } catch (err) {
      reportCanvasInteractionsNonFatal('wheel.triggerRender', err);
    }
  };

  const onClick: EventListener = () => {
    rectOps.invalidateRectCache();
    try {
      if (typeof deps.triggerRender === 'function') deps.triggerRender(true);
    } catch (err) {
      reportCanvasInteractionsNonFatal('click.triggerRender', err);
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
        reportCanvasInteractionsNonFatal('move.triggerRender', err);
      }
    }
  };

  return { onPointerDown, onPointerUp, onPointerCancel, onWheel, onClick, onMoveRender };
}
