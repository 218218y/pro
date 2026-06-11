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

function resolveHoverAndClick(args: {
  wardrobeGroup: any;
  hitObject: any;
  hitPoint?: { x: number; y: number; z: number };
  matchesPartId: (partId: string) => boolean;
}) {
  const hit = { object: args.hitObject, point: args.hitPoint || { x: 1, y: 2, z: 3 } };
  const App = createApp(args.wardrobeGroup);

  const hoverHit = __resolveHoverHitFromRaycastHit({
    App,
    hit,
    matchesPartId: args.matchesPartId,
    isViewportRoot: (_App, node: unknown) => node === args.wardrobeGroup,
    str: (_App, value: unknown) => String(value),
    wardrobeGroup: args.wardrobeGroup,
  });

  const clickHit = resolveCanvasPickingClickHitState({
    App,
    ndcX: 0,
    ndcY: 0,
    isRemoveDoorMode: false,
    raycaster: createRaycaster([hit]),
    mouse: { x: 0, y: 0 },
  });

  return { hoverHit, clickHit };
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

test('mirror inside and outside hits infer canonical face side from face sign across hover and click', () => {
  for (const face of [
    { faceSign: -1, expectedSide: 'inside', surfaceId: 'door:d8:mirror:inside' },
    { faceSign: 1, expectedSide: 'outside', surfaceId: 'door:d8:mirror:outside' },
  ] as const) {
    const wardrobeGroup = {
      type: 'Group',
      userData: { partId: 'wardrobe-root' },
      children: [] as any[],
      parent: null,
    };
    const doorGroup = {
      type: 'Group',
      userData: { partId: 'd8_full' },
      children: [] as any[],
      parent: wardrobeGroup,
    };
    const mirrorFace = {
      type: 'Mesh',
      material: { visible: true, opacity: 1 },
      userData: {
        __wpMirrorSurface: true,
        surfaceId: face.surfaceId,
        faceSign: face.faceSign,
      },
      children: [] as any[],
      parent: doorGroup,
    };
    doorGroup.children.push(mirrorFace);
    wardrobeGroup.children.push(doorGroup);

    const { hoverHit, clickHit } = resolveHoverAndClick({
      wardrobeGroup,
      hitObject: mirrorFace,
      matchesPartId: partId => partId === 'd8_full',
    });

    assert.ok(hoverHit?.hitIdentity);
    assert.ok(clickHit?.hitIdentity);
    assert.equal(hoverHit.hitIdentity.targetKind, 'door');
    assert.equal(clickHit.hitIdentity.targetKind, 'door');
    assert.equal(hoverHit.hitIdentity.surfaceId, face.surfaceId);
    assert.equal(clickHit.hitIdentity.surfaceId, face.surfaceId);
    assert.equal(hoverHit.hitIdentity.faceSide, face.expectedSide);
    assert.equal(clickHit.hitIdentity.faceSide, face.expectedSide);
    assert.equal(areCanvasPickingHitIdentitiesEquivalent(hoverHit.hitIdentity, clickHit.hitIdentity), true);
  }
});

test('lower split door child hits keep door identity, stack, and split part parity without explicit doorId metadata', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'wardrobe-root' },
    children: [] as any[],
    parent: null,
  };
  const splitDoorGroup = {
    type: 'Group',
    userData: { partId: 'lower_d4_bot', __wpStack: 'bottom' },
    children: [] as any[],
    parent: wardrobeGroup,
  };
  const outsideFace = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {
      surfaceId: 'door:lower_d4:outside:bot',
      faceSign: 1,
    },
    children: [] as any[],
    parent: splitDoorGroup,
  };
  splitDoorGroup.children.push(outsideFace);
  wardrobeGroup.children.push(splitDoorGroup);

  const { hoverHit, clickHit } = resolveHoverAndClick({
    wardrobeGroup,
    hitObject: outsideFace,
    matchesPartId: partId => partId === 'lower_d4_bot',
  });

  assert.ok(hoverHit?.hitIdentity);
  assert.ok(clickHit?.hitIdentity);
  assert.equal(hoverHit.hitIdentity.targetKind, 'door');
  assert.equal(clickHit.hitIdentity.targetKind, 'door');
  assert.equal(hoverHit.hitIdentity.doorId, 'lower_d4');
  assert.equal(clickHit.hitIdentity.doorId, 'lower_d4');
  assert.equal(hoverHit.hitIdentity.moduleStack, 'bottom');
  assert.equal(clickHit.hitIdentity.moduleStack, 'bottom');
  assert.equal(hoverHit.hitIdentity.splitPart, 'bottom');
  assert.equal(clickHit.hitIdentity.splitPart, 'bottom');
  assert.equal(hoverHit.hitIdentity.faceSide, 'outside');
  assert.equal(clickHit.hitIdentity.faceSide, 'outside');
  assert.equal(areCanvasPickingHitIdentitiesEquivalent(hoverHit.hitIdentity, clickHit.hitIdentity), true);
});

test('sketch-box door hits preserve module and door identity across hover and click', () => {
  const wardrobeGroup = {
    type: 'Group',
    userData: { partId: 'wardrobe-root' },
    children: [] as any[],
    parent: null,
  };
  const sketchDoorGroup = {
    type: 'Group',
    userData: {
      partId: 'sketch_box_free_7_sbf_alpha_door_sbdr_1',
      __wpSketchBoxId: 'sbf_alpha',
      __wpSketchBoxDoorId: 'sbdr_1',
      __wpSketchModuleKey: '7',
      __wpSketchBoxDoor: true,
    },
    children: [] as any[],
    parent: wardrobeGroup,
  };
  const accentMesh = {
    type: 'Mesh',
    material: { visible: true, opacity: 1 },
    userData: {
      partId: 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top',
      __wpSketchBoxId: 'sbf_alpha',
      __wpSketchBoxDoorId: 'sbdr_1',
      __wpSketchModuleKey: '7',
      __wpSketchBoxDoor: true,
      surfaceId: 'sketch-box:sbf_alpha:door:sbdr_1:accent-top',
      faceSign: 1,
    },
    children: [] as any[],
    parent: sketchDoorGroup,
  };
  sketchDoorGroup.children.push(accentMesh);
  wardrobeGroup.children.push(sketchDoorGroup);

  const { hoverHit, clickHit } = resolveHoverAndClick({
    wardrobeGroup,
    hitObject: accentMesh,
    matchesPartId: partId => partId.startsWith('sketch_box_free_7_sbf_alpha_door_sbdr_1'),
  });

  assert.ok(hoverHit?.hitIdentity);
  assert.ok(clickHit?.hitIdentity);
  assert.equal(hoverHit.hitIdentity.targetKind, 'door');
  assert.equal(clickHit.hitIdentity.targetKind, 'door');
  assert.equal(hoverHit.hitIdentity.partId, 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top');
  assert.equal(clickHit.hitIdentity.partId, 'sketch_box_free_7_sbf_alpha_door_sbdr_1_accent_top');
  assert.equal(hoverHit.hitIdentity.doorId, 'sbdr_1');
  assert.equal(clickHit.hitIdentity.doorId, 'sbdr_1');
  assert.equal(hoverHit.hitIdentity.moduleIndex, 7);
  assert.equal(clickHit.hitIdentity.moduleIndex, 7);
  assert.equal(hoverHit.hitIdentity.faceSide, 'outside');
  assert.equal(clickHit.hitIdentity.faceSide, 'outside');
  assert.equal(areCanvasPickingHitIdentitiesEquivalent(hoverHit.hitIdentity, clickHit.hitIdentity), true);
});
