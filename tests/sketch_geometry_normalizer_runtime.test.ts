import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeBuilderDraftGeometryScalar,
  normalizeBuilderDraftSketchExtrasGeometry,
  normalizeBuilderRuntimeGeometryScalar,
  readBuilderDraftGeometryNumber,
} from '../esm/native/builder/render_interior_sketch_geometry_normalizer.ts';

test('draft geometry normalizer accepts only explicit decimal text', () => {
  assert.equal(normalizeBuilderDraftGeometryScalar(' 1.25 '), 1.25);
  assert.equal(normalizeBuilderDraftGeometryScalar('.5'), 0.5);
  assert.equal(normalizeBuilderDraftGeometryScalar('-0.25'), -0.25);
  assert.equal(normalizeBuilderDraftGeometryScalar('1e3'), null);
  assert.equal(normalizeBuilderDraftGeometryScalar('0x10'), null);
  assert.equal(normalizeBuilderDraftGeometryScalar('12px'), null);
  assert.equal(normalizeBuilderDraftGeometryScalar(''), null);
});

test('runtime geometry normalizer keeps string values out of runtime scalar contracts', () => {
  assert.equal(normalizeBuilderRuntimeGeometryScalar(0.75), 0.75);
  assert.equal(normalizeBuilderRuntimeGeometryScalar('0.75'), null);
  assert.equal(readBuilderDraftGeometryNumber('1e3', 7), 7);
});

test('draft sketch extras geometry rejects JS numeric syntax inside nested extras', () => {
  const normalized = normalizeBuilderDraftSketchExtrasGeometry({
    boxes: [
      {
        widthM: '0.8',
        depthM: '1e0',
        drawers: [{ yNormC: '.5', drawerHeightM: '0x10' }],
      },
    ],
  }) as any;

  assert.equal(normalized.boxes[0].widthM, 0.8);
  assert.equal(normalized.boxes[0].depthM, null);
  assert.equal(normalized.boxes[0].drawers[0].yNormC, 0.5);
  assert.equal(normalized.boxes[0].drawers[0].drawerHeightM, null);
});
