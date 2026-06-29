import test from 'node:test';
import assert from 'node:assert/strict';

import { createBottomHandleTypeResolver } from '../esm/native/builder/build_stack_split_bottom_handles.ts';
import { makeDoorStateAccessors } from '../esm/native/builder/doors_state_utils.ts';

test('bottom handle resolver consumes the explicit stack policy without an App-shaped dependency', () => {
  const seen: string[] = [];
  const resolver = createBottomHandleTypeResolver({
    cfg: { globalHandleType: 'edge', handlesMap: {} },
    doorState: makeDoorStateAccessors({}),
    isEdgeHandleDefaultNone(partId) {
      seen.push(String(partId));
      return partId === 'd1000';
    },
    handleControlEnabled: true,
    bottomDoorsCount: 2,
    topDoorsCount: 2,
    lowerDoorIdStart: 1000,
    lowerDoorIdOffset: 999,
    getHandleTypeTop: () => 'edge',
  });

  assert.equal(resolver('d1000_full'), 'none');
  assert.deepEqual(seen, ['d1000']);
});

test('bottom handle resolver preserves canonical top override mapping for equal stack layouts', () => {
  const resolver = createBottomHandleTypeResolver({
    cfg: { globalHandleType: 'standard', handlesMap: { d1_full: 'edge' } },
    doorState: makeDoorStateAccessors({}),
    isEdgeHandleDefaultNone: () => false,
    handleControlEnabled: true,
    bottomDoorsCount: 2,
    topDoorsCount: 2,
    lowerDoorIdStart: 1000,
    lowerDoorIdOffset: 999,
    getHandleTypeTop: partId => (partId === 'd1_full' ? 'edge' : 'standard'),
  });

  assert.equal(resolver('d1000_full'), 'edge');
});

test('bottom handle resolver only maps canonical lower door ids', () => {
  const resolver = createBottomHandleTypeResolver({
    cfg: { globalHandleType: 'standard', handlesMap: { d1_full: 'edge' } },
    doorState: makeDoorStateAccessors({}),
    isEdgeHandleDefaultNone: () => false,
    handleControlEnabled: true,
    bottomDoorsCount: 2,
    topDoorsCount: 2,
    lowerDoorIdStart: 1000,
    lowerDoorIdOffset: 999,
    getHandleTypeTop: partId => (partId === 'd1_full' ? 'edge' : 'standard'),
  });

  assert.equal(resolver('d1000_full'), 'edge');
  assert.equal(resolver('d01000_full'), 'standard');
});
