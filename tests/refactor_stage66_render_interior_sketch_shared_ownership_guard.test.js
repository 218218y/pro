import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 66 render interior sketch shared ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_shared.ts');
  const types = read('esm/native/builder/render_interior_sketch_shared_types.ts');
  const records = read('esm/native/builder/render_interior_sketch_shared_records.ts');
  const numbers = read('esm/native/builder/render_interior_sketch_shared_numbers.ts');
  const externalDrawers = read('esm/native/builder/render_interior_sketch_shared_external_drawers.ts');
  const boxDoors = read('esm/native/builder/render_interior_sketch_shared_box_doors.ts');
  const consumers = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_drawers_external.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_support.ts'),
    read('esm/native/builder/render_interior_sketch_layout_geometry.ts'),
  ].join('\n');

  assert.ok(lineCount(facade) <= 8, 'render interior sketch shared module must stay a tiny public facade');
  for (const owner of [
    'render_interior_sketch_shared_types.js',
    'render_interior_sketch_shared_records.js',
    'render_interior_sketch_shared_numbers.js',
    'render_interior_sketch_shared_external_drawers.js',
    'render_interior_sketch_shared_box_doors.js',
  ]) {
    assert.match(facade, new RegExp(owner.replace(/[.]/g, '\\.')));
  }
  assert.doesNotMatch(
    facade,
    /function readObject|function toFiniteNumber|function applySketchExternalDrawerFaceOverrides|function readSketchBoxDoors|type RenderInteriorSketchInput/,
    'shared facade must not own records, numeric coercion, external-drawer policy, box-door readers, or contracts'
  );

  for (const exportedType of [
    'RenderInteriorSketchInput',
    'RenderInteriorSketchOpsDeps',
    'ApplyInternalSketchDrawersArgs',
    'SketchExternalDrawerFaceVerticalAlignment',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(types, /export function |readRecord|toFiniteNumber|drawer\.faceW/);

  for (const fn of [
    'readObject',
    'asSketchInput',
    'asValueRecord',
    'asRecordArray',
    'asMesh',
    'asMaterial',
    'asGeometry',
    'asDimensionLineFn',
  ]) {
    assert.match(records, new RegExp(`export function ${fn}(?:<[^>]+>)?\\(`));
  }
  assert.match(records, /Reflect\.apply\(value, null/);
  assert.doesNotMatch(records, /drawer\.faceW|function toFiniteNumber|readSketchBoxDoors/);

  for (const fn of ['toFiniteNumber', 'toPositiveNumber', 'toNormalizedUnit']) {
    assert.match(numbers, new RegExp(`export function ${fn}(?:<[^>]+>)?\\(`));
  }
  assert.doesNotMatch(numbers, /readRecord|drawer\.faceW|readSketchBoxDoors|Reflect\.apply/);

  assert.match(externalDrawers, /export function applySketchExternalDrawerFaceOverrides\(/);
  assert.match(externalDrawers, /drawer\.faceW = faceW;/);
  assert.match(externalDrawers, /export function resolveSketchExternalDrawerDoorFaceTopY\(/);
  assert.match(externalDrawers, /export function resolveSketchExternalDrawerFaceVerticalAlignment\(/);
  assert.doesNotMatch(externalDrawers, /readRecord|readSketchBoxDoors|asDimensionLineFn/);

  assert.match(boxDoors, /export function readSketchBoxDoors\(/);
  assert.match(boxDoors, /export function readSketchBoxDoorId\(/);
  assert.doesNotMatch(boxDoors, /drawer\.faceW|toNormalizedUnit|asDimensionLineFn/);

  assert.match(consumers, /from '\.\/render_interior_sketch_shared\.js';/);
  assert.doesNotMatch(
    consumers,
    /render_interior_sketch_shared_(types|records|numbers|external_drawers|box_doors)\.js/,
    'interior sketch consumers must keep using the public shared facade instead of private shared owners'
  );

  assert.doesNotMatch(facade + types + records + numbers + externalDrawers + boxDoors, /export default\s+/);
});
