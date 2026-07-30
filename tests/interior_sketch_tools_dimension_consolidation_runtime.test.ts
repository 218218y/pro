import test from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_SKETCH_BOX_DEPTH_CM,
  DEFAULT_SKETCH_BOX_HEIGHT_CM,
  DEFAULT_SKETCH_BOX_WIDTH_CM,
  mkSketchBoxTool,
  parseSketchBoxTool,
} from '../esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts';
import * as composedSketchDimensions from '../esm/shared/dimensions/interior_sketch_tools_dimension_policy.ts';
import { SKETCH_BOX_SHELL_GEOMETRY_POLICY } from '../esm/shared/dimensions/sketch_box_geometry_policy.ts';
import { mToCm } from '../esm/shared/dimensions/units.ts';

test('Interior Sketch Tools composition preserves canonical policy and conversion identities', () => {
  assert.equal(composedSketchDimensions.SKETCH_BOX_SHELL_GEOMETRY_POLICY, SKETCH_BOX_SHELL_GEOMETRY_POLICY);
  assert.equal(composedSketchDimensions.mToCm, mToCm);
});

test('Interior Sketch Tools preserves shell-derived centimeter defaults', () => {
  assert.equal(
    DEFAULT_SKETCH_BOX_HEIGHT_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterHeightM))
  );
  assert.equal(
    DEFAULT_SKETCH_BOX_WIDTH_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterWidthM))
  );
  assert.equal(
    DEFAULT_SKETCH_BOX_DEPTH_CM,
    Math.round(mToCm(SKETCH_BOX_SHELL_GEOMETRY_POLICY.defaultOuterDepthM))
  );
});

test('Interior Sketch Tools preserves parsing and serialization behavior', () => {
  assert.equal(mkSketchBoxTool(41.6, null, null), 'sketch_box:42');
  assert.equal(mkSketchBoxTool(42, 80.2, null), 'sketch_box:42@80');
  assert.equal(mkSketchBoxTool(42, 80.2, 57.6), 'sketch_box:42@80@58');
  assert.deepEqual(parseSketchBoxTool('sketch_box:42@80@58'), {
    heightCm: 42,
    widthCm: 80,
    depthCm: 58,
  });
  assert.equal(parseSketchBoxTool('sketch_box:not-a-number'), null);
  assert.equal(parseSketchBoxTool('sketch_shelf:regular'), null);
});
