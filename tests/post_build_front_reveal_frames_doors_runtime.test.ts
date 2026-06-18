import test from 'node:test';
import assert from 'node:assert/strict';

import { applyFrontRevealDoorFrames } from '../esm/native/builder/post_build_front_reveal_frames_doors.ts';
import { getDoorsArray } from '../esm/native/runtime/render_access.ts';

function createSegment(partId: string, removed = false) {
  const added: unknown[] = [];
  return {
    children: [],
    position: { x: 0, y: 0, z: 0 },
    rotation: {},
    userData: {
      partId,
      __wpSketchDoorSegment: true,
      __wpDoorRemoved: removed,
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

test('front reveal door frames clear but do not redraw lines on removed sketch drawer-cut segments', () => {
  const App: Record<string, unknown> = {};
  const removedSegment = createSegment('d91_bot', true);
  const visibleSegment = createSegment('d91_top', false);
  const doorGroup = {
    children: [removedSegment, visibleSegment],
    position: { x: 0, y: 0.8, z: 0.04 },
    rotation: {},
    userData: {
      partId: 'd91_full',
      __doorWidth: 0.8,
      __doorHeight: 1.6,
      __wpFrontThickness: 0.02,
      __wpSketchSegmentedDoor: true,
    },
    add() {},
    remove() {},
  };
  getDoorsArray(App).push({ group: doorGroup, type: 'hinged' } as any);

  const removedFrameClears: string[] = [];
  const builtFor: string[] = [];

  applyFrontRevealDoorFrames({} as any, {
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
    getObjectLocalBounds(seg: any) {
      builtFor.push(String(seg.userData.partId));
      return { min: { x: -0.4, y: -0.25 }, max: { x: 0.4, y: 0.25 } } as any;
    },
    pickRevealLineMaterial() {
      return { kind: 'lineMat' } as any;
    },
    buildRectLines() {
      return { kind: 'lines' } as any;
    },
    removeLocalFrames(seg: any) {
      removedFrameClears.push(String(seg.userData.partId));
    },
  });

  assert.deepEqual(removedFrameClears, ['d91_bot', 'd91_top']);
  assert.deepEqual(builtFor, ['d91_top']);
  assert.deepEqual((removedSegment as any).__added, []);
  assert.deepEqual((visibleSegment as any).__added, [{ kind: 'lines' }]);
});
