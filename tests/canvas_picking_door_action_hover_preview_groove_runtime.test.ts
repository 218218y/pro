import test from 'node:test';
import assert from 'node:assert/strict';

import { tryHandleDoorGrooveLayoutHoverPreview } from '../esm/native/services/canvas_picking_door_action_hover_preview_groove.ts';

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
}

const surface = {
  userData: {
    __wpGrooveSurface: true,
    __wpGrooveSurfacePartId: 'd1_left',
    __wpGrooveSurfaceRect: { minX: -0.5, maxX: 0.5, minY: -1, maxY: 1 },
    __wpGrooveSurfaceZ: 0.02,
    __wpGrooveSurfaceZSign: 1,
  },
  worldToLocal(point: Vec3) {
    return point;
  },
  localToWorld(point: Vec3) {
    return point;
  },
  getWorldQuaternion(target: unknown) {
    return target;
  },
};

function runPreview(grooveLayoutMap: Record<string, unknown>) {
  const marker = {
    visible: false,
    material: 'base',
    userData: { __matAdd: 'add', __matRemove: 'remove', __matGroove: 'groove' },
    position: { copy() {} },
    quaternion: { copy() {} },
    scale: {
      last: null as [number, number, number] | null,
      set(x: number, y: number, z: number) {
        this.last = [x, y, z];
      },
    },
  };
  const App = {
    store: { getState: () => ({ config: { grooveLayoutMap, groovesMap: {} } }) },
    maps: {
      getMap(name: string) {
        return name === 'grooveLayoutMap' ? grooveLayoutMap : {};
      },
    },
  };
  const handled = tryHandleDoorGrooveLayoutHoverPreview({
    App: App as never,
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: surface as never,
      hitY: 0.3,
      hitPoint: { x: 0.2, y: 0.3, z: 0.02, set() {} } as never,
      wardrobeGroup: {
        worldToLocal(point: Vec3) {
          return point;
        },
      },
    },
    doorMarker: marker as never,
    markerUd: marker.userData,
    local: new Vec3(),
    localHit: new Vec3(),
    wq: {
      copy() {
        return this;
      },
    },
    wardrobeGroup: {
      worldToLocal(point: Vec3) {
        return point;
      },
    },
    scopedHitDoorPid: 'd1_left',
    canonDoorPartKeyForMaps: id => id,
    readUi: () => ({
      grooveManualEnabled: true,
      currentGrooveDraftWidthCm: '40',
      currentGrooveDraftHeightCm: '60',
      currentGrooveOrientation: 'horizontal',
    }),
  });
  return { handled, marker };
}

test('manual groove hover uses the same sized rectangle as the persisted placement', () => {
  const add = runPreview({});
  assert.equal(add.handled, true);
  assert.equal(add.marker.visible, true);
  assert.equal(add.marker.material, 'add');
  assert.deepEqual(add.marker.scale.last, [0.395, 0.595, 1]);

  const remove = runPreview({
    d1_left: [
      {
        widthCm: 40,
        heightCm: 60,
        centerXNorm: 0.7,
        centerYNorm: 0.65,
        orientation: 'horizontal',
      },
    ],
  });
  assert.equal(remove.marker.material, 'remove');
  assert.deepEqual(remove.marker.scale.last, [0.395, 0.595, 1]);
});
