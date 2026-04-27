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

test('sketch box doors are tracked per segment and door hover resolves the canonical sketch door group', () => {
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  const doorPreview = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  const commit = [
    read('esm/native/services/canvas_picking_sketch_box_content_commit.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts'),
  ].join('\n');
  const toggle = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts'),
  ].join('\n');
  const doorEdit = [
    read('esm/native/services/canvas_picking_door_sketch_box_edit.ts'),
    read('esm/native/services/canvas_picking_door_hinge_groove_click.ts'),
    read('esm/native/services/canvas_picking_door_remove_click.ts'),
  ].join('\n');
  const hoverTargets = read('esm/native/services/canvas_picking_door_hover_targets_hit.ts');

  assert.match(render, /const boxDoors = readSketchBoxDoors\(box\);/);
  assert.match(render, /const doorPid = `\$\{boxPid\}_door_\$\{doorId\}`/);
  assert.match(render, /__wpSketchBoxDoorId: doorId/);
  assert.match(doorPreview, /findSketchBoxDoorForSegment\(/);
  assert.match(doorPreview, /doorId,/);
  assert.match(commit, /upsertSketchBoxDoorForSegment\(/);
  assert.match(commit, /removeSketchBoxDoorForSegment\(/);
  assert.match(toggle, /__wpSketchBoxDoorId/);
  assert.match(doorEdit, /boxRec\.doors/);
  assert.match(hoverTargets, /resolvedGroup = search/);
});
