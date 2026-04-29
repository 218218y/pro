import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCanvasPickingClickHitState } from '../esm/native/services/canvas_picking_click_hit_flow.ts';
import { __isEligiblePaintIntersect } from '../esm/native/services/canvas_picking_door_hover_targets_hit_paint.ts';

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

test('click hit flow ignores fully transparent material arrays outside remove-door mode', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'wardrobe-root' },
    children: [] as unknown[],
    parent: null,
  };
  const transparentDoorGroup = {
    type: 'Group',
    userData: { partId: 'd9_full', __wpDoorRemoved: true },
    children: [] as unknown[],
    parent: wardrobeGroup,
  };
  const transparentDoorFace = {
    type: 'Mesh',
    material: [{ visible: true, opacity: 0 }],
    userData: {},
    parent: transparentDoorGroup,
  };
  const visiblePanel = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: { partId: 'body_left' },
    parent: wardrobeGroup,
  };
  transparentDoorGroup.children.push(transparentDoorFace);
  wardrobeGroup.children.push(transparentDoorGroup, visiblePanel);

  const hitState = resolveCanvasPickingClickHitState({
    App: createApp({ app: { render: { camera: {}, scene: {}, wardrobeGroup } } }),
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster: createRaycaster([
      { object: transparentDoorFace, point: { x: 0, y: 1, z: 0 } },
      { object: visiblePanel, point: { x: 0, y: 0.2, z: 0 } },
    ]),
    mouse: { x: 0, y: 0 },
  });

  assert.ok(hitState);
  assert.equal(hitState?.primaryHitObject, visiblePanel);
  assert.equal(hitState?.foundPartId, 'body_left');
  assert.equal(hitState?.effectiveDoorId, null);
});

test('click hit flow accepts transparent restore targets only when the removed-door owner is tagged', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'wardrobe-root' },
    children: [] as unknown[],
    parent: null,
  };
  const transparentHelper = {
    type: 'Mesh',
    material: { visible: true, opacity: 0 },
    userData: { partId: 'body_left' },
    parent: wardrobeGroup,
  };
  const removedDoorGroup = {
    type: 'Group',
    userData: { partId: 'd10_full', __wpDoorRemoved: true },
    children: [] as unknown[],
    parent: wardrobeGroup,
  };
  const removedDoorFace = {
    type: 'Mesh',
    material: { visible: true, opacity: 0 },
    userData: {},
    parent: removedDoorGroup,
  };
  removedDoorGroup.children.push(removedDoorFace);
  wardrobeGroup.children.push(transparentHelper, removedDoorGroup);

  const hitState = resolveCanvasPickingClickHitState({
    App: createApp({ app: { render: { camera: {}, scene: {}, wardrobeGroup } } }),
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: true,
    raycaster: createRaycaster([
      { object: transparentHelper, point: { x: 0, y: 1, z: 0 } },
      { object: removedDoorFace, point: { x: 0, y: 0.2, z: 0 } },
    ]),
    mouse: { x: 0, y: 0 },
  });

  assert.ok(hitState);
  assert.equal(hitState?.primaryHitObject, removedDoorFace);
  assert.equal(hitState?.foundPartId, 'd10_full');
  assert.equal(hitState?.effectiveDoorId, 'd10_full');
});

test('hover eligibility treats transparent material arrays as restore targets only for removed doors', () => {
  const App = createApp();
  const viewportRoot = { type: 'Group', userData: { partId: 'root' }, parent: null };
  const removedDoorGroup = {
    type: 'Group',
    userData: { partId: 'd11_full', __wpDoorRemoved: true },
    parent: viewportRoot,
  };
  const removedDoorFace = {
    type: 'Mesh',
    material: [{ visible: true, opacity: 0 }],
    userData: {},
    parent: removedDoorGroup,
  };
  const helperFace = {
    type: 'Mesh',
    material: [{ visible: true, opacity: 0 }],
    userData: { partId: 'body_left' },
    parent: viewportRoot,
  };
  const isViewportRoot = (_App: unknown, node: unknown) => node === viewportRoot;

  assert.equal(
    __isEligiblePaintIntersect({
      App,
      hit: { object: removedDoorFace },
      isViewportRoot,
      allowTransparentRestoreTargets: false,
    }),
    false
  );
  assert.equal(
    __isEligiblePaintIntersect({
      App,
      hit: { object: removedDoorFace },
      isViewportRoot,
      allowTransparentRestoreTargets: true,
    }),
    true
  );
  assert.equal(
    __isEligiblePaintIntersect({
      App,
      hit: { object: helperFace },
      isViewportRoot,
      allowTransparentRestoreTargets: true,
    }),
    false
  );
});
