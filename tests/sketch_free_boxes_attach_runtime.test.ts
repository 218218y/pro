import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveSketchFreeBoxAttachPlacement } from '../esm/native/services/canvas_picking_sketch_free_boxes.ts';

test('free-box attach keeps side attachment stable near upper corner while preserving asymmetric offset', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.31,
    pointY: 0.45,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.8,
    previewW: 0.4,
    previewH: 0.4,
    gap: 0.005,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'x');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.505) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0.45) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach still prefers top/bottom when the cursor is only outside vertically', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.25,
    pointY: 0.42,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.8,
    previewW: 0.4,
    previewH: 0.4,
    gap: 0.005,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'y');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.25) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0.605) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach near the lower corners still prefers vertical stacking symmetrically on the left and right', () => {
  const left = resolveSketchFreeBoxAttachPlacement({
    pointX: -0.5,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });
  const right = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.5,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(left);
  assert.ok(right);
  assert.equal(left.fixedAxis, 'y');
  assert.equal(right.fixedAxis, 'y');
  assert.equal(left.direction, -1);
  assert.equal(right.direction, -1);
  assert.ok(Math.abs(left.centerX - -0.5) <= 1e-9);
  assert.ok(Math.abs(right.centerX - 0.5) <= 1e-9);
  assert.ok(Math.abs(left.centerY - -0.356) <= 1e-9);
  assert.ok(Math.abs(right.centerY - -0.356) <= 1e-9);
});

test('free-box attach below still allows a true staircase corner touch before detaching', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.6,
    pointY: -0.18,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'y');
  assert.equal(placement.direction, -1);
  assert.ok(Math.abs(placement.centerX - 0.6) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - -0.356) <= 1e-9);
  assert.equal(placement.snappedToCenter, false);
});

test('free-box attach still prefers side attachment when the cursor is clearly outside only on X', () => {
  const placement = resolveSketchFreeBoxAttachPlacement({
    pointX: 0.68,
    pointY: 0,
    targetCenterX: 0,
    targetCenterY: 0,
    targetW: 0.6,
    targetH: 0.4,
    previewW: 0.6,
    previewH: 0.3,
    gap: 0.006,
  });

  assert.ok(placement);
  assert.equal(placement.fixedAxis, 'x');
  assert.equal(placement.direction, 1);
  assert.ok(Math.abs(placement.centerX - 0.606) <= 1e-9);
  assert.ok(Math.abs(placement.centerY - 0) <= 1e-9);
});
