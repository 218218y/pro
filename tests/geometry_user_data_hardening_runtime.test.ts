import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readDoorLeafRectFromGeometryUserData,
  readGeometryUserDataNumber,
  readGeometryUserDataPositiveNumber,
  readGeometryUserDataSign,
} from '../esm/native/builder/geometry_user_data_contracts.ts';
import { appendDoorTrimVisuals } from '../esm/native/builder/door_trim_visuals.ts';
import { createFrontRevealGeometryRuntime } from '../esm/native/builder/post_build_front_reveal_frames_geometry.ts';
import { applyFrontRevealDoorFrames } from '../esm/native/builder/post_build_front_reveal_frames_doors.ts';
import { applyFrontRevealDrawerFrames } from '../esm/native/builder/post_build_front_reveal_frames_drawers.ts';
import { rebuildSketchSegmentedDoor } from '../esm/native/builder/post_build_sketch_door_cuts_rebuild.ts';
import { getDrawersArray } from '../esm/native/runtime/render_access.ts';

class FakeBoxGeometry {
  args: [number, number, number];
  constructor(width: number, height: number, depth: number) {
    this.args = [width, height, depth];
  }
}

class FakeMeshStandardMaterial {
  __keepMaterial?: boolean;
  constructor(readonly params: Record<string, unknown>) {}
}

class FakeMesh {
  userData: Record<string, unknown> = {};
  renderOrder = 0;
  children: unknown[] = [];
  position = {
    last: null as [number, number, number] | null,
    set: (x: number, y: number, z: number) => {
      this.position.last = [x, y, z];
    },
  };

  constructor(
    readonly geometry: unknown,
    readonly material: unknown
  ) {}

  add(child: unknown) {
    this.children.push(child);
  }
}

const trimThree = {
  BoxGeometry: FakeBoxGeometry,
  MeshStandardMaterial: FakeMeshStandardMaterial,
  Mesh: FakeMesh,
};

test('geometry userData readers reject numeric strings at the internal metadata boundary', () => {
  assert.equal(readGeometryUserDataNumber('0.4'), null);
  assert.equal(readGeometryUserDataPositiveNumber('0.4'), null);
  assert.equal(readGeometryUserDataNumber(0.4), 0.4);
  assert.equal(readGeometryUserDataPositiveNumber(0.4), 0.4);
  assert.equal(readGeometryUserDataSign('-1'), null);
  assert.equal(readGeometryUserDataSign(-1), -1);

  assert.equal(
    readDoorLeafRectFromGeometryUserData({ __doorWidth: '0.8', __doorHeight: 1.2 } as never),
    null
  );
  assert.deepEqual(
    readDoorLeafRectFromGeometryUserData({ __doorWidth: 0.8, __doorHeight: 1.2, __doorMeshOffsetX: '0.1' }),
    { minX: -0.4, maxX: 0.4, minY: -0.6, maxY: 0.6 }
  );
});

test('door trim visuals do not coerce string geometry args into valid trim placement', () => {
  const group = {
    children: [] as unknown[],
    add(node: unknown) {
      this.children.push(node);
    },
  };
  appendDoorTrimVisuals({
    App: { services: {} },
    THREE: trimThree,
    group,
    partId: 'd1_full',
    trims: [{ id: 'trim-1', axis: 'horizontal', span: 'full', color: 'nickel' }],
    doorWidth: '0.8' as never,
    doorHeight: 1.2,
  });

  assert.equal(group.children.length, 0);
});

test('front reveal z-sign overrides reject string signs from userData metadata', () => {
  const runtime = createFrontRevealGeometryRuntime({
    THREE: {} as never,
    baseLineMaterial: { kind: 'line' },
    localName: 'frontRevealFrames',
  });

  assert.equal(runtime.getRevealZSignOverride({ __handleZSign: '-1' }), null);
  assert.equal(runtime.getRevealZSignOverride({ __handleZSign: -1 }), -1);
});

test('front reveal door fallback scan ignores scene doors with string geometry metadata', () => {
  const sceneDoor = {
    children: [],
    position: { x: 0, y: 0, z: 0.04 },
    rotation: {},
    userData: { partId: 'd1_full', __doorWidth: '0.8', __doorHeight: 1.6 },
    add() {
      throw new Error('string-metadata door should not receive reveal lines');
    },
    remove() {},
  };
  let buildCount = 0;

  applyFrontRevealDoorFrames({} as never, {
    App: { render: {} } as never,
    THREE: {} as never,
    wardrobeGroup: {
      traverse(fn: (node: unknown) => void) {
        fn(sceneDoor);
      },
    } as never,
    zNudge: 0.001,
    localName: 'frontRevealFrames',
    reportSoft() {},
    cleanupStaleLocalFrames() {},
    getRevealZSignOverride() {
      return null;
    },
    getObjectLocalBounds() {
      return null;
    },
    pickRevealLineMaterial() {
      return { kind: 'lineMat' } as never;
    },
    buildRectLines() {
      buildCount += 1;
      return { kind: 'lines' } as never;
    },
    removeLocalFrames() {},
  });

  assert.equal(buildCount, 0);
});

test('front reveal drawer frames ignore string face offsets and front z metadata', () => {
  const App: Record<string, unknown> = {};
  const added: unknown[] = [];
  const drawerGroup = {
    children: [],
    position: { x: 0, y: 0, z: 0.04 },
    rotation: {},
    userData: {
      partId: 'd1_draw_1',
      __doorWidth: 0.8,
      __doorHeight: 0.3,
      __wpFaceOffsetX: '0.02',
      __wpFaceOffsetY: '0.05',
      __frontMaxZ: '0.012',
    },
    add(node: unknown) {
      added.push(node);
    },
    remove() {},
  };
  getDrawersArray(App).push({ group: drawerGroup } as never);

  let rectCall: { xL: number; xR: number; yB: number; yT: number; z: number } | null = null;
  applyFrontRevealDrawerFrames({
    App: App as never,
    THREE: {
      Vector3: class {
        x = 0;
        y = 0;
        z = 0;
      },
    } as never,
    wardrobeGroup: { traverse() {} } as never,
    zNudge: 0.001,
    localName: 'frontRevealFrames',
    reportSoft() {},
    cleanupStaleLocalFrames() {},
    getRevealZSignOverride() {
      return null;
    },
    getObjectLocalBounds() {
      return { max: { z: 0.05 } } as never;
    },
    pickRevealLineMaterial() {
      return { kind: 'lineMat' } as never;
    },
    buildRectLines(xL, xR, yB, yT, z) {
      rectCall = { xL, xR, yB, yT, z };
      return { kind: 'lines' } as never;
    },
    removeLocalFrames() {},
  });

  assert.ok(rectCall);
  assert.equal(rectCall!.xL, -0.4);
  assert.equal(rectCall!.xR, 0.4);
  assert.equal(rectCall!.yB, -0.15);
  assert.equal(rectCall!.yT, 0.15);
  assert.ok(Math.abs(rectCall!.z - 0.051) < 1e-12);
  assert.equal(added.length, 1);
});

test('sketch segmented-door rebuild leaves the source door untouched when door metrics are strings', () => {
  const child = { kind: 'existing-child' };
  const group = {
    children: [child],
    position: { x: 0, y: 0, z: 0 },
    rotation: {},
    userData: { partId: 'd1_full', __doorWidth: '0.8', __doorHeight: 1.6 },
    add() {},
    remove(node: unknown) {
      this.children = this.children.filter(item => item !== node);
    },
  };

  rebuildSketchSegmentedDoor({
    runtime: {
      App: {},
      THREE: {},
      isDoorRemoved() {
        return false;
      },
      resolveHandleType() {
        return 'none';
      },
      resolveManualHandlePosition() {
        return null;
      },
    } as never,
    g: group as never,
    ud: group.userData,
    visibleSegments: [{ yMin: -0.8, yMax: 0.8 }],
    basePartId: 'd1_full',
  });

  assert.deepEqual(group.children, [child]);
  assert.equal(group.userData.__wpSketchSegmentedDoor, undefined);
});
