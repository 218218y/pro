import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleDoorActionHover } from '../esm/native/services/canvas_picking_door_action_hover_flow.ts';
import { __resolveHoverHitFromRaycastHit } from '../esm/native/services/canvas_picking_door_hover_targets_hit_scan.ts';

class Vec3 {
  x = 0;
  y = 0;
  z = 0;

  set(x: number, y: number, z: number) {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  copy(next: { x: number; y: number; z: number }) {
    this.x = Number(next?.x || 0);
    this.y = Number(next?.y || 0);
    this.z = Number(next?.z || 0);
    return this;
  }
}

class Quat {
  copy(_next: unknown) {
    return this;
  }
}

function createDoorOwner(args: {
  partId: string;
  wardrobeGroup: {
    worldToLocal(target: Vec3): Vec3;
  };
  hingeLeft?: boolean;
}) {
  return {
    userData: {
      partId: args.partId,
      __doorWidth: 1,
      __doorHeight: 2,
      __doorRectMinX: -0.5,
      __doorRectMaxX: 0.5,
      __doorRectMinY: -1,
      __doorRectMaxY: 1,
      __hingeLeft: args.hingeLeft ?? true,
    },
    parent: args.wardrobeGroup,
    worldToLocal(target: Vec3) {
      return target;
    },
    localToWorld(target: Vec3) {
      return target;
    },
    getWorldPosition(target: Vec3) {
      return target.set(0, 0, 0);
    },
    getWorldQuaternion(target: Quat) {
      return target;
    },
  };
}

function createApp() {
  const wardrobeGroup = {
    userData: { partId: 'viewport_root' },
    worldToLocal(target: Vec3) {
      return target;
    },
  };
  const owner = createDoorOwner({ partId: 'd1_left', wardrobeGroup, hingeLeft: true });
  const state = {
    ui: {},
    config: { doorTrimMap: {} },
    runtime: {},
    mode: {
      opts: {
        trimAxis: 'horizontal',
        trimColor: 'black',
        trimSpan: 'full',
      },
    },
    meta: {},
  };
  const mapsState: Record<string, Record<string, unknown>> = {};
  const hitPoint = new Vec3().set(0.2, 0, 0.02);
  const app = {
    deps: {
      THREE: { Vector3: Vec3, Quaternion: Quat },
    },
    render: {
      renderer: {},
      camera: {},
      wardrobeGroup,
    },
    store: {
      getState() {
        return state;
      },
      patch() {
        return undefined;
      },
    },
    maps: {
      getMap(name: string) {
        return mapsState[name] || {};
      },
    },
  } as never;
  return { app, wardrobeGroup, owner, hitPoint, state, mapsState };
}

function createMarker() {
  return {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      __matCenter: 'center',
    },
    position: {
      last: null as [number, number, number] | null,
      copy(next: { x?: number; y?: number; z?: number }) {
        this.last = [Number(next?.x || 0), Number(next?.y || 0), Number(next?.z || 0)];
        return undefined;
      },
    },
    quaternion: {
      copy(_next: unknown) {
        return undefined;
      },
    },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  } as never;
}

function runManualHandleHover(args: {
  app: ReturnType<typeof createApp>['app'];
  wardrobeGroup: ReturnType<typeof createApp>['wardrobeGroup'];
  owner: ReturnType<typeof createApp>['owner'];
  hitPoint: Vec3;
  doorMarker: ReturnType<typeof createMarker>;
  previewCalls: Record<string, unknown>[];
  raycastReuseHits?: unknown[];
  preferredFacePreviewHitObject?: unknown;
  preferredFacePreviewHitPoint?: { x?: number; y?: number; z?: number } | null;
}) {
  const { app, wardrobeGroup, owner, hitPoint, doorMarker, previewCalls } = args;
  const targetPartId = String(owner.userData.partId || '');
  return tryHandleDoorActionHover({
    App: app,
    ndcX: 0.15,
    ndcY: -0.05,
    raycaster: {} as never,
    mouse: {} as never,
    getViewportRoots() {
      return { camera: app.render.camera, wardrobeGroup };
    },
    getSplitHoverRaycastRoots() {
      return [wardrobeGroup];
    },
    raycastReuse() {
      if (Array.isArray(args.raycastReuseHits)) return args.raycastReuseHits as never;
      return [{ object: owner, point: hitPoint }] as never;
    },
    isViewportRoot(_App, node) {
      return node === wardrobeGroup;
    },
    str(_App, value) {
      return String(value ?? '');
    },
    isDoorLikePartId(partId) {
      return partId === targetPartId && !String(partId).includes('draw');
    },
    isDoorOrDrawerLikePartId(partId) {
      return partId === targetPartId;
    },
    doorMarker,
    hideLayoutPreview() {},
    hideSketchPreview() {},
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: true,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: false,
    paintSelection: null,
    readUi() {
      return {};
    },
    normalizeDoorBaseKey(_App, _hitDoorGroup, hitDoorPid) {
      return String(hitDoorPid);
    },
    readSplitHoverDoorBounds() {
      return null;
    },
    getCanvasPickingRuntime() {
      return {};
    },
    isRemoved() {
      return false;
    },
    isSegmentedDoorBaseId() {
      return false;
    },
    canonDoorPartKeyForMaps(id) {
      return id;
    },
    preferredFacePreviewPartId: targetPartId,
    preferredFacePreviewHitObject: (args.preferredFacePreviewHitObject || owner) as never,
    preferredFacePreviewHitPoint: args.preferredFacePreviewHitPoint || null,
  });
}

function runGrooveHover(args: {
  app: ReturnType<typeof createApp>['app'];
  wardrobeGroup: ReturnType<typeof createApp>['wardrobeGroup'];
  owner: ReturnType<typeof createApp>['owner'];
  hitObject?: unknown;
  hitPoint: Vec3;
  doorMarker: ReturnType<typeof createMarker>;
  readSplitBounds?: boolean;
  extraDoorOrDrawerPartIds?: string[];
}) {
  const { app, wardrobeGroup, owner, hitPoint, doorMarker } = args;
  const targetPartId = String(owner.userData.partId || '');
  const extraDoorOrDrawerPartIds = new Set(args.extraDoorOrDrawerPartIds || []);
  return tryHandleDoorActionHover({
    App: app,
    ndcX: 0.15,
    ndcY: -0.05,
    raycaster: {} as never,
    mouse: {} as never,
    getViewportRoots() {
      return { camera: app.render.camera, wardrobeGroup };
    },
    getSplitHoverRaycastRoots() {
      return [wardrobeGroup];
    },
    raycastReuse() {
      return [{ object: args.hitObject || owner, point: hitPoint }] as never;
    },
    isViewportRoot(_App, node) {
      return node === wardrobeGroup;
    },
    str(_App, value) {
      return String(value ?? '');
    },
    isDoorLikePartId(partId) {
      return partId === targetPartId && !String(partId).includes('draw');
    },
    isDoorOrDrawerLikePartId(partId) {
      return partId === targetPartId || extraDoorOrDrawerPartIds.has(partId);
    },
    doorMarker,
    hideLayoutPreview() {},
    hideSketchPreview() {},
    setSketchPreview: null,
    isGrooveEditMode: true,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: false,
    paintSelection: null,
    readUi() {
      return {};
    },
    normalizeDoorBaseKey(_App, _hitDoorGroup, hitDoorPid) {
      return String(hitDoorPid);
    },
    readSplitHoverDoorBounds() {
      return args.readSplitBounds === false ? null : { minY: -1, maxY: 1 };
    },
    getCanvasPickingRuntime() {
      return {};
    },
    isRemoved() {
      return false;
    },
    isSegmentedDoorBaseId() {
      return false;
    },
    canonDoorPartKeyForMaps(id) {
      return id;
    },
  });
}

test('door action hover trim mode keeps marker routing alive even when sketch preview factory is unavailable', () => {
  const { app, wardrobeGroup, owner, hitPoint } = createApp();
  const targetPartId = String(owner.userData.partId || '');
  const doorMarker = createMarker();
  const hidden: string[] = [];

  const handled = tryHandleDoorActionHover({
    App: app,
    ndcX: 0.15,
    ndcY: -0.05,
    raycaster: {} as never,
    mouse: {} as never,
    getViewportRoots() {
      return { camera: app.render.camera, wardrobeGroup };
    },
    getSplitHoverRaycastRoots() {
      return [wardrobeGroup];
    },
    raycastReuse() {
      return [{ object: owner, point: hitPoint }] as never;
    },
    isViewportRoot(_App, node) {
      return node === wardrobeGroup;
    },
    str(_App, value) {
      return String(value ?? '');
    },
    isDoorLikePartId(partId) {
      return partId === targetPartId && !String(partId).includes('draw');
    },
    isDoorOrDrawerLikePartId(partId) {
      return partId === targetPartId;
    },
    doorMarker,
    hideLayoutPreview() {
      hidden.push('layout');
    },
    hideSketchPreview() {
      hidden.push('sketch');
    },
    setSketchPreview: null,
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: true,
    paintSelection: null,
    readUi() {
      return {};
    },
    normalizeDoorBaseKey(_App, _hitDoorGroup, hitDoorPid) {
      return String(hitDoorPid);
    },
    readSplitHoverDoorBounds() {
      return null;
    },
    getCanvasPickingRuntime() {
      return {};
    },
    isRemoved() {
      return false;
    },
    isSegmentedDoorBaseId() {
      return false;
    },
    canonDoorPartKeyForMaps(id) {
      return id;
    },
  });

  assert.equal(handled, true);
  assert.deepEqual(hidden, ['layout', 'sketch']);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'add');
  assert.deepEqual((doorMarker.scale as { last: [number, number, number] | null }).last, [1, 0.035, 1]);
});

test('door action hover trim mode supports external drawer fronts', () => {
  const { app, wardrobeGroup, hitPoint } = createApp();
  const drawerOwner = createDoorOwner({ partId: 'd1_draw_1', wardrobeGroup, hingeLeft: true });
  drawerOwner.userData.__doorHeight = 0.24;
  const targetPartId = String(drawerOwner.userData.partId || '');
  const doorMarker = createMarker();

  const handled = tryHandleDoorActionHover({
    App: app,
    ndcX: 0.15,
    ndcY: -0.05,
    raycaster: {} as never,
    mouse: {} as never,
    getViewportRoots() {
      return { camera: app.render.camera, wardrobeGroup };
    },
    getSplitHoverRaycastRoots() {
      return [wardrobeGroup];
    },
    raycastReuse() {
      return [{ object: drawerOwner, point: hitPoint }] as never;
    },
    isViewportRoot(_App, node) {
      return node === wardrobeGroup;
    },
    str(_App, value) {
      return String(value ?? '');
    },
    isDoorLikePartId(partId) {
      return partId === targetPartId && !String(partId).includes('draw');
    },
    isDoorOrDrawerLikePartId(partId) {
      return partId === targetPartId;
    },
    doorMarker,
    hideLayoutPreview() {},
    hideSketchPreview() {},
    setSketchPreview: null,
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: true,
    paintSelection: null,
    readUi() {
      return {};
    },
    normalizeDoorBaseKey(_App, _hitDoorGroup, hitDoorPid) {
      return String(hitDoorPid);
    },
    readSplitHoverDoorBounds() {
      return null;
    },
    getCanvasPickingRuntime() {
      return {};
    },
    isRemoved() {
      return false;
    },
    isSegmentedDoorBaseId() {
      return false;
    },
    canonDoorPartKeyForMaps(id) {
      return id;
    },
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'add');
  assert.deepEqual((doorMarker.scale as { last: [number, number, number] | null }).last, [1, 0.035, 1]);
});

test('groove hover uses add material when the hovered door has no existing groove', () => {
  const { app, wardrobeGroup, owner, hitPoint } = createApp();
  const doorMarker = createMarker();

  const handled = runGrooveHover({ app, wardrobeGroup, owner, hitPoint, doorMarker });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'groove');
});

test('groove hover uses remove material when the next click will remove an existing groove', () => {
  const { app, wardrobeGroup, owner, hitPoint, mapsState } = createApp();
  mapsState.groovesMap = { groove_d1_left: true };
  const doorMarker = createMarker();

  const handled = runGrooveHover({ app, wardrobeGroup, owner, hitPoint, doorMarker });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'remove');
});

test('groove hover uses remove material for a split door segment inheriting a full-door groove', () => {
  const { app, wardrobeGroup, hitPoint, mapsState } = createApp();
  const segmentOwner = createDoorOwner({ partId: 'd1_bot', wardrobeGroup, hingeLeft: true });
  mapsState.groovesMap = { groove_d1_full: true };
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner: segmentOwner,
    hitPoint,
    doorMarker,
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'remove');
});

test('groove hover uses add material after a split door groove was materialized away from the clicked segment', () => {
  const { app, wardrobeGroup, hitPoint, mapsState } = createApp();
  const segmentOwner = createDoorOwner({ partId: 'd1_bot', wardrobeGroup, hingeLeft: true });
  mapsState.groovesMap = { groove_d1_top: true };
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner: segmentOwner,
    hitPoint,
    doorMarker,
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'groove');
});

test('groove hover supports drawer fronts using drawer metrics when split door bounds are absent', () => {
  const { app, wardrobeGroup, hitPoint } = createApp();
  const drawerOwner = createDoorOwner({ partId: 'd1_draw_1', wardrobeGroup, hingeLeft: true });
  drawerOwner.userData.__doorHeight = 0.24;
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner: drawerOwner,
    hitPoint,
    doorMarker,
    readSplitBounds: false,
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'groove');
  const markerScale = (doorMarker.scale as { last: [number, number, number] | null }).last;
  assert.ok(markerScale);
  assert.ok(Math.abs(markerScale[0] - 0.99) < 1e-9);
  assert.ok(Math.abs(markerScale[1] - 0.23) < 1e-9);
  assert.equal(markerScale[2], 1);
  const markerPosition = (doorMarker.position as { last: [number, number, number] | null }).last;
  assert.ok(markerPosition);
  assert.ok(Math.abs(markerPosition[0]) < 1e-9);
});

test('groove hover centers sketch drawer fronts on their face offset instead of applying door hinge anchoring', () => {
  const { app, wardrobeGroup, hitPoint } = createApp();
  const drawerOwner = createDoorOwner({
    partId: 'sketch_ext_drawers_1_sed-1_1',
    wardrobeGroup,
    hingeLeft: true,
  });
  drawerOwner.userData.__doorWidth = 0.74;
  drawerOwner.userData.__doorHeight = 0.22;
  drawerOwner.userData.__wpType = 'extDrawer';
  drawerOwner.userData.__wpFaceOffsetX = -0.13;
  drawerOwner.userData.__wpFaceOffsetY = 0.04;
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner: drawerOwner,
    hitPoint,
    doorMarker,
    readSplitBounds: false,
  });

  assert.equal(handled, true);
  const markerPosition = (doorMarker.position as { last: [number, number, number] | null }).last;
  assert.ok(markerPosition);
  assert.ok(Math.abs(markerPosition[0] + 0.13) < 1e-9);
  assert.ok(Math.abs(markerPosition[1] - 0.04) < 1e-9);
  const markerScale = (doorMarker.scale as { last: [number, number, number] | null }).last;
  assert.ok(markerScale);
  assert.ok(Math.abs(markerScale[0] - 0.73) < 1e-9);
  assert.ok(Math.abs(markerScale[1] - 0.21) < 1e-9);
});

test('door action hover resolves internal drawer-box hits to the owning drawer id for manual handles', () => {
  const wardrobeGroup = { userData: { partId: 'root' } };
  const internalDrawer = {
    userData: {
      partId: 'drawer_box__div_int_sketch_0_d1_lower',
      drawerId: 'div_int_sketch_0_d1_lower',
      __wpDrawerBox: true,
      __wpInternalDrawerBox: true,
      __wpDrawerOwnerPartId: 'div_int_sketch_0_d1_lower',
      __doorWidth: 0.68,
      __doorHeight: 0.18,
    },
    parent: wardrobeGroup,
  };
  const frontPanel = {
    userData: {},
    parent: internalDrawer,
  };

  const hit = __resolveHoverHitFromRaycastHit({
    App: {} as never,
    hit: { object: frontPanel, point: { x: 0.01, y: 0.02, z: 0.03 } } as never,
    matchesPartId: partId =>
      partId.includes('draw') || partId.includes('drawer') || partId.startsWith('div_int_'),
    isViewportRoot: (_App, node) => node === wardrobeGroup,
    str: (_App, value) => String(value || ''),
    wardrobeGroup: wardrobeGroup as never,
  });

  assert.ok(hit);
  assert.equal(hit.hitDoorPid, 'div_int_sketch_0_d1_lower');
  assert.equal(hit.hitDoorGroup, internalDrawer);
});

test('groove hover ignores drawer-box body hits instead of promoting them to the drawer front', () => {
  const { app, wardrobeGroup, hitPoint } = createApp();
  const drawerOwner = createDoorOwner({
    partId: 'sketch_ext_drawers_1_sed-1_1',
    wardrobeGroup,
    hingeLeft: true,
  });
  drawerOwner.userData.__doorWidth = 0.74;
  drawerOwner.userData.__doorHeight = 0.22;
  drawerOwner.userData.__wpType = 'extDrawer';
  const drawerBoxPartId = 'drawer_box__sketch_ext_drawers_1_sed-1_1';
  const drawerBox = {
    userData: {
      partId: drawerBoxPartId,
      __wpDrawerBox: true,
      __doorWidth: 0.7,
      __doorHeight: 0.18,
    },
    parent: drawerOwner,
    worldToLocal(target: Vec3) {
      return target;
    },
    localToWorld(target: Vec3) {
      return target;
    },
    getWorldPosition(target: Vec3) {
      return target.set(0, 0, 0);
    },
    getWorldQuaternion(target: Quat) {
      return target;
    },
  };
  const sidePanel = {
    userData: {},
    material: { visible: true, opacity: 1 },
    parent: drawerBox,
  };
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner: drawerOwner,
    hitObject: sidePanel,
    hitPoint,
    doorMarker,
    readSplitBounds: false,
    extraDoorOrDrawerPartIds: [drawerBoxPartId],
  });

  assert.equal(handled, false);
  assert.equal(doorMarker.visible, false);
  assert.equal((doorMarker.position as { last: [number, number, number] | null }).last, null);
});

test('groove hover rejects hits outside the resolved local drawer-front rect', () => {
  const { app, wardrobeGroup, owner, hitPoint } = createApp();
  hitPoint.set(0.55, 0, 0.02);
  const doorMarker = createMarker();

  const handled = runGrooveHover({
    app,
    wardrobeGroup,
    owner,
    hitPoint,
    doorMarker,
    readSplitBounds: false,
  });

  assert.equal(handled, false);
  assert.equal(doorMarker.visible, false);
  assert.equal((doorMarker.position as { last: [number, number, number] | null }).last, null);
});

test('handle face hover rejects preferred sketch-box body hits without door metrics', () => {
  const { app, wardrobeGroup, owner, hitPoint, state } = createApp();
  Object.assign(owner.userData, {
    partId: 'sketch_box_free_0_box-1',
  });
  delete (owner.userData as Record<string, unknown>).__doorWidth;
  delete (owner.userData as Record<string, unknown>).__doorHeight;
  delete (owner.userData as Record<string, unknown>).__doorRectMinX;
  delete (owner.userData as Record<string, unknown>).__doorRectMaxX;
  delete (owner.userData as Record<string, unknown>).__doorRectMinY;
  delete (owner.userData as Record<string, unknown>).__doorRectMaxY;
  state.mode.opts = {
    handleType: 'standard',
    handleColor: 'nickel',
  };
  hitPoint.set(0.1, 0, 0.02);
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({
    app,
    wardrobeGroup,
    owner,
    hitPoint,
    doorMarker,
    previewCalls,
    raycastReuseHits: [],
    preferredFacePreviewHitObject: owner,
    preferredFacePreviewHitPoint: hitPoint,
  });

  assert.equal(handled, false);
  assert.equal(previewCalls.length, 0);
  assert.equal(doorMarker.visible, false);
  assert.equal((doorMarker.scale as { last: [number, number, number] | null }).last, null);
});

test('manual handle hover uses the precise raycast hit and keeps width labels away from the door', () => {
  const { app, wardrobeGroup, owner, hitPoint, state, mapsState } = createApp();
  hitPoint.set(0.2, 0.35, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  const otherOwner = createDoorOwner({ partId: 'd2_right', wardrobeGroup, hingeLeft: false });
  (app as { render: { doorsArray: unknown[] } }).render.doorsArray = [
    { group: owner, hingeSide: 'left' },
    { group: otherOwner, hingeSide: 'right' },
  ];
  mapsState.handlesMap = {
    '__wp_manual_handle_position:d2_right': '{"xRatio":0.3,"yRatio":0.55}',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({ app, wardrobeGroup, owner, hitPoint, doorMarker, previewCalls });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.ok(Math.abs(Number(previewCalls[0].x) - 0.2) < 1e-9);
  assert.ok(Math.abs(Number(previewCalls[0].y) - 0.35) < 1e-9);
  assert.ok(Math.abs(Number(previewCalls[0].guideHorizontalY) - 0.35) < 1e-9);
  assert.ok(Math.abs(Number(previewCalls[0].guideVerticalX) - 0.2) < 1e-9);
  assert.equal(previewCalls[0].showCenterXGuide, false);
  assert.equal(previewCalls[0].showCenterYGuide, true);
  assert.equal(Array.isArray(previewCalls[0].clearanceMeasurements), true);
  assert.equal((previewCalls[0].clearanceMeasurements as unknown[]).length > 0, true);
  const measurements = previewCalls[0].clearanceMeasurements as Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    labelX?: number;
    labelY?: number;
  }>;
  const horizontal = measurements.filter(entry => Math.abs(Number(entry.startY) - Number(entry.endY)) < 1e-9);
  const vertical = measurements.filter(entry => Math.abs(Number(entry.startX) - Number(entry.endX)) < 1e-9);
  assert.ok(horizontal.some(entry => Number(entry.labelX) < -0.7));
  assert.ok(horizontal.some(entry => Number(entry.labelX) > 0.7));
  assert.ok(vertical.some(entry => Number(entry.labelY) < -1.1));
  assert.ok(vertical.some(entry => Number(entry.labelY) > 1.1));
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'center');
});

test('manual handle hover uses the preferred face hit point for sketch-box doors when hover raycast misses', () => {
  const { app, wardrobeGroup, owner, hitPoint, state } = createApp();
  Object.assign(owner.userData, {
    partId: 'sketch_box_free_0_box-1_door_0_top',
    __wpSketchBoxDoor: true,
    __wpSketchDoorLeaf: true,
    __wpSketchDoorSegment: true,
    __doorWidth: 0.86,
    __doorHeight: 0.64,
    __doorRectMinX: -0.43,
    __doorRectMaxX: 0.43,
    __doorRectMinY: -0.32,
    __doorRectMaxY: 0.32,
  });
  hitPoint.set(0.11, 0.17, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'black',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({
    app,
    wardrobeGroup,
    owner,
    hitPoint,
    doorMarker,
    previewCalls,
    raycastReuseHits: [],
    preferredFacePreviewHitPoint: hitPoint,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.ok(Math.abs(Number(previewCalls[0].x) - 0.11) < 1e-9);
  assert.ok(Math.abs(Number(previewCalls[0].y) - 0.17) < 1e-9);
  assert.equal(
    ((previewCalls[0].anchor as { userData?: { partId?: unknown } })?.userData || {}).partId,
    'sketch_box_free_0_box-1_door_0_top'
  );
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'add');
});

test('manual handle hover previews drawer handles horizontally on drawer fronts', () => {
  const { app, wardrobeGroup, hitPoint, state } = createApp();
  const drawerOwner = createDoorOwner({ partId: 'd1_draw_0', wardrobeGroup, hingeLeft: true });
  drawerOwner.userData.__doorWidth = 1;
  drawerOwner.userData.__doorHeight = 0.2;
  drawerOwner.userData.__doorRectMinX = -0.5;
  drawerOwner.userData.__doorRectMaxX = 0.5;
  drawerOwner.userData.__doorRectMinY = -0.1;
  drawerOwner.userData.__doorRectMaxY = 0.1;
  drawerOwner.userData.__wpType = 'extDrawer';
  hitPoint.set(0.1, 0.03, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({
    app,
    wardrobeGroup,
    owner: drawerOwner,
    hitPoint,
    doorMarker,
    previewCalls,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.ok(Number(previewCalls[0].w) > Number(previewCalls[0].h));
  assert.ok(Math.abs(Number(previewCalls[0].w) - 0.16) < 1e-9);
  assert.ok(Math.abs(Number(previewCalls[0].h) - 0.01) < 1e-9);
  assert.deepEqual((doorMarker.scale as { last: [number, number, number] | null }).last, [0.16, 0.01, 1]);
});

test('manual handle hover compares drawer width against another manual external drawer handle', () => {
  const { app, wardrobeGroup, hitPoint, state, mapsState } = createApp();
  const drawerOwner = createDoorOwner({ partId: 'd1_draw_0', wardrobeGroup, hingeLeft: true });
  Object.assign(drawerOwner.userData, {
    __doorWidth: 1,
    __doorHeight: 0.2,
    __doorRectMinX: -0.5,
    __doorRectMaxX: 0.5,
    __doorRectMinY: -0.1,
    __doorRectMaxY: 0.1,
    __wpType: 'extDrawer',
  });
  const otherDrawerOwner = createDoorOwner({ partId: 'd2_draw_0', wardrobeGroup, hingeLeft: true });
  Object.assign(otherDrawerOwner.userData, {
    __doorWidth: 1,
    __doorHeight: 0.2,
    __doorRectMinX: -0.5,
    __doorRectMaxX: 0.5,
    __doorRectMinY: -0.1,
    __doorRectMaxY: 0.1,
    __wpType: 'extDrawer',
  });
  hitPoint.set(0.1, 0.03, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  (app as { render: { drawersArray: unknown[] } }).render.drawersArray = [
    { id: 'd1_draw_0', group: drawerOwner },
    { id: 'd2_draw_0', group: otherDrawerOwner },
  ];
  mapsState.handlesMap = {
    '__wp_manual_handle_position:d2_draw_0': '{"xRatio":0.6,"yRatio":0.2}',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({
    app,
    wardrobeGroup,
    owner: drawerOwner,
    hitPoint,
    doorMarker,
    previewCalls,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].showCenterYGuide, true);
  assert.equal(previewCalls[0].showCenterXGuide, false);
  assert.equal(doorMarker.material, 'center');
});

test('manual handle hover compares sketch and regular external drawer manual handles', () => {
  const { app, wardrobeGroup, hitPoint, state, mapsState } = createApp();
  const sketchDrawerOwner = createDoorOwner({
    partId: 'sketch_ext_drawers_1_sed-1_1',
    wardrobeGroup,
    hingeLeft: true,
  });
  Object.assign(sketchDrawerOwner.userData, {
    __doorWidth: 1.2,
    __doorHeight: 0.24,
    __doorRectMinX: -0.5,
    __doorRectMaxX: 0.7,
    __doorRectMinY: -0.12,
    __doorRectMaxY: 0.12,
    __wpType: 'extDrawer',
    __wpSketchExtDrawer: true,
    __wpSketchExtDrawerId: 'sed-1',
  });
  const regularDrawerOwner = createDoorOwner({ partId: 'd2_draw_0', wardrobeGroup, hingeLeft: true });
  Object.assign(regularDrawerOwner.userData, {
    __doorWidth: 0.8,
    __doorHeight: 0.2,
    __doorRectMinX: -0.4,
    __doorRectMaxX: 0.4,
    __doorRectMinY: -0.1,
    __doorRectMaxY: 0.1,
    __wpType: 'extDrawer',
  });
  hitPoint.set(0.22, 0.024, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  (app as { render: { drawersArray: unknown[] } }).render.drawersArray = [
    { id: 'sketch_ext_drawers_1_sed-1_1', group: sketchDrawerOwner },
    { id: 'd2_draw_0', group: regularDrawerOwner },
  ];
  mapsState.handlesMap = {
    '__wp_manual_handle_position:d2_draw_0': '{"xRatio":0.6,"yRatio":0.6}',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({
    app,
    wardrobeGroup,
    owner: sketchDrawerOwner,
    hitPoint,
    doorMarker,
    previewCalls,
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].showCenterYGuide, true);
  assert.equal(previewCalls[0].showCenterXGuide, true);
  assert.ok(Number(previewCalls[0].w) > Number(previewCalls[0].h));
  assert.equal(doorMarker.material, 'center');
});

test('manual handle hover highlights only the vertical guide when the height matches another handle', () => {
  const { app, wardrobeGroup, owner, hitPoint, state, mapsState } = createApp();
  hitPoint.set(0.2, 0.35, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  const otherOwner = createDoorOwner({ partId: 'd2_right', wardrobeGroup, hingeLeft: false });
  (app as { render: { doorsArray: unknown[] } }).render.doorsArray = [
    { group: owner, hingeSide: 'left' },
    { group: otherOwner, hingeSide: 'right' },
  ];
  mapsState.handlesMap = {
    '__wp_manual_handle_position:d2_right': '{"xRatio":0.12,"yRatio":0.675}',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({ app, wardrobeGroup, owner, hitPoint, doorMarker, previewCalls });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].showCenterXGuide, true);
  assert.equal(previewCalls[0].showCenterYGuide, false);
  assert.equal(doorMarker.material, 'center');
});

test('manual handle hover compares width from the opening side instead of raw left-right ratios', () => {
  const { app, wardrobeGroup, owner, hitPoint, state, mapsState } = createApp();
  hitPoint.set(0.2, 0.35, 0.02);
  state.mode.opts = {
    handlePlacement: 'manual',
    handleType: 'standard',
    handleColor: 'nickel',
  };
  const otherOwner = createDoorOwner({ partId: 'd2_right', wardrobeGroup, hingeLeft: false });
  (app as { render: { doorsArray: unknown[] } }).render.doorsArray = [
    { group: owner, hingeSide: 'left' },
    { group: otherOwner, hingeSide: 'right' },
  ];
  mapsState.handlesMap = {
    '__wp_manual_handle_position:d2_right': '{"xRatio":0.7,"yRatio":0.4}',
  };
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = runManualHandleHover({ app, wardrobeGroup, owner, hitPoint, doorMarker, previewCalls });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].showCenterXGuide, false);
  assert.equal(previewCalls[0].showCenterYGuide, false);
  assert.equal(doorMarker.material, 'add');
});

test('door action hover trim mode previews cabinet side panels on their depth/height plane', () => {
  const { app, wardrobeGroup } = createApp();
  const hitPoint = new Vec3().set(-0.009, 0.42, 0.18);
  const bodyPanel = createDoorOwner({ partId: 'body_left', wardrobeGroup, hingeLeft: true });
  bodyPanel.userData.__wpDoorTrimSurface = true;
  bodyPanel.userData.__wpDoorTrimSurfacePlane = 'yz';
  bodyPanel.userData.__wpDoorTrimSurfaceFaceSign = -1;
  bodyPanel.userData.__wpDoorTrimSurfaceFaceCoord = -0.009;
  bodyPanel.userData.__doorWidth = 0.6;
  bodyPanel.userData.__doorHeight = 2.1;
  bodyPanel.userData.__doorRectMinX = -0.3;
  bodyPanel.userData.__doorRectMaxX = 0.3;
  bodyPanel.userData.__doorRectMinY = -1.05;
  bodyPanel.userData.__doorRectMaxY = 1.05;
  const doorMarker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = tryHandleDoorActionHover({
    App: app,
    ndcX: 0.15,
    ndcY: -0.05,
    raycaster: {} as never,
    mouse: {} as never,
    getViewportRoots() {
      return { camera: app.render.camera, wardrobeGroup };
    },
    getSplitHoverRaycastRoots() {
      return [wardrobeGroup];
    },
    raycastReuse() {
      return [{ object: bodyPanel, point: hitPoint }] as never;
    },
    isViewportRoot(_App, node) {
      return node === wardrobeGroup;
    },
    str(_App, value) {
      return String(value ?? '');
    },
    isDoorLikePartId() {
      return false;
    },
    isDoorOrDrawerLikePartId() {
      return false;
    },
    doorMarker,
    hideLayoutPreview() {},
    hideSketchPreview() {},
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    isGrooveEditMode: false,
    isRemoveDoorMode: false,
    isHandleEditMode: false,
    isHingeEditMode: false,
    isMirrorPaintMode: false,
    isDoorTrimMode: true,
    paintSelection: null,
    readUi() {
      return {};
    },
    normalizeDoorBaseKey(_App, _hitDoorGroup, hitDoorPid) {
      return String(hitDoorPid);
    },
    readSplitHoverDoorBounds() {
      return null;
    },
    getCanvasPickingRuntime() {
      return {};
    },
    isRemoved() {
      return false;
    },
    isSegmentedDoorBaseId() {
      return false;
    },
    canonDoorPartKeyForMaps(id) {
      return id;
    },
  });

  assert.equal(handled, true);
  assert.equal(doorMarker.visible, true);
  assert.equal(doorMarker.material, 'add');
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].surfacePlane, 'yz');
  assert.equal(previewCalls[0].surfaceFaceSign, -1);
  assert.equal(previewCalls[0].z, -0.009);
  assert.equal(previewCalls[0].w, 0.6);
  assert.ok(Math.abs(Number(previewCalls[0].y) - 0.42) < 1e-9);
});
