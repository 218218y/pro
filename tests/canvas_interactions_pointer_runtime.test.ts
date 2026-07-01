import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createCanvasInteractionState,
  createRectCacheOps,
} from '../esm/native/ui/interactions/canvas_interactions_shared.ts';
import {
  consumeCanvasPostBuildHoverRefresh,
  requestSuppressNextCanvasPostClickHoverRefresh,
} from '../esm/native/runtime/canvas_interaction_flags.ts';
import { createCanvasPointerInteractionOps } from '../esm/native/ui/interactions/canvas_interactions_pointer.ts';
import { tryHandleDrawerDividerModeClick } from '../esm/native/services/canvas_picking_drawer_mode_flow_divider.ts';

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

function createRafQueue() {
  let nextId = 1;
  const callbacks = new Map<number, FrameRequestCallback>();
  return {
    requestAnimationFrame(cb: FrameRequestCallback) {
      const id = nextId++;
      callbacks.set(id, cb);
      return id;
    },
    cancelAnimationFrame(id: number) {
      callbacks.delete(id);
    },
    flushFrame(ts = 16) {
      const frame = Array.from(callbacks.entries());
      callbacks.clear();
      for (const [, cb] of frame) cb(ts);
    },
    get size() {
      return callbacks.size;
    },
  };
}

function createApp(notesDrawMode = false, rafQueue?: ReturnType<typeof createRafQueue>) {
  return {
    notes: {
      draw: {
        isScreenDrawMode: notesDrawMode,
      },
    },
    deps: rafQueue
      ? {
          browser: {
            requestAnimationFrame: rafQueue.requestAnimationFrame,
            cancelAnimationFrame: rafQueue.cancelAnimationFrame,
          },
        }
      : undefined,
  } as any;
}

test('canvas pointer interactions convert stable clicks, refresh hover after the post-click render frame, and trigger renders', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const rafQueue = createRafQueue();
  const renderCalls: boolean[] = [];
  const clickCalls: Array<{ x: number; y: number }> = [];
  const matrixCalls: string[] = [];
  const hoverCalls: Array<{
    x: number;
    y: number;
    selected: boolean;
    sceneReady: boolean;
    matrixCalls: string[];
  }> = [];
  let selected = false;
  let sceneReady = false;

  const App = createApp(false, rafQueue);
  App.render = {
    camera: {
      updateWorldMatrix(updateParents: boolean, updateChildren: boolean) {
        matrixCalls.push(`camera:${updateParents}:${updateChildren}`);
      },
    },
    wardrobeGroup: {
      updateWorldMatrix(updateParents: boolean, updateChildren: boolean) {
        matrixCalls.push(`wardrobe:${updateParents}:${updateChildren}`);
      },
    },
  };
  const ops = createCanvasPointerInteractionOps(
    App,
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(updateShadows === true);
        if (selected && updateShadows === true) {
          rafQueue.requestAnimationFrame(() => {
            sceneReady = true;
          });
        }
      },
      handleCanvasClickNDC(x: number, y: number) {
        clickCalls.push({ x, y });
        selected = true;
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y, selected, sceneReady, matrixCalls: [...matrixCalls] });
        return true;
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
  assert.deepEqual(hoverCalls, []);
  assert.deepEqual(renderCalls, [true, true]);
  const pendingPostBuildHover = consumeCanvasPostBuildHoverRefresh(App);
  assert.equal(pendingPostBuildHover?.ndcX, 0);
  assert.equal(pendingPostBuildHover?.ndcY, 0);
  assert.equal(pendingPostBuildHover?.reason, 'canvas.pointer.click.postBuildHover');
  assert.equal(typeof pendingPostBuildHover?.untilMs, 'number');
  assert.equal(rafQueue.size, 2);

  rafQueue.flushFrame();

  assert.deepEqual(hoverCalls, [
    {
      x: 0,
      y: 0,
      selected: true,
      sceneReady: true,
      matrixCalls: ['camera:true:false', 'wardrobe:true:true'],
    },
  ]);
  assert.equal(domEl.style.cursor, 'pointer');
  assert.deepEqual(renderCalls, [true, true, false]);
});

test('canvas pointer interactions do not lose a real pointer move while post-click hover refresh is pending', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const rafQueue = createRafQueue();
  const hoverCalls: Array<{ x: number; y: number; sceneReady: boolean }> = [];
  let selected = false;
  let sceneReady = false;

  const App = createApp(false, rafQueue);
  const ops = createCanvasPointerInteractionOps(
    App,
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        if (selected && updateShadows === true) {
          rafQueue.requestAnimationFrame(() => {
            sceneReady = true;
          });
        }
      },
      handleCanvasClickNDC() {
        selected = true;
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y, sceneReady });
        return true;
      },
    },
    state,
    { clickMaxDistPx: 5, moveThrottleMs: 20, notesClickFirst: true },
    rectOps
  );

  ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 7 } as any);
  ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 7 } as any);

  // Simulates a real pointermove that arrives before the post-click RAF executes.
  // The scheduled post-click refresh must consume the latest pointer position, not stale click coords.
  state.hoverMoveQueued = true;
  state.hoverLastCx = 110;
  state.hoverLastCy = 70;

  rafQueue.flushFrame();

  assert.deepEqual(hoverCalls, [{ x: 1, y: -1, sceneReady: true }]);
  assert.equal(state.hoverMoveQueued, false);
});

test('canvas pointer interactions can suppress the automatic post-click hover refresh for geometry-moving clicks', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const rafQueue = createRafQueue();
  const renderCalls: boolean[] = [];
  const hoverCalls: Array<{ x: number; y: number }> = [];
  const App = createApp(false, rafQueue);

  const ops = createCanvasPointerInteractionOps(
    App,
    {
      domEl,
      triggerRender(updateShadows?: boolean) {
        renderCalls.push(updateShadows === true);
      },
      handleCanvasClickNDC() {
        requestSuppressNextCanvasPostClickHoverRefresh(App, 'test.movesTarget');
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y });
        return true;
      },
    },
    state,
    { clickMaxDistPx: 5, moveThrottleMs: 20, notesClickFirst: true },
    rectOps
  );

  ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 7 } as any);
  ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 7 } as any);

  assert.deepEqual(hoverCalls, []);
  assert.equal(rafQueue.size, 0);
  assert.deepEqual(renderCalls, [true, true]);
  assert.equal(domEl.style.cursor, '');
  assert.equal(consumeCanvasPostBuildHoverRefresh(App), null);
});

test('drawer divider clicks immediately re-run hover at the same pointer after add/remove', () => {
  const domEl = createDomEl();
  const state = createCanvasInteractionState();
  const rectOps = createRectCacheOps(domEl, state);
  const rafQueue = createRafQueue();
  const hoverCalls: Array<{ x: number; y: number; hasDivider: boolean }> = [];
  const openedDrawers: unknown[] = [];
  const App = createApp(false, rafQueue);
  const config: Record<string, any> = { drawerDividersMap: Object.create(null) };
  App.store = {
    getState() {
      return { config, ui: {}, runtime: {}, mode: { opts: {} }, meta: {} };
    },
    patch(patch: Record<string, unknown>) {
      Object.assign(config, patch);
      return patch;
    },
  };
  App.actions = {
    config: {
      setMap(mapName: string, nextMap: Record<string, unknown>) {
        config[mapName] = nextMap;
        App.maps[mapName] = nextMap;
        return nextMap;
      },
    },
  };
  const drawerGroup = { userData: { partId: 'int_4', drawerId: 'int_4' } };
  App.render = {
    drawersArray: [
      {
        id: 'int_4',
        dividerKey: 'div:int_4',
        isInternal: true,
        group: drawerGroup,
      },
    ],
  };
  App.maps = { drawerDividersMap: config.drawerDividersMap };
  App.services = {
    tools: {
      setDrawersOpenId(id: unknown) {
        openedDrawers.push(id);
      },
    },
  };

  const ops = createCanvasPointerInteractionOps(
    App,
    {
      domEl,
      triggerRender() {},
      handleCanvasClickNDC() {
        tryHandleDrawerDividerModeClick({
          App,
          isDividerEditMode: true,
          foundDrawerId: 'int_4',
          foundPartId: 'int_4',
          primaryHitObject: drawerGroup as any,
        });
      },
      handleCanvasHoverNDC(x: number, y: number) {
        hoverCalls.push({ x, y, hasDivider: App.maps.drawerDividersMap['div:int_4'] === true });
        return true;
      },
    },
    state,
    { clickMaxDistPx: 5, moveThrottleMs: 20, notesClickFirst: true },
    rectOps
  );

  ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 7 } as any);
  ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 7 } as any);

  const pendingAfterAdd = consumeCanvasPostBuildHoverRefresh(App);
  assert.equal(pendingAfterAdd?.reason, 'canvas.pointer.click.postBuildHover');
  assert.deepEqual(openedDrawers, ['int_4']);
  assert.equal(rafQueue.size, 1);

  rafQueue.flushFrame();
  assert.deepEqual(hoverCalls, [{ x: 0, y: 0, hasDivider: true }]);

  ops.onPointerDown({ clientX: 60, clientY: 45, pointerId: 7 } as any);
  ops.onPointerUp({ clientX: 60, clientY: 45, pointerId: 7 } as any);

  const pendingAfterRemove = consumeCanvasPostBuildHoverRefresh(App);
  assert.equal(pendingAfterRemove?.reason, 'canvas.pointer.click.postBuildHover');
  assert.equal(rafQueue.size, 1);

  rafQueue.flushFrame();
  assert.deepEqual(hoverCalls, [
    { x: 0, y: 0, hasDivider: true },
    { x: 0, y: 0, hasDivider: false },
  ]);
});

test('drawer divider mode ignores a drawer found behind a clicked door', () => {
  const drawerGroup = { userData: { partId: 'int_4', drawerId: 'int_4' } };
  const doorGroup = { userData: { partId: 'd1_full', doorId: 'd1_full' } };
  const openedDrawers: unknown[] = [];
  const App = createApp(false);
  App.render = {
    drawersArray: [
      {
        id: 'int_4',
        dividerKey: 'div:int_4',
        isInternal: true,
        isOpen: false,
        group: drawerGroup,
      },
    ],
  };
  App.maps = { drawerDividersMap: Object.create(null) };
  App.services = {
    tools: {
      setDrawersOpenId(id: unknown) {
        openedDrawers.push(id);
      },
    },
  };

  assert.equal(
    tryHandleDrawerDividerModeClick({
      App,
      isDividerEditMode: true,
      foundDrawerId: 'int_4',
      foundPartId: 'd1_full',
      primaryHitObject: doorGroup as any,
    }),
    true
  );

  assert.deepEqual(openedDrawers, []);
  assert.equal(App.render.drawersArray[0].isOpen, false);
  assert.equal(App.maps.drawerDividersMap['div:int_4'], undefined);
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
