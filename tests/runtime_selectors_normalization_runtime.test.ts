import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readRuntimeScalarOrDefault,
  readRuntimeBoolFromSnapshot,
  readRuntimeNullableNumberFromSnapshot,
  readRuntimeNumberFromSnapshot,
} from '../esm/native/runtime/runtime_selectors.ts';

test('runtime selectors keep canonical typed values and reject legacy scalar coercion', () => {
  const rt = {
    sketchMode: true,
    doorsLastToggleTime: 42,
    wardrobeDepthM: 0.61,
    drawersOpenId: '',
  };

  assert.equal(readRuntimeBoolFromSnapshot(rt, 'sketchMode', false), true);
  assert.equal(readRuntimeNumberFromSnapshot(rt, 'doorsLastToggleTime', 0), 42);
  assert.equal(readRuntimeNullableNumberFromSnapshot(rt, 'wardrobeDepthM', null), 0.61);

  assert.equal(readRuntimeScalarOrDefault(rt, 'sketchMode', false), true);
  assert.equal(readRuntimeScalarOrDefault(rt, 'doorsLastToggleTime', 0), 42);
  assert.equal(readRuntimeScalarOrDefault(rt, 'wardrobeDepthM', null), 0.61);
  assert.equal(readRuntimeScalarOrDefault(rt, 'drawersOpenId', 'fallback'), null);

  const legacyRt = {
    sketchMode: '1',
    doorsLastToggleTime: '42',
    wardrobeDepthM: '0.61',
  };

  assert.equal(readRuntimeBoolFromSnapshot(legacyRt, 'sketchMode', false), false);
  assert.equal(readRuntimeNumberFromSnapshot(legacyRt, 'doorsLastToggleTime', 0), 0);
  assert.equal(readRuntimeNullableNumberFromSnapshot(legacyRt, 'wardrobeDepthM', null), null);
  assert.equal(readRuntimeScalarOrDefault(legacyRt, 'sketchMode', false), false);
  assert.equal(readRuntimeScalarOrDefault(legacyRt, 'doorsLastToggleTime', 0), 0);
  assert.equal(readRuntimeScalarOrDefault(legacyRt, 'wardrobeDepthM', null), null);
});
