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
const tokens = fs.readFileSync('esm/shared/wardrobe_dimension_tokens_shared.ts', 'utf8');

test('[interior-sketch-box] numeric fields expose the same visible validation affordances as structure dims', () => {
  assert.match(component, /aria-invalid=\{validationMessage \? true : undefined\}/);
  assert.match(component, /aria-describedby=\{validationMessage \? errorId : undefined\}/);
  assert.match(component, /className="wp-r-input-error"/);
  assert.match(component, /role="alert"/);
});

test('[interior-sketch-box] optional width and depth keep empty auto mode while still validating typed values', () => {
  assert.match(section, /placeholder="אוטומטי"\s+allowEmpty=\{true\}/);
  assert.match(section, /step=\{5\}/);
  assert.match(section, /emptyStepStartValue=\{DEFAULT_SKETCH_BOX_WIDTH_CM\}/);
  assert.match(section, /emptyStepStartValue=\{DEFAULT_SKETCH_BOX_DEPTH_CM\}/);
  assert.match(section, /resetSketchBoxOptionalDimensionDraft\(props, 'width'\)/);
  assert.match(section, /resetSketchBoxOptionalDimensionDraft\(props, 'depth'\)/);
  assert.match(runtime, /setOptionalDimensionValue\(props, field, ''\);/);
  assert.match(runtime, /field === 'width' \? '' : props\.sketchBoxWidthCm/);
  assert.match(runtime, /field === 'depth' \? '' : props\.sketchBoxDepthCm/);
  assert.doesNotMatch(runtime, /getDefaultOptionalDimensionValue/);
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

test('[interior-sketch-box] reset affordance is an icon-only addon without forcing width/depth defaults into drafts', () => {
  assert.match(component, /wp-r-sketch-box-reset-btn/);
  assert.match(component, /<i className="fas fa-undo-alt" aria-hidden="true" \/>/);
  assert.match(component, /resolveSketchBoxNumericChangeValue\(props, event\)/);
  assert.match(component, /emptyStepStartValue\?: number/);
  assert.match(component, /String\(raw\)\.trim\(\) !== String\(props\.min\)/);
});

test('[sketch-free-box] standalone free box default dimensions are 60cm wide and 55cm deep at the token source', () => {
  assert.match(tokens, /defaultOuterWidthM: 0\.6,/);
  assert.match(tokens, /defaultOuterDepthM: 0\.55,/);
});
