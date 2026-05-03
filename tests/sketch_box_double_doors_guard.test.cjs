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

test('sketch box UI exposes a dedicated double-door mode under the single-door action', () => {
  const helpers = [
    read('esm/native/ui/react/tabs/interior_tab_helpers.tsx'),
    read('esm/native/ui/react/tabs/interior_tab_helpers_sketch_tools.ts'),
  ].join('\n');
  const sections = [
    read('esm/native/ui/react/tabs/interior_tab_sections.tsx'),
    read('esm/native/ui/react/tabs/interior_layout_sketch_box_controls_section.tsx'),
  ].join('\n');

  assert.match(helpers, /SKETCH_TOOL_BOX_DOUBLE_DOOR = 'sketch_box_double_door'/);
  assert.match(sections, /2 דלתות לקופסא/);
  assert.match(sections, /props\.manualToolRaw === SKETCH_TOOL_BOX_DOUBLE_DOOR/);
});

test('sketch box door helpers can upsert and remove a centered double-door pair per segment', () => {
  const dividers = read('esm/native/services/canvas_picking_sketch_box_dividers.ts');
  const doorOwner = read('esm/native/services/canvas_picking_sketch_box_doors.ts');
  const doorMutation = read('esm/native/services/canvas_picking_sketch_box_doors_mutation.ts');

  assert.match(dividers, /from '\.\/canvas_picking_sketch_box_doors\.js';/);
  assert.match(doorOwner, /hasSketchBoxDoubleDoorPairForSegment/);
  assert.match(doorOwner, /upsertSketchBoxDoubleDoorPairForSegment/);
  assert.match(doorOwner, /removeSketchBoxDoubleDoorPairForSegment/);
  assert.match(doorOwner, /canvas_picking_sketch_box_doors_mutation\.js/);
  assert.match(doorMutation, /hinge: 'left'/);
  assert.match(doorMutation, /hinge: 'right'/);
});

test('sketch box hover\/click flows route the new double-door tool for both module and free boxes', () => {
  const previewOwner = read('esm/native/services/canvas_picking_sketch_box_door_preview.ts');
  const commit = [
    read('esm/native/services/canvas_picking_sketch_box_content_commit.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_doors.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_shared.ts'),
    read('esm/native/services/canvas_picking_sketch_box_content_commit_boxes.ts'),
  ].join('\n');
  const freeCommit = read('esm/native/services/canvas_picking_sketch_free_commit.ts');

  assert.match(previewOwner, /type SketchBoxDoorPreviewKind = 'door' \| 'double_door' \| 'door_hinge';/);
  assert.match(previewOwner, /contentKind === 'double_door'/);
  assert.match(commit, /manualSketchBoxDoubleDoor/);
  assert.match(commit, /upsertSketchBoxDoubleDoorPairForSegment\(/);
  assert.match(freeCommit, /commitSketchModuleBoxContent\(/);
});

test('sketch box renderer splits a segment into mirrored leaves with a tighter center reveal and shared box toggles', () => {
  const render = [
    read('esm/native/builder/render_interior_sketch_ops.ts'),
    read('esm/native/builder/render_interior_sketch_boxes.ts'),
    sketchBoxFrontsBundle(),
  ].join('\n');
  const toggle = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_target.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_runtime.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts'),
  ].join('\n');

  assert.match(render, /const boxDoorPlacements = readSketchBoxDoorPlacements\(\{/);
  assert.match(render, /const isCenterDoubleDoorPair =/);
  assert.match(
    render,
    /segmentDoors\.some\((?:placement|segmentPlacement) => (?:placement|segmentPlacement)\?\.door\?\.hinge === 'left'\)/
  );
  assert.match(
    render,
    /segmentDoors\.some\((?:placement|segmentPlacement) => (?:placement|segmentPlacement)\?\.door\?\.hinge === 'right'\)/
  );
  assert.match(
    render,
    /const centerGap = isCenterDoubleDoorPair[\s\S]*Math\.max\(0\.0008, Math\.min\(0\.0018/
  );
  assert.match(render, /const pairOuterInset = isCenterDoubleDoorPair/);
  assert.match(render, /const pivotX = hingeLeft \? doorFaceLeft : doorFaceRight;/);
  assert.match(toggle, /function applySketchBoxDoorRuntimeStateForBox\(/);
  assert.match(
    toggle,
    /const enabledDoors: Array<\{ index: number; door: UnknownRecord; doorId: string \}> = \[\];/
  );
  assert.match(toggle, /nextOpen = !enabledDoors\.some\(entry => entry\.door\.open === true\);/);
});
