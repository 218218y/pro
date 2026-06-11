// Shared helpers for canvas interaction routing.

import type { AppContainer } from '../../../../types';
import { clearSketchHoverPreview, getBrowserTimers, getBuilderRenderOps } from '../../services/api.js';

export type Ndc = { x: number; y: number };
export type RectLike = { left: number; top: number; width: number; height: number };

export type CanvasInteractionsDeps = {
  domEl: HTMLElement;
  triggerRender: (updateShadows?: boolean) => void;
  handleCanvasClickNDC: (x: number, y: number, App: AppContainer) => unknown;
  handleCanvasHoverNDC: (x: number, y: number, App: AppContainer) => unknown;
};

export type CanvasInteractionsOptions = {
  clickMaxDistPx?: number;
  moveThrottleMs?: number;
  notesClickFirst?: boolean;
};

export type PointerInfo = { cx: number; cy: number; pointerId: number | null };
export type CanvasInteractionState = {
  downX: number;
  downY: number;
  hasDown: boolean;
  downPointerId: number | null;
  lastMoveAt: number;
  cursorManaged: boolean;
  hoverRafId: number;
  hoverMoveQueued: boolean;
  hoverLastCx: number;
  hoverLastCy: number;
  rectCache: RectLike | null;
  rectCacheAt: number;
  disposed: boolean;
};

const __canvasInteractionsReportNonFatalSeen = new Map<string, number>();

export function reportCanvasInteractionsNonFatal(op: string, err: unknown, throttleMs = 4000): void {
  const now = Date.now();
  let msg = 'unknown';
  if (typeof err === 'string') msg = err;
  else if (typeof err === 'number' || typeof err === 'boolean') msg = String(err);
  else if (err && typeof err === 'object') {
    const e = readRecord(err);
    if (e && typeof e.stack === 'string' && e.stack) msg = e.stack.split('\n')[0] || e.stack;
    else if (e && typeof e.message === 'string' && e.message) msg = e.message;
  }
  const key = `${op}::${msg}`;
  const prev = __canvasInteractionsReportNonFatalSeen.get(key) || 0;
  if (throttleMs > 0 && prev && now - prev < throttleMs) return;
  __canvasInteractionsReportNonFatalSeen.set(key, now);
  if (__canvasInteractionsReportNonFatalSeen.size > 600) {
    const pruneOlderThan = Math.max(10000, throttleMs * 4);
    for (const [k, ts] of __canvasInteractionsReportNonFatalSeen) {
      if (now - ts > pruneOlderThan) __canvasInteractionsReportNonFatalSeen.delete(k);
    }
  }
  console.error(`[WardrobePro][canvas_interactions] ${op}`, err);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

export function createCanvasInteractionState(): CanvasInteractionState {
  return {
    downX: 0,
    downY: 0,
    hasDown: false,
    downPointerId: null,
    lastMoveAt: 0,
    cursorManaged: false,
    hoverRafId: 0,
    hoverMoveQueued: false,
    hoverLastCx: 0,
    hoverLastCy: 0,
    rectCache: null,
    rectCacheAt: 0,
    disposed: false,
  };
}

export function getClientXY(e: Event): PointerInfo | null {
  try {
    const rec = readRecord(e);
    const clientX = rec?.clientX;
    const clientY = rec?.clientY;
    if (typeof clientX === 'number' && typeof clientY === 'number') {
      const pid = typeof rec?.pointerId === 'number' ? rec.pointerId : null;
      return { cx: clientX, cy: clientY, pointerId: pid };
    }
  } catch (err) {
    reportCanvasInteractionsNonFatal('clientXY', err);
  }
  return null;
}

export function toNdcFromClient(cx: number, cy: number, rect: RectLike): Ndc | null {
  try {
    const w = rect && rect.width ? rect.width : 0;
    const h = rect && rect.height ? rect.height : 0;
    if (!w || !h) return null;

    const x = ((cx - rect.left) / w) * 2 - 1;
    const y = -((cy - rect.top) / h) * 2 + 1;
    return { x, y };
  } catch {
    return null;
  }
}

export function safeSetCursor(domEl: HTMLElement, cursor: string): void {
  try {
    if (domEl.style.cursor === cursor) return;
    domEl.style.cursor = cursor;
  } catch (err) {
    reportCanvasInteractionsNonFatal('cursor', err);
  }
}

export function callNotesFirst(App: AppContainer): boolean {
  try {
    const appRec = readRecord(App);
    const notes = appRec ? readRecord(appRec.notes) : null;
    const draw = notes ? readRecord(notes.draw) : null;
    return draw?.isScreenDrawMode === true;
  } catch (err) {
    reportCanvasInteractionsNonFatal('notes.guard', err);
  }
  return false;
}

export function createRectCacheOps(domEl: HTMLElement, state: CanvasInteractionState) {
  const invalidateRectCache = (): void => {
    state.rectCache = null;
    state.rectCacheAt = 0;
  };

  const readRectCached = (maxAgeMs = 24): RectLike | null => {
    try {
      const now = Date.now();
      if (state.rectCache && now - state.rectCacheAt <= maxAgeMs) return state.rectCache;
      const rect = domEl.getBoundingClientRect();
      state.rectCache = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
      state.rectCacheAt = now;
      return state.rectCache;
    } catch {
      return null;
    }
  };

  return { invalidateRectCache, readRectCached };
}

export function createClearTransientHoverPreview(
  App: AppContainer,
  domEl: HTMLElement,
  state: CanvasInteractionState
) {
  return (): void => {
    try {
      const ro = getBuilderRenderOps(App);
      if (ro && typeof ro.hideSketchPlacementPreview === 'function') {
        ro.hideSketchPlacementPreview({ App, __reason: 'canvas.pointerleave.hideSketchPlacementPreview' });
      }
      if (ro && typeof ro.hideInteriorLayoutHoverPreview === 'function') {
        ro.hideInteriorLayoutHoverPreview({
          App,
          __reason: 'canvas.pointerleave.hideInteriorLayoutHoverPreview',
        });
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal('clearTransientHoverPreview.renderOps', err);
    }

    try {
      clearSketchHoverPreview(App);
    } catch (err) {
      reportCanvasInteractionsNonFatal('clearTransientHoverPreview.sketchHover', err);
    }

    try {
      safeSetCursor(domEl, '');
      state.cursorManaged = false;
    } catch (err) {
      reportCanvasInteractionsNonFatal('clearTransientHoverPreview.cursor', err);
    }
  };
}

export function createHoverCursorApplier(domEl: HTMLElement, state: CanvasInteractionState) {
  return (hoverRes: unknown): void => {
    try {
      if (typeof hoverRes === 'boolean') {
        safeSetCursor(domEl, hoverRes ? 'pointer' : '');
        state.cursorManaged = true;
      } else if (state.cursorManaged) {
        if (domEl.style.cursor === 'pointer') safeSetCursor(domEl, '');
        state.cursorManaged = false;
      }
    } catch (err) {
      reportCanvasInteractionsNonFatal('hover.cursor', err);
    }
  };
}

export function createEventBinding(domEl: HTMLElement) {
  return (type: string, handler: EventListener, opts?: boolean | AddEventListenerOptions) => {
    try {
      domEl.addEventListener(type, handler, opts);
      return () => {
        try {
          domEl.removeEventListener(type, handler, opts);
        } catch {
          // swallow
        }
      };
    } catch (err) {
      reportCanvasInteractionsNonFatal(`add:${type}`, err);
      return () => undefined;
    }
  };
}

export function getInteractionTimers(App: AppContainer) {
  return getBrowserTimers(App);
}
