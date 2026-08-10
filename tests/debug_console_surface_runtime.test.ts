import test from 'node:test';
import assert from 'node:assert/strict';

import { createDebugConsoleSurface } from '../esm/native/runtime/debug_console_surface.ts';
import { runPlatformRenderFollowThrough } from '../esm/native/runtime/platform_access.ts';

test('debug console surface runtime: render debug helpers expose canonical render budget and reset flow', () => {
  const App: any = {
    services: {
      platform: {
        ensureRenderLoop() {},
      },
    },
  };

  runPlatformRenderFollowThrough(App, { updateShadows: false });
  runPlatformRenderFollowThrough(App, { updateShadows: false, ensureRenderLoop: false });

  const surface = createDebugConsoleSurface(App);
  assert.deepEqual(surface.render.getStats(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
  assert.deepEqual(surface.render.getBudget(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
    renderNoOpRate: 0.5,
    wakeupNoOpRate: 0,
    renderEnsureFollowThroughRate: 0.5,
  });

  assert.deepEqual(surface.render.resetStats(), {
    renderRequestCount: 2,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 1,
    noOpRenderRequestCount: 1,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
  assert.deepEqual(surface.render.getStats(), {
    renderRequestCount: 0,
    triggerRenderCount: 0,
    ensureRenderLoopCount: 0,
    noOpRenderRequestCount: 0,
    wakeupRequestCount: 0,
    wakeupEnsureRenderLoopCount: 0,
    noOpWakeupCount: 0,
    activityTouchCount: 0,
    afterTouchCount: 0,
    ensureRenderLoopAfterTriggerCount: 0,
  });
});

test('debug console surface runtime: canvas helpers route through canonical canvas-picking handlers', () => {
  const clickCalls: Array<[number, number]> = [];
  const hoverCalls: Array<[number, number]> = [];
  const App: any = {
    services: {
      canvasPicking: {
        handleClickNDC(x: number, y: number) {
          clickCalls.push([x, y]);
        },
        handleHoverNDC(x: number, y: number) {
          hoverCalls.push([x, y]);
        },
      },
    },
  };

  const surface = createDebugConsoleSurface(App);
  assert.equal(surface.canvas.clickNdc(2, -2), true);
  assert.equal(surface.canvas.hoverNdc(0.25, -0.5), true);
  assert.equal(surface.canvas.inspectNdc(0.4, 0.2), null);
  assert.deepEqual(clickCalls, [[1, -1]]);
  assert.deepEqual(hoverCalls, [[0.25, -0.5]]);
});

test('debug console surface runtime: scene helper exposes deterministic wardrobe geometry without App', () => {
  const panel: any = {
    name: 'panel',
    visible: true,
    parent: null,
    children: [],
    position: { x: 0, y: 1, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    userData: { partId: 'body_top' },
    isMesh: true,
    geometry: {
      attributes: {
        position: {
          array: new Float32Array([-1, 0, -1, 1, 0, 1]),
          itemSize: 3,
          count: 2,
        },
      },
    },
    add() {},
    remove() {},
  };
  const wardrobeGroup: any = {
    name: 'App.render.wardrobeGroup',
    visible: true,
    parent: null,
    children: [panel],
    position: { x: 0, y: 0, z: 0 },
    rotation: { x: 0, y: 0, z: 0 },
    scale: { x: 1, y: 1, z: 1 },
    userData: {},
    add() {},
    remove() {},
  };
  panel.parent = wardrobeGroup;

  const surface = createDebugConsoleSurface({ render: { wardrobeGroup } } as any);
  const snapshot = surface.scene.getGeometrySnapshot();

  assert.ok(snapshot);
  assert.equal(snapshot.summary.nodeCount, 2);
  assert.equal(snapshot.summary.geometryCount, 1);
  assert.equal(snapshot.summary.vertexCount, 2);
  assert.deepEqual(snapshot.partIds, ['body_top']);
  assert.deepEqual(snapshot.violations, []);
  assert.match(snapshot.fingerprint, /^scene-v1-[0-9a-f]{8}$/u);
});
