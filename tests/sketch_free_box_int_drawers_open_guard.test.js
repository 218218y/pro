import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const read = rel => fs.readFileSync(path.resolve(rel), 'utf8');

test('free-box sketch doors can follow global open only during sketch internal drawers editing', () => {
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
  assert.match(runtimeModes, /tool\.startsWith\('sketch_int_drawers@'\)/);
  assert.match(runtimeModes, /userData\.__wpSketchBoxDoor === true/);
  assert.match(runtimeModes, /userData\.__wpSketchFreePlacement === true/);

  assert.match(
    motion,
    /const allowSketchFreeBoxOpen =[\s\S]*frame\.sketchIntDrawersEditActive[\s\S]*shouldForceSketchFreeBoxDoorsOpen\(/
  );
  assert.match(motion, /if \(frame\.globalClickMode && d\.noGlobalOpen && !allowSketchFreeBoxOpen\)/);

  assert.match(
    visuals,
    /const allowSketchFreeBoxOpen =[\s\S]*sketchIntDrawersEditActive[\s\S]*shouldForceSketchFreeBoxDoorsOpen\(manualTool, userData\);/
  );
  assert.match(visuals, /if \(isOpen && noGlobal && !allowSketchFreeBoxOpen\)/);
});
