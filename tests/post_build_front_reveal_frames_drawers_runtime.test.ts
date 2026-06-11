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
    cleanupLegacyFrames() {},
    cleanupStaleLocalFrames() {},
    cleanupLegacySeamHelpers() {},
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
