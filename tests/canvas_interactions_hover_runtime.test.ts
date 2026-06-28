import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CANVAS_HOVER_CURSOR_PRESERVE,
  createCanvasInteractionState,
  createHoverCursorApplier,
  createRectCacheOps,
} from '../esm/native/ui/interactions/canvas_interactions_shared.ts';
import { createCanvasHoverInteractionOps } from '../esm/native/ui/interactions/canvas_interactions_hover.ts';
import {
  consumeCanvasPostBuildHoverRefresh,
  requestCanvasPostBuildHoverRefresh,
} from '../esm/native/runtime/canvas_interaction_flags.ts';

function createDomEl() {
  return {
    style: { cursor: '' },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 100, height: 50 };
    },
    addEventListener() {},
    removeEventListener() {},
  } as any;
}

function createApp() {
  const rafQueue: Array<(ts: number) => void> = [];
  const cancelled: number[] = [];
  const hideCalls: string[] = [];
  const App = {
    render: {},
    deps: {
      browser: {
        requestAnimationFrame(cb: (ts: number) => void) {
          rafQueue.push(cb);
          return rafQueue.length;
        },
        cancelAnimationFrame(id: number) {
          cancelled.push(id);
        },
      },
    },
    services: {
      builder: {
        renderOps: {
          hideSketchPlacementPreview() {
            hideCalls.push('sketch');
          },
          hideInteriorLayoutHoverPreview() {
            hideCalls.push('layout');
          },
        },
      },
    },
  } as any;
  return { App, rafQueue, cancelled, hideCalls };
}

test('canvas hover interactions queue one RAF and use the latest pointer position for hover NDC', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const hoverCalls: Array<{ x: number; y: number }> = [];
  const { App, rafQueue } = createApp();

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender() {
        return undefined;
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y });
        return true;
      },
    },
    state,
    rectOps
  );

  ops.onPointerMove({ clientX: 30, clientY: 30, pointerId: 1 } as any);
  ops.onPointerMove({ clientX: 60, clientY: 45, pointerId: 1 } as any);

  assert.equal(rafQueue.length, 1);
  assert.equal(state.hoverMoveQueued, true);

  rafQueue[0]?.(16);

  assert.equal(state.hoverMoveQueued, false);
  assert.deepEqual(hoverCalls, [{ x: 0, y: 0 }]);
  assert.equal(domEl.style.cursor, 'pointer');
});

test('canvas hover interactions retarget a pending post-build hover refresh to the latest pointer position', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const { App, rafQueue } = createApp();
  requestCanvasPostBuildHoverRefresh(App, -0.6, 0.6, 'test.pending');

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender() {
        return undefined;
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC() {
        return true;
      },
    },
    state,
    rectOps
  );

  ops.onPointerMove({ clientX: 60, clientY: 45, pointerId: 1 } as any);

  assert.equal(rafQueue.length, 1);
  const pending = consumeCanvasPostBuildHoverRefresh(App);
  assert.equal(pending?.ndcX, 0);
  assert.equal(pending?.ndcY, 0);
  assert.equal(pending?.reason, 'test.pending');
});

test('canvas hover pointerleave cancels queued hover work, clears previews, and triggers a render refresh', () => {
  const domEl = createDomEl();
  domEl.style.cursor = 'pointer';
  const state = createCanvasInteractionState();
  state.hoverRafId = 1;
  state.hoverMoveQueued = true;
  state.cursorManaged = true;

  const rectOps = createRectCacheOps(domEl, state);
  const renderCalls: boolean[] = [];
  const { App, cancelled, hideCalls } = createApp();

  const ops = createCanvasHoverInteractionOps(
    App,
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(updateShadows === true);
      },
      handleCanvasClickNDC() {
        return null;
      },
      handleCanvasHoverNDC() {
        return null;
      },
    },
    state,
    rectOps
  );

  ops.onPointerLeave({} as any);

  assert.deepEqual(cancelled, [1]);
  assert.equal(state.hoverRafId, 0);
  assert.equal(state.hoverMoveQueued, false);
  assert.equal(state.hasDown, false);
  assert.equal(state.downPointerId, null);
  assert.equal(domEl.style.cursor, '');
  assert.deepEqual(hideCalls, ['sketch', 'layout']);
  assert.deepEqual(renderCalls, [false]);
});

test('canvas hover cursor applier can preserve a precision edit cursor', () => {
  const domEl = createDomEl();
  domEl.style.cursor = 'url(point-cross.svg) 12 12, crosshair';
  const state = createCanvasInteractionState();
  state.cursorManaged = true;
  const { App } = createApp();

  const applyHoverCursor = createHoverCursorApplier(App, domEl, state);
  applyHoverCursor(CANVAS_HOVER_CURSOR_PRESERVE);

  assert.equal(domEl.style.cursor, 'url(point-cross.svg) 12 12, crosshair');
  assert.equal(state.cursorManaged, true);
});
