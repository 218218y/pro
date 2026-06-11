const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('sketch box door pid parsing supports free-box ids (sbf_) with and without module key', () => {
  const doorEdit = fs.readFileSync('esm/native/services/canvas_picking_door_sketch_box_edit.ts', 'utf8');
  const toggleFlow = [
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts', 'utf8'),
  ].join('\n');

  assert.match(doorEdit, /\(sb\(\?:f\)\?_\[a-z0-9\]\+\)/);
  assert.match(doorEdit, /resolveSketchBoxDoorPatchTargets/);
  assert.match(doorEdit, /stackSplitLowerModulesConfiguration/);
  assert.match(doorEdit, /modulesConfiguration/);

  assert.match(toggleFlow, /\(sb\(\?:f\)\?_\[a-z0-9\]\+\)/);
  assert.match(toggleFlow, /resolveSketchBoxPatchTargets/);
  assert.match(toggleFlow, /stackSplitLowerModulesConfiguration/);
  assert.match(toggleFlow, /modulesConfiguration/);
});
