import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');

test('[hinge-hardware-routes] every non-sliding hinged-door renderer is wired to the shared hardware owner', () => {
  const regular = read('esm/native/builder/render_door_ops_hinged.ts');
  const cornerWingFull = read('esm/native/builder/corner_wing_cell_doors_full.ts');
  const cornerWingSplit = read('esm/native/builder/corner_wing_cell_doors_split.ts');
  const cornerWingRendering = read('esm/native/builder/corner_wing_cell_doors_rendering.ts');
  const cornerConnector = read('esm/native/builder/corner_connector_door_emit_visuals.ts');
  const sketchBox = read('esm/native/builder/render_interior_sketch_boxes_fronts_doors.ts');
  const sliding = read('esm/native/builder/render_door_ops_sliding.ts');

  assert.match(regular, /attachHingedDoorHardware\s*\(/u);
  assert.match(cornerWingRendering, /attachHingedDoorHardware\s*\(/u);
  assert.match(cornerWingFull, /appendCornerDoorHingeHardware\s*\(/u);
  assert.match(cornerWingSplit, /appendCornerDoorHingeHardware\s*\(/u);
  assert.match(cornerConnector, /attachHingedDoorHardware\s*\(/u);
  assert.match(sketchBox, /attachHingedDoorHardware\s*\(/u);
  assert.doesNotMatch(sliding, /attachHingedDoorHardware|appendHingedDoorHardware/u);
});

test('[hinge-hardware-routes] segmented drawer rebuild preserves per-door mount face, shared-pivot alignment, and front direction', () => {
  const rebuild = read('esm/native/builder/post_build_sketch_door_cuts_rebuild.ts');
  assert.match(rebuild, /hardwareContext\.carcassMountFaceX/u);
  assert.match(rebuild, /openFrameOffsetX:\s*hardwareContext\.openFrameOffsetX/u);
  assert.match(rebuild, /frontSign:\s*hardwareContext\.frontSign/u);
});
