const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('internal drawer edit sessions suppress all drawer auto-open and keep sketch state mode-gated', () => {
  const shared = read('esm/native/services/doors_runtime_shared.ts');
  const runtimeSupport = read('esm/native/runtime/doors_runtime_support.ts');
  const runtimeModes = read('esm/native/runtime/doors_runtime_support_modes.ts');
  const runtimeEntries = read('esm/native/runtime/doors_runtime_support_entries.ts');
  const visuals = [
    read('esm/native/services/doors_runtime_visuals.ts'),
    read('esm/native/services/doors_runtime_visuals_drawers.ts'),
  ].join('\n');
  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
    read('esm/native/platform/render_loop_motion_drawers.ts'),
    read('esm/native/platform/render_loop_motion_shared.ts'),
  ].join('\n');

  assert.match(shared, /doors_runtime_support\.js/);
  assert.match(runtimeModes, /export function isManualLayoutEditActive\(App: AppLike\): boolean/);
  assert.match(runtimeModes, /export function isSketchIntDrawersEditActive\(App: AppLike\): boolean/);
  assert.match(runtimeModes, /if \(!isManualLayoutEditActive\(App\)\) return false;/);
  assert.match(runtimeModes, /export function isSketchEditActive\(App: AppLike\): boolean/);
  assert.match(runtimeModes, /export function isSketchExtDrawersEditActive\(App: AppLike\): boolean/);

  assert.match(visuals, /const sketchIntDrawersEditActive = isSketchIntDrawersEditActive\(App\);/);
  assert.match(visuals, /if \(sketchIntDrawersEditActive \|\| intDrawerEditActive\) \{/);
  assert.match(
    visuals,
    /if \(\s*!sketchEditActive &&\s*!sketchIntDrawersEditActive &&\s*!intDrawerEditActive &&\s*openId &&\s*drawer\.id === openId\s*\) \{/
  );

  assert.match(motion, /sketchIntDrawersEditActive: boolean;/);
  assert.match(motion, /const sketchIntDrawersEditActive = isSketchIntDrawersEditActive\((?:A|App)\);/);
  assert.match(motion, /if \(frame\.sketchIntDrawersEditActive \|\| frame\.intDrawerEditActive\) \{/);
  assert.match(motion, /frame\.sketchIntDrawersEditActive &&/);
});
