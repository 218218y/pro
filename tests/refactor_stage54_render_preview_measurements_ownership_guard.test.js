import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 54 render preview sketch measurements ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_preview_sketch_measurements.ts');
  const apply = read('esm/native/builder/render_preview_sketch_measurements_apply.ts');
  const input = read('esm/native/builder/render_preview_sketch_measurements_input.ts');
  const labels = read('esm/native/builder/render_preview_sketch_measurements_labels.ts');
  const state = read('esm/native/builder/render_preview_sketch_measurements_state.ts');
  const types = read('esm/native/builder/render_preview_sketch_measurements_types.ts');
  const pipeline = read('esm/native/builder/render_preview_sketch_pipeline.ts');
  const ops = [
    read('esm/native/builder/render_preview_sketch_ops_state.ts'),
    read('esm/native/builder/render_preview_sketch_ops_apply.ts'),
  ].join('\n');
  const runtimeTest = read('tests/render_preview_sketch_measurements_runtime.test.ts');

  assert.ok(
    lineCount(facade) <= 10,
    'render_preview_sketch_measurements.ts must stay a tiny public facade instead of regrowing measurement internals'
  );
  for (const owner of [
    'render_preview_sketch_measurements_apply.js',
    'render_preview_sketch_measurements_state.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')), `facade must compose ${owner}`);
  }
  assert.doesNotMatch(
    facade,
    /BufferGeometry|LineBasicMaterial|MeshBasicMaterial|getDimLabelEntry|clearanceMeasurements|setFromPoints/,
    'facade must not own THREE/material/input/geometry measurement internals'
  );

  assert.match(apply, /export function applySketchPlacementMeasurements\(/);
  assert.match(apply, /readMeasurementEntries\(input\)/);
  assert.match(apply, /ensureMeasurementGroup\(g, THREE, shared\)/);
  assert.match(apply, /getDimLabelEntry\(label, \{ App \}, styleKey\)/);
  assert.match(apply, /orientMeasurementLabelForFace\(slot\.label, labelFaceSign\)/);
  assert.doesNotMatch(apply, /new THREE\.(Group|LineBasicMaterial|MeshBasicMaterial|PlaneGeometry)\(/);

  assert.match(input, /export function readMeasurementEntries\(/);
  assert.match(input, /export function readFinite\(/);
  assert.match(input, /export function resolveMeasurementLabelFaceSign\(/);
  assert.doesNotMatch(input, /THREE|MeshBasicMaterial|getDimLabelEntry/);

  assert.match(labels, /export function ensureMeasurementLabelMaterial\(/);
  assert.match(labels, /export function orientMeasurementLabelForFace\(/);
  assert.match(labels, /new THREE\.MeshBasicMaterial\(/);
  assert.doesNotMatch(labels, /getDimLabelEntry|clearanceMeasurements|setFromPoints/);

  assert.match(state, /export function asMeasurementTHREE\(/);
  assert.match(state, /export function hideSketchPlacementMeasurements\(/);
  assert.match(state, /export function ensureMeasurementGroup\(/);
  assert.match(state, /export function ensureMeasurementSlot\(/);
  assert.match(state, /new THREE\.Group\(/);
  assert.match(state, /new THREE\.LineBasicMaterial\(/);
  assert.doesNotMatch(state, /getDimLabelEntry|resolveMeasurementLabelFaceSign/);

  for (const exportedType of [
    'MeasurementEntryLike',
    'RotatablePreviewMeshLike',
    'MeasurementUserData',
    'MeasurementSlot',
    'MeasurementTHREESurface',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`), `types owner must expose ${exportedType}`);
  }
  assert.doesNotMatch(types, /function |new THREE|getDimLabelEntry|clearanceMeasurements/);

  for (const consumer of [pipeline, ops, runtimeTest]) {
    assert.match(consumer, /render_preview_sketch_measurements/);
    assert.doesNotMatch(
      consumer,
      /render_preview_sketch_measurements_(apply|input|labels|state|types)/,
      'render preview consumers and runtime tests must exercise the public measurement facade'
    );
  }

  assert.doesNotMatch(facade + apply + input + labels + state + types, /export default\s+/);
});
