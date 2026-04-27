import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCanvasInteractionState,
  createRectCacheOps,
} from '../esm/native/ui/interactions/canvas_interactions_shared.ts';
import { createCanvasPointerInteractionOps } from '../esm/native/ui/interactions/canvas_interactions_pointer.ts';

function createDomEl() {
  const captures: number[] = [];
  return {
    style: { cursor: '' },
    captures,
    setPointerCapture(pointerId: number) {
      captures.push(pointerId);
    },
    getBoundingClientRect() {
      return { left: 10, top: 20, width: 100, height: 50 };
    },
    addEventListener() {},
    removeEventListener() {},
  } as any;
}

function createApp(notesDrawMode = false) {
  return {
    notes: {
      draw: {
        isScreenDrawMode: notesDrawMode,
      },
    },
  } as any;
}

test('canvas pointer interactions convert stable clicks into NDC hits and trigger renders', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const renderCalls: boolean[] = [];
  const clickCalls: Array<{ x: number; y: number }> = [];

  const ops = createCanvasPointerInteractionOps(
    createApp(false),
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(updateShadows === true);
      },
      handleCanvasClickNDC(x: number, y: number) {
        clickCalls.push({ x, y });
      },
      handleCanvasHoverNDC() {
        return null;
      },
    },
    state,
    { clickMaxDistPx: 5, moveThrottleMs: 20, notesClickFirst: true },
    rectOps
  );

  ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 7 } as any);
  assert.equal(state.hasDown, true);
  assert.deepEqual(domEl.captures, [7]);

  ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 7 } as any);

  assert.equal(state.hasDown, false);
  assert.deepEqual(clickCalls, [{ x: 0, y: 0 }]);
  assert.deepEqual(renderCalls, [true, true]);
});

test('canvas pointer interactions honor notes-first mode and throttle move renders', () => {
  const realNow = Date.now;
  let nowMs = 1_000;
  Date.now = () => nowMs;

  try {
    const domEl = createDomEl();
    const state = createCanvasInteractionState();
    const rectOps = createRectCacheOps(domEl, state);
    const renderCalls: boolean[] = [];
    const clickCalls: Array<{ x: number; y: number }> = [];

    const ops = createCanvasPointerInteractionOps(
      createApp(true),
      {
        domEl,
        triggerRender(updateShadows?: boolean) {
          renderCalls.push(updateShadows === true);
        },
        handleCanvasClickNDC(x: number, y: number) {
          clickCalls.push({ x, y });
        },
        handleCanvasHoverNDC() {
          return null;
        },
      },
      state,
      { clickMaxDistPx: 5, moveThrottleMs: 20, notesClickFirst: true },
      rectOps
    );

    ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 1 } as any);
    ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 1 } as any);
    assert.deepEqual(clickCalls, []);
    assert.deepEqual(renderCalls, [true]);

    ops.onMoveRender({} as any);
    nowMs = 1_010;
    ops.onMoveRender({} as any);
    nowMs = 1_050;
    ops.onMoveRender({} as any);
    ops.onWheel({} as any);

    assert.deepEqual(renderCalls, [true, false, false, false]);
  } finally {
    Date.now = realNow;
  }
});
