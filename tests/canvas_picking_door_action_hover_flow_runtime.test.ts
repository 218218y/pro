import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleDoorActionHover } from '../esm/native/services/canvas_picking_door_action_hover_flow.ts';

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

function createApp() {
  const wardrobeGroup = {
    userData: { partId: 'viewport_root' },
    worldToLocal(target: Vec3) {
      return target;
    },
  };
  const owner = {
    userData: {
      partId: 'd1_left',
      __doorWidth: 1,
      __doorHeight: 2,
      __doorRectMinX: -0.5,
      __doorRectMaxX: 0.5,
      __doorRectMinY: -1,
      __doorRectMaxY: 1,
    },
    parent: wardrobeGroup,
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
    },
    maps: {
      getMap() {
        return {};
      },
    },
  } as never;
  return { app, wardrobeGroup, owner, hitPoint };
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
      copy(_next: unknown) {
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

test('door action hover trim mode keeps marker routing alive even when sketch preview factory is unavailable', () => {
  const { app, wardrobeGroup, owner, hitPoint } = createApp();
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
      return partId === 'd1_left';
    },
    isDoorOrDrawerLikePartId(partId) {
      return partId === 'd1_left';
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
