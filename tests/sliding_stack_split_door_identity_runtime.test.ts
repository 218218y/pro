import test from 'node:test';
import assert from 'node:assert/strict';

import {
  scopeSlidingDoorOpsForStack,
  scopeSlidingDoorPartIdForStack,
} from '../esm/native/builder/sliding_doors_pipeline.ts';
import { __wp_scopeCornerPartKeyForStack } from '../esm/native/services/canvas_picking_door_part_helpers.ts';
import { __scopeCornerHoverPartKey } from '../esm/native/services/canvas_picking_door_hover_targets_policy.ts';

test('stack-split lower sliding doors receive lower-scoped ids before rendering', () => {
  assert.equal(scopeSlidingDoorPartIdForStack('sliding_door_1', 'top'), 'sliding_door_1');
  assert.equal(scopeSlidingDoorPartIdForStack('sliding_door_1', 'bottom'), 'lower_sliding_door_1');
  assert.equal(scopeSlidingDoorPartIdForStack('lower_sliding_door_1', 'bottom'), 'lower_sliding_door_1');

  const ops = {
    rail: {
      width: 2,
      height: 0.04,
      depth: 0.07,
      topY: 2,
      bottomY: 0.1,
      z: 0.2,
      lineOffsetY: 0,
      lineOffsetZ: 0,
    },
    doors: [
      { partId: 'sliding_door_1', index: 0, total: 2, x: -0.3, y: 1, z: 0.2, width: 1, height: 1.8 },
      { partId: 'sliding_door_2', index: 1, total: 2, x: 0.3, y: 1, z: 0.2, width: 1, height: 1.8 },
    ],
  };

  const scoped = scopeSlidingDoorOpsForStack(ops, 'bottom');
  assert.equal(scoped.doors[0].partId, 'lower_sliding_door_1');
  assert.equal(scoped.doors[1].partId, 'lower_sliding_door_2');
  assert.equal(ops.doors[0].partId, 'sliding_door_1');
});

test('lower-stack hover and remove fallbacks scope stale sliding ids independently from upper doors', () => {
  assert.equal(__wp_scopeCornerPartKeyForStack('sliding_door_1', 'bottom'), 'lower_sliding_door_1');
  assert.equal(__wp_scopeCornerPartKeyForStack('sliding_door_1', 'top'), 'sliding_door_1');
  assert.equal(__wp_scopeCornerPartKeyForStack('lower_sliding_door_1', 'bottom'), 'lower_sliding_door_1');

  assert.equal(__scopeCornerHoverPartKey('sliding_door_2', 'bottom'), 'lower_sliding_door_2');
  assert.equal(__scopeCornerHoverPartKey('sliding_door_2', 'top'), 'sliding_door_2');
  assert.equal(__scopeCornerHoverPartKey('lower_sliding_door_2', 'bottom'), 'lower_sliding_door_2');
});
