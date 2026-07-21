const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function sketchBoxFrontsBundle() {
  return [
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_support.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_door_contracts.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts'
      ),
      'utf8'
    ),
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts'
      ),
      'utf8'
    ),
    fs.readFileSync(
      path.join(
        __dirname,
        '..',
        'esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts'
      ),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts'),
      'utf8'
    ),
    fs.readFileSync(
      path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts'),
      'utf8'
    ),
  ].join('\n');
}

test('sketch box doors render with front-plane clearance to avoid z-fighting', () => {
  const doorLayout = fs.readFileSync(
    path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts'),
    'utf8'
  );
  const src = [
    fs.readFileSync(path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_ops.ts'), 'utf8'),
    fs.readFileSync(path.join(__dirname, '..', 'esm/native/builder/render_interior_sketch_boxes.ts'), 'utf8'),
    sketchBoxFrontsBundle(),
  ].join('\n');

  assert.match(
    doorLayout,
    /import \{ SKETCH_BOX_DOOR_PREVIEW_POLICY \} from '\.\.\/\.\.\/shared\/dimensions\/sketch_box_preview_policy\.js';/
  );
  assert.doesNotMatch(doorLayout, /SKETCH_BOX_DIMENSIONS/);
  assert.match(
    src,
    /const doorBackClearanceZ = Math\.max\([\s\S]*SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorBackClearanceMinM[\s\S]*SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorBackClearanceMaxM[\s\S]*doorD \* SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorBackClearanceDepthRatio[\s\S]*\);/
  );
  assert.match(
    src,
    /const doorZ = isInsetDoorMount[\s\S]*doorFrontZ - doorD \/ 2 - insetReveal[\s\S]*doorFrontZ \+ doorD \/ 2 \+ doorBackClearanceZ;/
  );
});
