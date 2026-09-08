import test from 'node:test';
import assert from 'node:assert/strict';

import { markWardrobeRangeStackScope } from '../esm/native/builder/build_stack_shift_runtime.ts';

function createApp(children: any[]) {
  return { render: { wardrobeGroup: { children } } } as any;
}

test('stack hover scope stamps only the requested built range and preserves global free-placement objects', () => {
  const lowerA = { userData: {} };
  const lowerB = { userData: { existing: true } };
  const upperA = { userData: {} };
  const freeBox = { userData: { partId: 'sketch_box_free_7' } };
  const children = [lowerA, lowerB, upperA, freeBox];
  const App = createApp(children);

  markWardrobeRangeStackScope({ App, fromIdx: 0, toIdx: 2, stackKey: 'bottom' });
  markWardrobeRangeStackScope({ App, fromIdx: 2, toIdx: children.length, stackKey: 'top' });

  assert.equal(lowerA.userData.__wpStackRegion, 'bottom');
  assert.equal(lowerB.userData.__wpStackRegion, 'bottom');
  assert.equal(lowerB.userData.existing, true);
  assert.equal(upperA.userData.__wpStackRegion, 'top');
  assert.equal(freeBox.userData.__wpStackRegion, undefined);
});

test('stack hover scope can mark a unified carcass range as shared geometry', () => {
  const lower = { userData: { __wpStackRegion: 'bottom' } };
  const sharedSide = { userData: {} };
  const sharedTop = { userData: { existing: true } };
  const upper = { userData: { __wpStack: 'top' } };
  const children = [lower, sharedSide, sharedTop, upper];
  const App = createApp(children);

  markWardrobeRangeStackScope({ App, fromIdx: 1, toIdx: 3, stackKey: 'shared' });

  assert.equal(lower.userData.__wpStackRegion, 'bottom');
  assert.equal(sharedSide.userData.__wpStackRegion, 'shared');
  assert.equal(sharedTop.userData.__wpStackRegion, 'shared');
  assert.equal(sharedTop.userData.existing, true);
  assert.equal(upper.userData.__wpStack, 'top');
});
