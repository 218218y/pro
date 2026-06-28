import test from 'node:test';
import assert from 'node:assert/strict';

import { __wp_resolveSketchBoxGeometry } from '../esm/native/services/canvas_picking_local_helpers.ts';
import {
  doSketchBoxesOverlap,
  isSketchModuleBoxPlacementBlocked,
  resolveSketchModuleBoxPlacement,
} from '../esm/native/services/canvas_picking_sketch_box_overlap.ts';
import {
  clampSketchModuleBoxCenterY,
  resolveModuleBoxes,
} from '../esm/native/services/canvas_picking_sketch_box_overlap_shared.ts';

const moduleArgs = {
  bottomY: -1,
  spanH: 2,
  innerW: 1.2,
  internalCenterX: 0,
  internalDepth: 0.55,
  internalZ: 0,
  woodThick: 0.018,
  resolveSketchBoxGeometry: __wp_resolveSketchBoxGeometry,
};

test('resolved module boxes ignore free-placement items and the requested ignoreBoxId', () => {
  const resolved = resolveModuleBoxes({
    boxes: [
      { id: 'keep', yNorm: 0.5, heightM: 0.4, widthM: 0.5, xNorm: 0.4 },
      { id: 'skip_me', yNorm: 0.6, heightM: 0.3, widthM: 0.4, xNorm: 0.7 },
      { id: 'free_box', freePlacement: true, yNorm: 0.2, heightM: 0.25 },
    ],
    ignoreBoxId: 'skip_me',
    ...moduleArgs,
  });

  assert.deepEqual(
    resolved.map(box => box.id),
    ['keep']
  );
  assert.ok(Math.abs(resolved[0].centerY - 0) <= 1e-9);
});

test('resolved module boxes reject string-encoded live geometry', () => {
  const resolved = resolveModuleBoxes({
    boxes: [
      {
        id: 'string_box',
        yNorm: '0.5',
        heightM: '0.4',
        widthM: '0.5',
        xNorm: '0.4',
      },
    ],
    ...moduleArgs,
  });

  assert.deepEqual(resolved, []);
});

test('vertical center clamp respects module bounds even when desired center is far outside range', () => {
  const clamped = clampSketchModuleBoxCenterY({
    centerY: 3,
    boxH: 0.4,
    bottomY: -1,
    spanH: 2,
    pad: 0.01,
  });

  assert.ok(Math.abs(clamped - 0.79) <= 1e-9);
});

test('placement resolution can ignore the edited box id instead of blocking on itself', () => {
  const blockedWithoutIgnore = isSketchModuleBoxPlacementBlocked({
    boxes: [{ id: 'self', yNorm: 0.5, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 }],
    centerX: 0,
    centerY: 0,
    boxW: 0.6,
    boxH: 0.4,
    ...moduleArgs,
  });
  const blockedWithIgnore = isSketchModuleBoxPlacementBlocked({
    boxes: [{ id: 'self', yNorm: 0.5, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 }],
    centerX: 0,
    centerY: 0,
    boxW: 0.6,
    boxH: 0.4,
    ignoreBoxId: 'self',
    ...moduleArgs,
  });

  assert.equal(blockedWithoutIgnore, true);
  assert.equal(blockedWithIgnore, false);
});

test('placement reports blocked when overlap chain reaches the module ceiling and floor', () => {
  const resolved = resolveSketchModuleBoxPlacement({
    boxes: [
      { id: 'bottom', yNorm: 0.25, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 },
      { id: 'mid', yNorm: 0.5, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 },
      { id: 'top', yNorm: 0.75, heightM: 0.4, widthM: 0.6, depthM: 0.45, xNorm: 0.5 },
    ],
    desiredCenterX: 0,
    desiredCenterY: 0,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.006,
    ...moduleArgs,
  });

  assert.equal(resolved.blocked, true);
  assert.equal(resolved.adjusted, false);
  assert.equal(resolved.anchorBoxId, 'mid');
});

test('overlap primitive still allows exact edge contact without treating it as overlap', () => {
  assert.equal(
    doSketchBoxesOverlap({
      centerX: 0,
      centerY: 0,
      boxW: 0.6,
      boxH: 0.4,
      otherCenterX: 0,
      otherCenterY: 0.4,
      otherW: 0.6,
      otherH: 0.4,
      gap: 0,
    }),
    false
  );
});

test('placement resolution can be confined to the pointer slot instead of jumping across blockers', () => {
  const blockedBelow = resolveSketchModuleBoxPlacement({
    boxes: [],
    blockers: [{ id: 'shelf-1', minY: -0.78, maxY: -0.74, collisionGapM: 0, hardCollision: true }],
    desiredCenterX: 0,
    desiredCenterY: -0.9,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.02,
    confineToPointerSlot: true,
    ...moduleArgs,
  });

  assert.equal(blockedBelow.blocked, true);
  assert.equal(blockedBelow.adjusted, false);
  assert.equal(blockedBelow.anchorBoxId, 'blocker:shelf-1');

  const adjustedAbove = resolveSketchModuleBoxPlacement({
    boxes: [],
    blockers: [{ id: 'shelf-1', minY: -0.78, maxY: -0.74, collisionGapM: 0, hardCollision: true }],
    desiredCenterX: 0,
    desiredCenterY: -0.7,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.02,
    confineToPointerSlot: true,
    ...moduleArgs,
  });

  assert.equal(adjustedAbove.blocked, false);
  assert.equal(adjustedAbove.adjusted, true);
  assert.ok(Math.abs(adjustedAbove.centerY - -0.54) <= 1e-9);
});

test('placement resolution reports blocked when vertical content blockers leave no valid box slot', () => {
  const resolved = resolveSketchModuleBoxPlacement({
    boxes: [],
    blockers: [
      { id: 'bottom-blocker', minY: -0.9, maxY: -0.25, hardCollision: true },
      { id: 'middle-blocker', minY: -0.35, maxY: 0.35, hardCollision: true },
      { id: 'top-blocker', minY: 0.25, maxY: 0.9, hardCollision: true },
    ],
    desiredCenterX: 0,
    desiredCenterY: 0,
    boxW: 0.6,
    boxH: 0.4,
    pad: 0.02,
    ...moduleArgs,
  });

  assert.equal(resolved.blocked, true);
  assert.equal(resolved.adjusted, false);
  assert.equal(resolved.anchorBoxId, 'blocker:middle-blocker');
});
