import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCanvasPickingClickHitState } from '../esm/native/services/canvas_picking_click_hit_flow.ts';

function createRaycaster(intersects: any[]) {
  return {
    lastMouse: null as any,
    lastCamera: null as any,
    lastObjects: null as any,
    setFromCamera(mouse: any, camera: unknown) {
      this.lastMouse = { ...mouse };
      this.lastCamera = camera;
    },
    intersectObjects(objects: unknown, _recursive?: boolean, optionalTarget?: any[]) {
      this.lastObjects = objects;
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects.slice();
    },
  };
}

function createApp(overrides: Record<string, unknown> = {}) {
  const state = {
    ui: { stackSplitEnabled: false },
    config: {},
    mode: { primary: 'none' },
    runtime: {},
    meta: {},
    ...(overrides.state as object),
  };
  return {
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
    },
    render: {
      camera: { updateMatrixWorld() {} },
      scene: {},
      wardrobeGroup: { children: [] as unknown[] },
    },
    services: {
      runtimeCache: {},
      ...(overrides.services as object),
    },
    ...(overrides.app as object),
  } as any;
}

test('click hit flow promotes generic bottom corner hits to a specific corner cell via selector ownership', () => {
  const selectorBottom = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 'corner:1', __wpStack: 'bottom' },
    parent: null,
  };
  const cornerFace = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: { moduleIndex: 'corner', __wpStack: 'bottom' },
    parent: null,
  };

  const intersects = [
    { object: selectorBottom, point: { y: -4 } },
    { object: cornerFace, point: { y: -4 } },
  ];
  const raycaster = createRaycaster(intersects);
  const mouse = { x: 0, y: 0 };
  const App = createApp();

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0.1,
    ndcY: 0.2,
    isRemoveDoorMode: false,
    raycaster,
    mouse,
  });

  assert.ok(hitState);
  assert.equal(hitState?.foundModuleIndex, 'corner:1');
  assert.equal(hitState?.foundModuleStack, 'bottom');
  assert.equal(hitState?.primaryHitObject, cornerFace);
  assert.equal(hitState?.moduleHitY, -4);
  assert.deepEqual(raycaster.lastMouse, { x: 0.1, y: 0.2 });
});

test('click hit flow repairs stack choice from fallback hit y and promotes the matching selector candidate', () => {
  const selectorTop = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 5, __wpStack: 'top' },
    parent: null,
  };
  const body = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {},
    parent: null,
  };
  const selectorBottom = {
    type: 'Mesh',
    userData: { isModuleSelector: true, moduleIndex: 7, __wpStack: 'bottom' },
    parent: null,
  };

  const intersects = [
    { object: selectorTop, point: { y: 3 } },
    { object: body, point: { y: -6 } },
    { object: selectorBottom, point: { y: -6 } },
  ];
  const raycaster = createRaycaster(intersects);
  const mouse = { x: 0, y: 0 };
  const App = createApp({
    state: { ui: { stackSplitEnabled: true } },
    services: { runtimeCache: { stackSplitLowerTopY: 0 } },
  });

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster,
    mouse,
  });

  assert.ok(hitState);
  assert.equal(hitState?.foundModuleIndex, 7);
  assert.equal(hitState?.foundModuleStack, 'bottom');
  assert.equal(hitState?.primaryHitObject, body);
  assert.equal(hitState?.primaryHitY, -6);
});

test('click hit flow carries door face metadata into canonical hit identity', () => {
  const doorFace = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {
      partId: 'd1_full',
      surfaceId: 'door:d1:inside',
      faceSide: 'inside',
      faceSign: -1,
      splitPart: 'full',
    },
    parent: null,
  };

  const intersects = [{ object: doorFace, point: { x: 1, y: 2, z: 3 } }];
  const raycaster = createRaycaster(intersects);
  const mouse = { x: 0, y: 0 };
  const App = createApp();

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster,
    mouse,
  });

  assert.ok(hitState?.hitIdentity);
  assert.equal(hitState.hitIdentity?.targetKind, 'door');
  assert.equal(hitState.hitIdentity?.partId, 'd1_full');
  assert.equal(hitState.hitIdentity?.doorId, 'd1');
  assert.equal(hitState.hitIdentity?.surfaceId, 'door:d1:inside');
  assert.equal(hitState.hitIdentity?.faceSide, 'inside');
  assert.equal(hitState.hitIdentity?.faceSign, -1);
  assert.equal(hitState.hitIdentity?.splitPart, 'full');
});

test('click hit flow merges surface child metadata with parent door identity', () => {
  const doorGroup = {
    type: 'Group',
    userData: { partId: 'd2_full' },
    parent: null,
  } as any;
  const faceMesh = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {
      surfaceId: 'door:d2:outside',
      faceSide: 'outside',
      faceSign: 1,
    },
    parent: doorGroup,
  };

  const intersects = [{ object: faceMesh, point: { x: 0, y: 4, z: 0 } }];
  const raycaster = createRaycaster(intersects);
  const mouse = { x: 0, y: 0 };
  const App = createApp();

  const hitState = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster,
    mouse,
  });

  assert.ok(hitState?.hitIdentity);
  assert.equal(hitState.hitIdentity?.partId, 'd2_full');
  assert.equal(hitState.hitIdentity?.doorId, 'd2');
  assert.equal(hitState.hitIdentity?.surfaceId, 'door:d2:outside');
  assert.equal(hitState.hitIdentity?.faceSide, 'outside');
  assert.equal(hitState.hitIdentity?.faceSign, 1);
});
