import test from 'node:test';
import assert from 'node:assert/strict';

import {
  resolveSketchExternalDrawerDoorFaceTopY,
  resolveSketchExternalDrawerFaceVerticalAlignment,
} from '../esm/native/builder/render_interior_sketch_shared_external_drawers.ts';

test('sketch external drawer shared helpers do not coerce string runtime dimensions', () => {
  assert.equal(resolveSketchExternalDrawerDoorFaceTopY('2.4' as any, 0.018), 0);
  assert.equal(resolveSketchExternalDrawerDoorFaceTopY(2.4, '0.018' as any), 2.4);
});

test('sketch external drawer vertical alignment ignores string runtime bounds', () => {
  const aligned = resolveSketchExternalDrawerFaceVerticalAlignment({
    drawerIndex: 0,
    drawerCount: 1,
    centerY: 0.5,
    visualH: 0.4,
    stackMinY: '0.3' as any,
    stackMaxY: '0.7' as any,
    containerMinY: 0.3,
    containerMaxY: 0.7,
    flushTargetMinY: '0.25' as any,
    flushTargetMaxY: '0.75' as any,
  });

  assert.equal(aligned.flushBottom, false);
  assert.equal(aligned.flushTop, false);
  assert.ok(Math.abs(aligned.height - 0.4) < 1e-12);
  assert.equal(aligned.offsetY, 0);
  assert.equal(aligned.minY, 0.3);
  assert.equal(aligned.maxY, 0.7);
});

test('sketch external drawer vertical alignment can preserve the natural bottom reveal beside another drawer stack', () => {
  const aligned = resolveSketchExternalDrawerFaceVerticalAlignment({
    drawerIndex: 0,
    drawerCount: 1,
    centerY: 0.61,
    visualH: 0.218,
    stackMinY: 0.5,
    stackMaxY: 0.72,
    containerMinY: 0.5,
    containerMaxY: 1.8,
    allowFlushBottom: false,
  });

  assert.equal(aligned.flushBottom, false);
  assert.ok(Math.abs(aligned.height - 0.218) < 1e-12);
  assert.ok(Math.abs(aligned.minY - 0.501) < 1e-12);
  assert.ok(Math.abs(aligned.maxY - 0.719) < 1e-12);
});
