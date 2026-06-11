import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = rel => fs.readFileSync(path.resolve(rel), 'utf8');

test('free-box sketch doors can follow global open during interior edit modes', () => {
  const shared = read('esm/native/services/doors_runtime_shared.ts');
  const runtimeSupport = read('esm/native/runtime/doors_runtime_support.ts');
  const runtimeModes = read('esm/native/runtime/doors_runtime_support_modes.ts');
  const runtimeEntries = read('esm/native/runtime/doors_runtime_support_entries.ts');
  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
  ].join('\n');
  const visuals = [
    read('esm/native/services/doors_runtime_visuals.ts'),
    read('esm/native/services/doors_runtime_visuals_doors.ts'),
  ].join('\n');

  assert.match(shared, /doors_runtime_support\.js/);
  assert.match(runtimeSupport, /from '\.\/doors_runtime_support_modes\.js';/);
  assert.match(runtimeModes, /export function shouldForceSketchFreeBoxDoorsOpen\(/);
  assert.match(runtimeModes, /function isSketchInternalDrawersToolValue\(/);
  assert.match(runtimeModes, /export function isInteriorDoorEditModeActive\(/);
  assert.match(runtimeModes, /function isSketchDoorAuthoringToolValue\(/);
  assert.match(runtimeModes, /function isInteriorLayoutManualToolValue\(/);
  assert.match(runtimeModes, /tool === 'sketch_box_door'/);
  assert.match(runtimeModes, /tool === 'sketch_box_double_door'/);
  assert.match(runtimeModes, /tool === 'sketch_box_door_hinge'/);
  assert.match(runtimeModes, /if \(isSketchDoorAuthoringToolValue\(manualTool\)\) return false/);
  assert.match(runtimeModes, /getModeConst\('LAYOUT', 'layout'\)/);
  assert.match(runtimeModes, /getModeConst\('MANUAL_LAYOUT', 'manual_layout'\)/);
  assert.match(runtimeModes, /getModeConst\('BRACE_SHELVES', 'brace_shelves'\)/);
  assert.match(runtimeModes, /getModeConst\('EXT_DRAWER', 'ext_drawer'\)/);
  assert.match(runtimeModes, /tool\.startsWith\('sketch_shelf:'\)/);
  assert.match(runtimeModes, /tool === 'sketch_rod'/);
  assert.match(runtimeModes, /tool\.startsWith\('sketch_storage:'\)/);
  assert.match(runtimeModes, /tool\.startsWith\('sketch_int_drawers@'\)/);
  assert.match(runtimeModes, /userData\.__wpSketchBoxDoor === true/);
  assert.match(runtimeModes, /userData\.__wpSketchFreePlacement === true/);

  assert.match(
    motion,
    /const allowSketchFreeBoxOpen =[\s\S]*shouldForceSketchFreeBoxDoorsOpen\([\s\S]*interiorDoorEditActive: frame\.interiorDoorEditActive/
  );
  assert.match(motion, /if \(frame\.globalClickMode && d\.noGlobalOpen\)/);
  assert.match(motion, /allowSketchFreeBoxOpen && frame\.doorsShouldBeOpen \? true : !!d\.isOpen/);

  assert.match(
    visuals,
    /const allowSketchFreeBoxOpen =[\s\S]*shouldForceSketchFreeBoxDoorsOpen\(manualTool, userData, \{[\s\S]*interiorDoorEditActive/
  );
  assert.match(visuals, /if \(noGlobal\)/);
  assert.match(visuals, /allowSketchFreeBoxOpen && isOpen \? true : !!door\.isOpen/);
});
