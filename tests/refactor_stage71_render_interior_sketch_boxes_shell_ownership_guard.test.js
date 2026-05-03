import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function lineCount(source) {
  return source.split(/\r\n|\r|\n/).length;
}

test('stage 71 render interior sketch box shell ownership split is anchored', () => {
  const facade = read('esm/native/builder/render_interior_sketch_boxes_shell.ts');
  const apply = read('esm/native/builder/render_interior_sketch_boxes_shell_apply.ts');
  const height = read('esm/native/builder/render_interior_sketch_boxes_shell_height.ts');
  const geometry = read('esm/native/builder/render_interior_sketch_boxes_shell_geometry.ts');
  const materials = read('esm/native/builder/render_interior_sketch_boxes_shell_materials.ts');
  const frame = read('esm/native/builder/render_interior_sketch_boxes_shell_frame.ts');
  const types = read('esm/native/builder/render_interior_sketch_boxes_shell_types.ts');
  const boxesOwner = read('esm/native/builder/render_interior_sketch_boxes.ts');

  assert.ok(lineCount(facade) <= 2, 'sketch box shell public module must stay a tiny facade');
  assert.match(facade, /render_interior_sketch_boxes_shell_apply\.js/);
  assert.doesNotMatch(
    facade,
    /resolveSketchBoxHeight|resolveSketchBoxShellGeometry|resolveSketchBoxShellMaterial|renderSketchBoxShellFrame|createBoard\(/,
    'sketch box shell facade must not own sizing, geometry, materials, board creation, or dimension rendering'
  );

  assert.match(apply, /export function renderSketchBoxShell\(/);
  assert.match(apply, /resolveSketchBoxHeight\(/);
  assert.match(apply, /resolveSketchBoxShellGeometry\(/);
  assert.match(apply, /resolveSketchBoxShellMaterial\(/);
  assert.match(apply, /renderSketchBoxShellFrame\(\{ state, renderArgs \}\)/);
  assert.match(apply, /const state: ResolvedSketchBoxState = \{/);
  assert.doesNotMatch(
    apply,
    /createBoard\(|renderSketchFreeBoxDimensions|resolveSketchBoxGeometry\(|resolveSketchFreeBoxGeometry\(/
  );

  assert.match(height, /export function resolveSketchBoxHeight\(/);
  assert.match(height, /height < args\.woodThick \* 2 \+ 0\.02/);
  assert.match(height, /!args\.isFreePlacement && height > args\.spanH/);
  assert.doesNotMatch(height, /createBoard|resolveSketchBoxGeometry|renderSketchFreeBoxDimensions/);

  assert.match(geometry, /export function resolveSketchBoxShellGeometry\(/);
  assert.match(geometry, /clampSketchFreeBoxCenterY\(/);
  assert.match(geometry, /resolveSketchFreeBoxGeometry\(/);
  assert.match(geometry, /resolveSketchBoxGeometry\(/);
  assert.match(geometry, /absEntry: \{/);
  assert.doesNotMatch(geometry, /createBoard|renderSketchBoxCarcassAdornment|renderSketchFreeBoxDimensions/);

  assert.match(materials, /export function resolveSketchBoxShellMaterial\(/);
  assert.match(materials, /getPartMaterial\(boxPid\)/);
  assert.match(materials, /catch \{/);
  assert.doesNotMatch(materials, /createBoard|resolveSketchBoxGeometry|renderSketchFreeBoxDimensions/);

  assert.match(frame, /export function renderSketchBoxShellFrame\(/);
  assert.match(frame, /createBoard\(/);
  assert.match(frame, /applySketchBoxPickMeta\(boxTopMesh, boxPid, moduleKeyStr, boxId\)/);
  assert.match(frame, /renderSketchBoxCarcassAdornment\(/);
  assert.match(frame, /freeBoxDimensionEntries\.push\(/);
  assert.match(frame, /renderSketchFreeBoxDimensions\(/);
  assert.doesNotMatch(
    frame,
    /resolveSketchBoxHeight|resolveSketchBoxShellGeometry|resolveSketchBoxShellMaterial/
  );

  for (const exportedType of [
    'ResolveSketchBoxHeightArgs',
    'ResolveSketchBoxShellGeometryArgs',
    'ResolvedSketchBoxShellGeometry',
    'ResolveSketchBoxMaterialArgs',
  ]) {
    assert.match(types, new RegExp(`export type ${exportedType}`));
  }
  assert.doesNotMatch(
    types,
    /export function |createBoard|resolveSketchBoxGeometry|renderSketchFreeBoxDimensions/
  );

  assert.match(boxesOwner, /from '\.\/render_interior_sketch_boxes_shell\.js';/);
  assert.doesNotMatch(
    boxesOwner,
    /render_interior_sketch_boxes_shell_(apply|height|geometry|materials|frame|types)\.js/,
    'sketch boxes owner must keep using the public shell facade instead of private shell owners'
  );

  assert.doesNotMatch(facade + apply + height + geometry + materials + frame + types, /export default\s+/);
});
