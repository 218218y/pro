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
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_materials.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_routes.ts'),
    read('esm/native/builder/render_interior_sketch_boxes_fronts_door_visual_core.ts'),
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
    /const previewDoorZ[\s\S]*renderedDoorFrontZ[\s\S]*doorDepth \/ 2[\s\S]*Math\.max\(\s*SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorRemoveOffsetMinM,\s*safeWoodThick \* SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorRemoveOffsetWoodRatio\s*\)/
  );
  assert.match(src, /z: previewDoorZ,/);
});

test('module box door remove and hinge previews sit in front of the outside door face', () => {
  const src = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  assert.match(src, /const doorFrontZ = targetGeo\.centerZ \+ targetGeo\.outerD \/ 2;/);
  assert.match(src, /const renderedDoorFrontZ = renderedDoorCenterZ \+ doorDepth \/ 2;/);
  assert.match(
    src,
    /const previewDoorZ[\s\S]*contentKind === 'door_hinge'[\s\S]*renderedDoorFrontZ[\s\S]*doorDepth \/ 2[\s\S]*Math\.max\(\s*SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorRemoveOffsetMinM,\s*safeWoodThick \* SKETCH_BOX_DOOR_PREVIEW_POLICY\.doorRemoveOffsetWoodRatio\s*\)/
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
  assert.match(src, /if \(groovesEnabled && boxDoor\.groove === true\) \{/);
  assert.match(src, /normalizeGrooveLinesCount\(boxDoor\.grooveLinesCount\) \?\?/);
  assert.match(src, /resolveGrooveLinesCount\(App, doorW, undefined, doorPid\);/);
  assert.match(src, /const grooveStripW = classicDims\.grooveStripWidthM;/);
  assert.match(
    src,
    /const grooveStripH = Math\.max\(classicDims\.grooveHeightMinM, doorH - classicDims\.grooveHeightClearanceM\);/
  );
  assert.match(src, /const grooveZ = doorD \/ 2 \+ classicDims\.grooveSurfaceOffsetM;/);
  assert.match(src, /applySketchBoxPickMeta\(mesh, doorPid, moduleKeyStr, bid, \{ door: true \}\);/);
});
