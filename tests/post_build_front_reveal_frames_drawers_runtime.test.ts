import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFrontRevealDrawerFrames } from '../esm/native/builder/post_build_front_reveal_frames_drawers.ts';
import { getDrawersArray } from '../esm/native/runtime/render_access.ts';

function createDrawerGroup() {
  const added: unknown[] = [];
  return {
    children: [],
    position: { z: 0.04 },
    rotation: {},
    userData: {
      partId: 'd1_draw_1',
      __doorWidth: 0.8,
      __doorHeight: 0.3,
      __wpFaceOffsetX: 0.02,
      __wpFaceOffsetY: 0.05,
      __frontMaxZ: 0.012,
    },
    add(node: unknown) {
      added.push(node);
    },
    remove() {},
    get __added() {
      return added;
    },
  };
}

test('front reveal drawer frames honor the face vertical offset when external drawer fronts are shifted', () => {
  const App: Record<string, unknown> = {};
  const drawerGroup = createDrawerGroup();
  getDrawersArray(App).push({ group: drawerGroup } as any);

  let rectCall: { xL: number; xR: number; yB: number; yT: number; z: number } | null = null;
  const fakeLines = { kind: 'lines' };

  applyFrontRevealDrawerFrames({
    App: App as any,
    THREE: {} as any,
    wardrobeGroup: {
      traverse() {
        throw new Error('fallback traversal should not run when drawersArray is populated');
      },
    } as any,
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
      return { kind: 'lineMat' } as any;
    },
    buildRectLines(xL, xR, yB, yT, z) {
      rectCall = { xL, xR, yB, yT, z };
      return fakeLines as any;
    },
    removeLocalFrames() {},
  });

  assert.ok(rectCall);
  assert.equal(rectCall!.xL, -0.4 + 0.02);
  assert.equal(rectCall!.xR, 0.4 + 0.02);
  assert.equal(rectCall!.yB, -0.15 + 0.05);
  assert.equal(rectCall!.yT, 0.15 + 0.05);
  assert.equal(rectCall!.z, 0.012 + 0.001);
  assert.deepEqual((drawerGroup as any).__added, [fakeLines]);
});

test('front reveal drawer frames apply to chest-mode drawer groups', () => {
  const App: Record<string, unknown> = {};
  const drawerGroup = createDrawerGroup();
  drawerGroup.userData.partId = 'chest_drawer_0';
  getDrawersArray(App).push({ group: drawerGroup } as any);

  let rectCall: { xL: number; xR: number; yB: number; yT: number; z: number } | null = null;
  const fakeLines = { kind: 'chest-drawer-lines' };

  applyFrontRevealDrawerFrames({
    App: App as any,
    THREE: {} as any,
    wardrobeGroup: { traverse() {} } as any,
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
      return { kind: 'lineMat' } as any;
    },
    buildRectLines(xL, xR, yB, yT, z) {
      rectCall = { xL, xR, yB, yT, z };
      return fakeLines as any;
    },
    removeLocalFrames() {},
  });

  assert.ok(rectCall);
  assert.deepEqual((drawerGroup as any).__added, [fakeLines]);
});

test('front reveal drawer frames preserve local-front presence and owner thickness fallback placement', () => {
  const cases = [
    {
      partId: 'drawer-local-front',
      positionZ: 0.04,
      localFrontMax: -0.015,
      expectedZ: -0.0158,
    },
    {
      partId: 'drawer-thickness-fallback',
      positionZ: -0.04,
      localFrontMax: 0,
      expectedZ: -0.0108,
    },
  ];

  for (const drawerCase of cases) {
    const App: Record<string, unknown> = {};
    const drawerGroup = createDrawerGroup();
    drawerGroup.userData.partId = drawerCase.partId;
    drawerGroup.userData.__frontMaxZ = 0;
    drawerGroup.position.z = drawerCase.positionZ;
    getDrawersArray(App).push({ group: drawerGroup } as any);

    let capturedZ: number | null = null;
    applyFrontRevealDrawerFrames({
      App: App as any,
      THREE: {} as any,
      wardrobeGroup: { traverse() {} } as any,
      zNudge: 0.0008,
      localName: 'frontRevealFrames',
      reportSoft() {},
      cleanupStaleLocalFrames() {},
      getRevealZSignOverride() {
        return null;
      },
      getObjectLocalBounds() {
        return {
          min: { x: -0.4, y: -0.15, z: -0.02 },
          max: { x: 0.4, y: 0.15, z: drawerCase.localFrontMax },
        } as any;
      },
      pickRevealLineMaterial() {
        return { kind: 'lineMat' } as any;
      },
      buildRectLines(_xL, _xR, _yB, _yT, z) {
        capturedZ = z;
        return { kind: 'lines' } as any;
      },
      removeLocalFrames() {},
    });

    assert.ok(capturedZ != null && Math.abs(capturedZ - drawerCase.expectedZ) < 1e-12, drawerCase.partId);
  }
});
