import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 73 render interior sketch box static contents ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_boxes_contents_parts.ts');
  const apply = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_apply.ts');
  const materials = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_materials.ts');
  const dividers = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_dividers.ts');
  const shelves = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_shelves.ts');
  const barriers = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_barriers.ts');
  const rods = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_rods.ts');
  const types = read('esm/native/builder/render_interior_sketch_boxes_contents_parts_types.ts');
  const contentsOwner = read('esm/native/builder/render_interior_sketch_boxes_contents.ts');

  assert.ok(lineCount(facade) <= 3, 'sketch box static contents public module must stay a tiny facade');
  assert.match(facade, /render_interior_sketch_boxes_contents_parts_apply\.js/);
  assert.match(facade, /render_interior_sketch_boxes_contents_parts_types\.js/);
  assert.doesNotMatch(
    facade,
    /normalizeSketchShelfVariant|resolveSketchBoxDividerPlacement|new THREE\.Mesh|storageBarriers|addShelfPins/,
    'static contents facade must not own divider, shelf, barrier, rod, or material logic'
  );

  assert.match(apply, /export function renderSketchBoxStaticContents\(/);
  assert.match(apply, /renderSketchBoxContentDividers\(args\)/);
  assert.match(apply, /renderSketchBoxContentShelves\(args\)/);
  assert.match(apply, /renderSketchBoxContentStorageBarriers\(args\)/);
  assert.match(apply, /renderSketchBoxContentRods\(args\)/);
  assert.doesNotMatch(apply, /normalizeSketchShelfVariant|new THREE\.Mesh|createBoard\(/);

  assert.match(materials, /export function resolveSketchBoxContentPartMaterial\(/);
  assert.match(materials, /export function resolveSketchBoxShelfMaterial\(/);
  assert.match(materials, /getPartMaterial\(partId\)/);
  assert.match(materials, /getPartColorValue\(partId\)/);
  assert.doesNotMatch(materials, /createBoard\(|new THREE\.Mesh|resolveSketchBoxSegmentForContent/);

  assert.match(dividers, /export function renderSketchBoxContentDividers\(/);
  assert.match(dividers, /resolveSketchBoxDividerPlacement\(/);
  assert.match(dividers, /resolveSketchBoxContentPartMaterial\(/);
  assert.match(dividers, /_divider_/);
  assert.doesNotMatch(dividers, /normalizeSketchShelfVariant|storageBarriers|new THREE\.Mesh/);

  assert.match(shelves, /export function renderSketchBoxContentShelves\(/);
  assert.match(shelves, /normalizeSketchShelfVariant\(shelf\.variant\)/);
  assert.match(shelves, /resolveSketchBoxSegmentForContent\(/);
  assert.match(shelves, /resolveSketchBoxShelfMaterial\(/);
  assert.match(shelves, /addShelfPins\(/);
  assert.doesNotMatch(shelves, /storageBarriers|new THREE\.Mesh\(new THREE\.CylinderGeometry|_divider_/);

  assert.match(barriers, /export function renderSketchBoxContentStorageBarriers\(/);
  assert.match(barriers, /asRecordArray<SketchStorageBarrierExtra>\(box\.storageBarriers\)/);
  assert.match(barriers, /resolveSketchBoxContentPartMaterial\(/);
  assert.match(barriers, /_storage_/);
  assert.doesNotMatch(barriers, /normalizeSketchShelfVariant|addShelfPins|new THREE\.Mesh\(/);

  assert.match(rods, /export function renderSketchBoxContentRods\(/);
  assert.match(rods, /asRecordArray<SketchRodExtra>\(box\.rods\)/);
  assert.match(rods, /new THREE\.CylinderGeometry\(0\.015, 0\.015, rodLen, 12\)/);
  assert.match(rods, /__wpType = 'sketchRod'/);
  assert.doesNotMatch(rods, /createBoard\(|storageBarriers|normalizeSketchShelfVariant/);

  assert.match(types, /export type RenderSketchBoxStaticContentsArgs = RenderSketchBoxContentsArgs/);
  assert.doesNotMatch(types, /export function |createBoard\(|new THREE\.Mesh/);

  assert.match(contentsOwner, /from '\.\/render_interior_sketch_boxes_contents_parts\.js';/);
  assert.doesNotMatch(
    contentsOwner,
    /render_interior_sketch_boxes_contents_parts_(apply|materials|dividers|shelves|barriers|rods|types)\.js/,
    'sketch box contents owner must keep using the public static-contents facade instead of private owners'
  );

  assert.doesNotMatch(
    facade + apply + materials + dividers + shelves + barriers + rods + types,
    /export default\s+/
  );
});
