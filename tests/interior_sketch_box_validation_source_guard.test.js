import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const component = fs.readFileSync(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_components.tsx',
  'utf8'
);
const section = fs.readFileSync(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx',
  'utf8'
);
const runtime = fs.readFileSync(
  'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime_dimensions.ts',
  'utf8'
);

test('[interior-sketch-box] numeric fields expose the same visible validation affordances as structure dims', () => {
  assert.match(component, /aria-invalid=\{validationMessage \? true : undefined\}/);
  assert.match(component, /aria-describedby=\{validationMessage \? errorId : undefined\}/);
  assert.match(component, /className="wp-r-input-error"/);
  assert.match(component, /role="alert"/);
});

test('[interior-sketch-box] optional width and depth keep empty auto mode while still validating typed values', () => {
  assert.match(section, /placeholder="אוטומטי"\s+allowEmpty=\{true\}/);
});

test('[interior-sketch-box] invalid draft commits restore the previous valid box dimension instead of silently clamping the typed draft', () => {
  assert.match(runtime, /isWithinBounds\(parsed, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM\)/);
  assert.doesNotMatch(
    runtime,
    /\? clampSketch\(parsed, SKETCH_BOX_HEIGHT_MIN_CM, SKETCH_BOX_HEIGHT_MAX_CM\)/
  );
  assert.match(runtime, /isWithinBounds\(current, OPTIONAL_DIM_BOUNDS\.min, OPTIONAL_DIM_BOUNDS\.max\)/);
  assert.doesNotMatch(
    runtime,
    /\? clampSketch\(parsed, OPTIONAL_DIM_BOUNDS\.min, OPTIONAL_DIM_BOUNDS\.max\)/
  );
});
