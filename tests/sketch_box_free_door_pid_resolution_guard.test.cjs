const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('sketch box door pid parsing supports free-box ids (sbf_) with and without module key', () => {
  const doorEditCore = fs.readFileSync('esm/native/services/canvas_picking_door_sketch_box_edit.ts', 'utf8');
  const doorEditRuntime = fs.readFileSync(
    'esm/native/services/canvas_picking_door_sketch_box_edit_runtime.ts',
    'utf8'
  );
  const targetIdentity = fs.readFileSync(
    'esm/native/services/canvas_picking_sketch_box_target_identity.ts',
    'utf8'
  );
  const doorEdit = `${doorEditCore}\n${doorEditRuntime}`;
  const toggleTarget = fs.readFileSync(
    'esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts',
    'utf8'
  );
  const toggleTargetRuntime = fs.readFileSync(
    'esm/native/services/canvas_picking_toggle_flow_sketch_box_target_runtime.ts',
    'utf8'
  );
  const toggleFlow = [
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts', 'utf8'),
    toggleTarget,
    toggleTargetRuntime,
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts', 'utf8'),
    fs.readFileSync('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts', 'utf8'),
  ].join('\n');

  assert.match(targetIdentity, /\(sb\(\?:f\)\?_\[a-z0-9\]\+\)/);
  assert.match(doorEditCore, /resolveSketchBoxDoorPatchTargets/);
  assert.doesNotMatch(doorEditCore, /stackSplitLowerModulesConfiguration|modulesConfiguration/);
  assert.match(doorEditRuntime, /stackSplitLowerModulesConfiguration/);
  assert.match(doorEditRuntime, /modulesConfiguration/);

  assert.match(toggleTarget, /parseSketchBoxPartTarget/);
  assert.doesNotMatch(toggleTarget, /stackSplitLowerModulesConfiguration|modulesConfiguration|readRootState/);
  assert.match(toggleTargetRuntime, /resolveSketchBoxPatchTargets/);
  assert.match(toggleTargetRuntime, /captureSketchBoxDoorTargetSnapshot/);
  assert.match(toggleTargetRuntime, /resolveSketchBoxDoorPatchTargets/);
});
