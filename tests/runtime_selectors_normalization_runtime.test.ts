import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readRuntimeScalarOrDefault,
  readRuntimeBoolFromSnapshot,
  readRuntimeNullableNumberFromSnapshot,
  readRuntimeNumberFromSnapshot,
} from '../esm/native/runtime/runtime_selectors.ts';

test('runtime selectors normalize legacy scalar values with typed defaults', () => {
  const rt = {
    sketchMode: '1',
    doorsLastToggleTime: '42',
    wardrobeDepthM: '0.61',
    drawersOpenId: '',
  };

  assert.equal(readRuntimeBoolFromSnapshot(rt, 'sketchMode', false), true);
  assert.equal(readRuntimeNumberFromSnapshot(rt, 'doorsLastToggleTime', 0), 42);
  assert.equal(readRuntimeNullableNumberFromSnapshot(rt, 'wardrobeDepthM', null), 0.61);

  assert.equal(readRuntimeScalarOrDefault(rt, 'sketchMode', false), true);
  assert.equal(readRuntimeScalarOrDefault(rt, 'doorsLastToggleTime', 0), 42);
  assert.equal(readRuntimeScalarOrDefault(rt, 'wardrobeDepthM', null), 0.61);
  assert.equal(readRuntimeScalarOrDefault(rt, 'drawersOpenId', 'fallback'), null);
});
