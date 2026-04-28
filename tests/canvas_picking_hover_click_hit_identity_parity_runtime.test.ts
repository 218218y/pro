import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCanvasPickingClickHitState } from '../esm/native/services/canvas_picking_click_hit_flow.ts';
import { __resolveHoverHitFromRaycastHit } from '../esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts';
import { areCanvasPickingHitIdentitiesEquivalent } from '../esm/native/services/canvas_picking_hit_identity.ts';

function createRaycaster(intersects: any[]) {
  return {
    setFromCamera() {},
    intersectObjects(_objects: unknown, _recursive?: boolean, optionalTarget?: any[]) {
      if (Array.isArray(optionalTarget)) {
        optionalTarget.length = 0;
        optionalTarget.push(...intersects);
        return optionalTarget;
      }
      return intersects.slice();
    },
  };
}

function createApp(wardrobeGroup: any) {
  const state = {
    ui: { stackSplitEnabled: false },
    config: {},
    mode: { primary: 'none' },
    runtime: {},
    meta: {},
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
      scene: { children: [wardrobeGroup] },
      wardrobeGroup,
    },
    services: { runtimeCache: {} },
  } as any;
}

test('hover and click preserve the same child-surface door identity when part id lives on a parent', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'wardrobe-root' },
    children: [] as any[],
    parent: null,
  };
  const doorGroup = {
    type: 'Group',
    userData: { partId: 'd4_upper', doorId: 'd4', __wpStack: 'top' },
    children: [] as any[],
    parent: wardrobeGroup,
  };
  const insideFace = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {
      surfaceId: 'door:d4:inside',
      faceSide: 'inside',
      faceSign: -1,
      splitPart: 'upper',
    },
    children: [] as any[],
    parent: doorGroup,
  };
  doorGroup.children.push(insideFace);
  wardrobeGroup.children.push(doorGroup);

  const hit = { object: insideFace, point: { x: 1, y: 2, z: 3 } };
  const App = createApp(wardrobeGroup);

  const hoverHit = __resolveHoverHitFromRaycastHit({
    App,
    hit,
    matchesPartId: (partId: string) => partId === 'd4_upper',
    isViewportRoot: (_App, node: unknown) => node === wardrobeGroup,
    str: (_App, value: unknown) => String(value),
    wardrobeGroup,
  });

  const clickHit = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster: createRaycaster([hit]),
    mouse: { x: 0, y: 0 },
  });

  assert.ok(hoverHit?.hitIdentity);
  assert.ok(clickHit?.hitIdentity);
  assert.equal(hoverHit.hitIdentity.surfaceId, 'door:d4:inside');
  assert.equal(hoverHit.hitIdentity.faceSide, 'inside');
  assert.equal(hoverHit.hitIdentity.faceSign, -1);
  assert.equal(clickHit.hitIdentity.surfaceId, 'door:d4:inside');
  assert.equal(clickHit.hitIdentity.faceSide, 'inside');
  assert.equal(clickHit.hitIdentity.faceSign, -1);
  assert.equal(areCanvasPickingHitIdentitiesEquivalent(hoverHit.hitIdentity, clickHit.hitIdentity), true);
});
