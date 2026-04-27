const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

function sketchBoxFrontsBundle() {
  return [
    read('esm/native/builder/render_interior_sketch_boxes_fronts.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_support.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_contracts.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_layout.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_accents.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_drawers.ts'),
  ].join('\n');
}

test('free box door remove preview sits in front of the outside door face', () => {
  const src = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  assert.match(src, /const doorFrontZ = targetGeo\.centerZ \+ targetGeo\.outerD \/ 2;/);
  assert.match(src, /const renderedDoorCenterZ = doorFrontZ \+ doorDepth \/ 2 \+ doorBackClearanceZ;/);
  assert.match(src, /const renderedDoorFrontZ = renderedDoorCenterZ \+ doorDepth \/ 2;/);
  assert.match(
    src,
    /const previewDoorZ[\s\S]*renderedDoorFrontZ \+ doorDepth \/ 2 \+ Math\.max\(0\.002, safeWoodThick \* 0\.12\)/
  );
  assert.match(src, /z: previewDoorZ,/);
});

test('module box door remove and hinge previews sit in front of the outside door face', () => {
  const src = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  assert.match(src, /const doorFrontZ = targetGeo\.centerZ \+ targetGeo\.outerD \/ 2;/);
  assert.match(src, /const renderedDoorFrontZ = renderedDoorCenterZ \+ doorDepth \/ 2;/);
  assert.match(
    src,
    /const previewDoorZ[\s\S]*contentKind === 'door_hinge'[\s\S]*renderedDoorFrontZ \+ doorDepth \/ 2 \+ Math\.max\(0\.002, safeWoodThick \* 0\.12\)/
  );
  assert.match(src, /z: previewDoorZ,/);
});

test('free box door hinge preview also sits in front of the outside door face', () => {
  const src = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  assert.match(src, /const previewDoorZ[\s\S]*contentKind === 'door_hinge'/);
});

test('sketch box groove render matches the regular flat-door stripe recipe on the outer face', () => {
  const src = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  assert.match(src, /if \(boxDoor\.groove === true\) \{/);
  assert.match(src, /normalizeGrooveLinesCount\(boxDoor\.grooveLinesCount\) \?\?/);
  assert.match(src, /resolveGrooveLinesCount\(App, doorW, undefined, doorPid\);/);
  assert.match(src, /const grooveStripW = 0\.005;/);
  assert.match(src, /const grooveStripH = Math\.max\(0\.01, doorH - 0\.04\);/);
  assert.match(src, /const grooveZ = doorD \/ 2 \+ 0\.001;/);
  assert.match(src, /applySketchBoxPickMeta\(mesh, doorPid, moduleKeyStr, bid, \{ door: true \}\);/);
});
