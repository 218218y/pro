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

function runPreview(
  grooveLayoutMap: Record<string, unknown>,
  hitPoint: { x: number; y: number } = { x: 0.2, y: 0.3 },
  options: {
    doorsArray?: unknown[];
    drawersArray?: unknown[];
    markerCenter?: boolean;
    returnPreview?: boolean;
  } = {}
) {
  const previewCalls: Record<string, unknown>[] = [];
  const marker = {
    visible: false,
    material: 'base',
    userData: {
      __matAdd: 'add',
      __matRemove: 'remove',
      __matGroove: 'groove',
      ...(options.markerCenter ? { __matCenter: 'center' } : {}),
    },
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
    render: { doorsArray: options.doorsArray || [], drawersArray: options.drawersArray || [] },
    store: { getState: () => ({ config: { grooveLayoutMap, groovesMap: {} } }) },
    maps: {
      getMap(name: string) {
        return name === 'grooveLayoutMap' ? grooveLayoutMap : {};
      },
    },
  };
  const handled = tryHandleDoorGrooveLayoutHoverPreview({
    App: App as never,
    THREE: {},
    hit: {
      hitDoorPid: 'd1_left',
      hitDoorGroup: surface as never,
      hitY: 0.3,
      hitPoint: { x: hitPoint.x, y: hitPoint.y, z: 0.02, set() {} } as never,
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
    setSketchPreview: args => {
      previewCalls.push(args);
      return options.returnPreview ? {} : undefined;
    },
  });
  return { handled, marker, previewCalls };
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

test('manual groove hover marks the same centered width and height clearances as sized mirror hover', () => {
  const centered = runPreview({}, { x: 0.01, y: 0.02 });
  assert.equal(centered.previewCalls.length, 1);
  assert.equal(centered.marker.material, 'add');
  assert.equal(centered.previewCalls[0].showCenterXGuide, false);
  assert.equal(centered.previewCalls[0].showCenterYGuide, false);
  const measurements = centered.previewCalls[0].clearanceMeasurements as Array<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    styleKey?: string;
  }>;
  assert.equal(measurements.length, 4);
  assert.equal(
    measurements.every(entry => entry.styleKey === 'center'),
    true
  );
});

test('manual groove hover uses manual-handle-style tolerance and guides for a symmetric groove on another door', () => {
  const otherSurface = {
    userData: {
      __wpGrooveSurface: true,
      __wpGrooveSurfacePartId: 'd2_right',
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

  const matched = runPreview(
    {
      d2_right: [
        {
          widthCm: 40,
          heightCm: 60,
          centerXNorm: 0.305,
          centerYNorm: 0.6525,
          orientation: 'horizontal',
          linesCount: 12,
        },
      ],
    },
    { x: 0.2, y: 0.3 },
    {
      doorsArray: [
        { partId: 'd1_left', group: surface, hingeSide: 'left' },
        { partId: 'd2_right', group: otherSurface, hingeSide: 'right' },
      ],
      markerCenter: true,
      returnPreview: true,
    }
  );

  assert.equal(matched.handled, true);
  assert.equal(matched.previewCalls.length, 1);
  assert.equal(matched.previewCalls[0].showCenterXGuide, true);
  assert.equal(matched.previewCalls[0].showCenterYGuide, true);
  assert.ok(Number(matched.previewCalls[0].guideWidth) > 3);
  assert.equal(matched.marker.material, 'center');
  const measurements = matched.previewCalls[0].clearanceMeasurements as Array<{ styleKey?: string }>;
  assert.equal(measurements.length, 4);
  assert.equal(
    measurements.every(entry => entry.styleKey === 'center'),
    true
  );
});

test('manual groove hover keeps the cross-door guide long when only the height matches', () => {
  const otherSurface = {
    userData: {
      __wpGrooveSurface: true,
      __wpGrooveSurfacePartId: 'd2_right',
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

  const matched = runPreview(
    {
      d2_right: [
        {
          widthCm: 40,
          heightCm: 60,
          centerXNorm: 0.5,
          centerYNorm: 0.6525,
          orientation: 'horizontal',
          linesCount: 12,
        },
      ],
    },
    { x: 0.2, y: 0.3 },
    {
      doorsArray: [
        { partId: 'd1_left', group: surface, hingeSide: 'left' },
        { partId: 'd2_right', group: otherSurface, hingeSide: 'right' },
      ],
      markerCenter: true,
      returnPreview: true,
    }
  );

  assert.equal(matched.previewCalls[0].showCenterXGuide, true);
  assert.equal(matched.previewCalls[0].showCenterYGuide, false);
  assert.ok(Number(matched.previewCalls[0].guideWidth) > 3);
  assert.equal(matched.marker.material, 'center');
});

test('manual groove hover does not compare a door layout against a drawer layout', () => {
  const drawerSurface = {
    userData: {
      __wpGrooveSurface: true,
      __wpGrooveSurfacePartId: 'd2_draw_0',
      __wpGrooveSurfaceRect: { minX: -0.5, maxX: 0.5, minY: -1, maxY: 1 },
      __wpGrooveSurfaceZ: 0.02,
      __wpGrooveSurfaceZSign: 1,
      __wpType: 'extDrawer',
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

  const result = runPreview(
    {
      d2_draw_0: [
        {
          widthCm: 40,
          heightCm: 60,
          centerXNorm: 0.305,
          centerYNorm: 0.6525,
          orientation: 'horizontal',
          linesCount: 12,
        },
      ],
    },
    { x: 0.2, y: 0.3 },
    {
      doorsArray: [{ partId: 'd1_left', group: surface, hingeSide: 'left' }],
      drawersArray: [{ partId: 'd2_draw_0', group: drawerSurface }],
      markerCenter: true,
      returnPreview: true,
    }
  );

  assert.equal(result.previewCalls[0].showCenterXGuide, false);
  assert.equal(result.previewCalls[0].showCenterYGuide, false);
  assert.equal(result.marker.material, 'add');
});

test('manual groove hover does not mark another door as symmetric when its groove count differs', () => {
  const otherSurface = {
    userData: {
      __wpGrooveSurface: true,
      __wpGrooveSurfacePartId: 'd2_right',
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

  const mismatched = runPreview(
    {
      d2_right: [
        {
          widthCm: 40,
          heightCm: 60,
          centerXNorm: 0.3,
          centerYNorm: 0.65,
          orientation: 'horizontal',
          linesCount: 11,
        },
      ],
    },
    { x: 0.2, y: 0.3 },
    {
      doorsArray: [
        { partId: 'd1_left', group: surface, hingeSide: 'left' },
        { partId: 'd2_right', group: otherSurface, hingeSide: 'right' },
      ],
      markerCenter: true,
      returnPreview: true,
    }
  );

  assert.equal(mismatched.previewCalls[0].showCenterXGuide, false);
  assert.equal(mismatched.previewCalls[0].showCenterYGuide, false);
  assert.equal(mismatched.marker.material, 'add');
});
