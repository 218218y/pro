import test from 'node:test';
import assert from 'node:assert/strict';

import {
  __readDoorTrimConfigMap,
  __readDoorTrimModeDraft,
} from '../esm/native/services/canvas_picking_door_action_hover_preview_state.ts';
import { tryHandleDoorTrimHoverPreview } from '../esm/native/services/canvas_picking_door_action_hover_preview_trim.ts';

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

function createStoreState() {
  return {
    ui: {},
    config: {
      doorTrimMap: {
        d1_left: [
          {
            id: 'trim_existing',
            axis: 'vertical',
            color: 'black',
            span: 'custom',
            sizeCm: 40,
            crossSizeCm: 4,
            centerNorm: 0.75,
            centerXNorm: 0.75,
            centerYNorm: 0.5,
          },
        ],
      },
    },
    runtime: {},
    mode: {
      opts: {
        trimAxis: 'vertical',
        trimColor: 'black',
        trimSpan: 'custom',
        trimSizeCm: 40,
        trimCrossSizeCm: 4,
      },
    },
    meta: {},
  };
}

function createApp() {
  const state = createStoreState();
  return {
    store: {
      getState() {
        return state;
      },
    },
    maps: {
      getMap(name: string) {
        return name === 'mirrorLayoutMap' ? {} : {};
      },
    },
  } as never;
}

function createDoorOwner() {
  return {
    userData: {
      partId: 'd1_left',
      __doorWidth: 1,
      __doorHeight: 2,
    },
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
  } as never;
}

function createMarker() {
  return {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
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

test('door trim hover reads the same mode opts and config map as click flow', () => {
  const app = createApp();
  assert.deepEqual(__readDoorTrimModeDraft(app), {
    axis: 'vertical',
    color: 'black',
    span: 'custom',
    sizeCm: 40,
    crossSizeCm: 4,
  });
  const trimMap = __readDoorTrimConfigMap(app);
  assert.equal(Array.isArray(trimMap.d1_left), true);
  assert.equal(trimMap.d1_left[0].axis, 'vertical');
  assert.equal(trimMap.d1_left[0].span, 'custom');
});

test('door trim hover preview matches vertical custom trim placement and remove semantics', () => {
  const app = createApp();
  const owner = createDoorOwner();
  const marker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = tryHandleDoorTrimHoverPreview({
    App: app,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: owner,
      hitPoint: { x: 0.25, y: 0, z: 0.02 },
    },
    hitDoorPid: 'd1_left',
    groupRec: owner,
    userData: owner.userData,
    doorMarker: marker,
    markerUd: marker.userData,
    local: new Vec3(),
    localHit: new Vec3(),
    wq: new Quat(),
    zOff: 0.02,
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].op, 'remove');
  assert.equal(previewCalls[0].w, 0.04);
  assert.equal(previewCalls[0].h, 0.4);
  assert.equal(Array.isArray(previewCalls[0].clearanceMeasurements), true);
  assert.equal((previewCalls[0].clearanceMeasurements as { label: string }[]).length, 4);
  assert.deepEqual(
    (previewCalls[0].clearanceMeasurements as { label: string }[]).map(entry => entry.label),
    ['80 ס"מ', '80 ס"מ', '73 ס"מ', '23 ס"מ']
  );
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'remove');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [0.04, 0.4, 1]);
});

test('door trim hover stays live even when sketch preview factory is unavailable', () => {
  const state = createStoreState();
  state.config.doorTrimMap = {};
  state.mode.opts = {
    trimAxis: 'horizontal',
    trimColor: 'black',
    trimSpan: 'full',
  };
  const app = {
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
  const owner = createDoorOwner();
  const marker = createMarker();

  const handled = tryHandleDoorTrimHoverPreview({
    App: app,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: owner,
      hitPoint: { x: 0.2, y: 0, z: 0.02 },
    },
    hitDoorPid: 'd1_left',
    groupRec: owner,
    userData: owner.userData,
    doorMarker: marker,
    markerUd: marker.userData,
    local: new Vec3(),
    localHit: new Vec3(),
    wq: new Quat(),
    zOff: 0.02,
    setSketchPreview: null,
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(marker.visible, true);
  assert.equal(marker.material, 'add');
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [1, 0.035, 1]);
});

test('door trim hover marker matches default horizontal thickness exactly with no artificial pad', () => {
  const state = createStoreState();
  state.config.doorTrimMap = {};
  state.mode.opts = {
    trimAxis: 'horizontal',
    trimColor: 'black',
    trimSpan: 'full',
  };
  const app = {
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
  const owner = createDoorOwner();
  const marker = createMarker();
  const previewCalls: Record<string, unknown>[] = [];

  const handled = tryHandleDoorTrimHoverPreview({
    App: app,
    THREE: { Vector3: Vec3, Quaternion: Quat },
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: owner,
      hitPoint: { x: 0, y: 0, z: 0.02 },
    },
    hitDoorPid: 'd1_left',
    groupRec: owner,
    userData: owner.userData,
    doorMarker: marker,
    markerUd: marker.userData,
    local: new Vec3(),
    localHit: new Vec3(),
    wq: new Quat(),
    zOff: 0.02,
    setSketchPreview(previewArgs: Record<string, unknown>) {
      previewCalls.push(previewArgs);
      return {
        hoverMarker: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
        mesh: { material: { color: { setHex() {} }, emissive: { setHex() {} } } },
      };
    },
    wardrobeGroup: {
      worldToLocal(target: Vec3) {
        return target;
      },
    },
  });

  assert.equal(handled, true);
  assert.equal(previewCalls.length, 1);
  assert.equal(previewCalls[0].w, 1);
  assert.equal(previewCalls[0].h, 0.035);
  assert.equal(previewCalls[0].woodThick, 0.035);
  assert.deepEqual((marker.scale as { last: [number, number, number] | null }).last, [1, 0.035, 1]);
});
