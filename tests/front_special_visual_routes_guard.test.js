import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('corner and sketch external drawer fronts forward glass/mirror state through the canonical door visual seam', () => {
  const corner = read('esm/native/builder/corner_wing_cell_interiors_storage.ts');
  const sketchExternal = read('esm/native/builder/render_interior_sketch_drawers_external.ts');
  const sketchBoxDrawers = read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts');
  const sketchState = read('esm/native/builder/render_interior_sketch_visuals_door_state.ts');

  assert.match(sketchState, /export function resolveSketchFrontVisualState\(/);
  assert.match(sketchState, /return resolveSketchFrontVisualState\(input, partId\);/);

  assert.match(corner, /const curtain =/);
  assert.match(corner, /const special = runtime\.__resolveSpecial\(id, curtain\);/);
  assert.match(corner, /const isGlass = special === 'glass';/);
  assert.match(corner, /isGlass \? 'glass' : runtime\.doorStyle/);
  assert.match(corner, /isGlass \? readCurtainType\(curtain\) : null/);

  assert.match(sketchExternal, /resolveSketchFrontVisualState\(input, partId\)/);
  assert.match(sketchExternal, /frontVisualState\.isGlass \? 'glass' : resolveEffectiveDoorStyle/);
  assert.match(sketchExternal, /frontVisualState\.isMirror/);
  assert.match(sketchExternal, /frontVisualState\.mirrorLayout/);

  assert.match(sketchBoxDrawers, /resolveSketchFrontVisualState\(input, partId\)/);
  assert.match(sketchBoxDrawers, /frontVisualState\.isGlass \? 'glass' : resolveEffectiveDoorStyle/);
  assert.match(sketchBoxDrawers, /frontVisualState\.isMirror/);
  assert.match(sketchBoxDrawers, /frontVisualState\.mirrorLayout/);
});
