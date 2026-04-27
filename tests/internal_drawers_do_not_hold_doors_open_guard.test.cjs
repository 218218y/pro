const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('door close delay is gated by open internal drawers, not by mere internal-drawer existence', () => {
  const shared = read('esm/native/services/doors_runtime_shared.ts');
  const runtimeSupport = read('esm/native/runtime/doors_runtime_support.ts');
  const runtimeModes = read('esm/native/runtime/doors_runtime_support_modes.ts');
  const runtimeEntries = read('esm/native/runtime/doors_runtime_support_entries.ts');
  const lifecycle = [
    read('esm/native/services/doors_runtime_lifecycle.ts'),
    read('esm/native/services/doors_runtime_lifecycle_global.ts'),
  ].join('\n');
  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
  ].join('\n');

  assert.match(shared, /doors_runtime_support\.js/);
  assert.match(runtimeSupport, /from '\.\/doors_runtime_support_entries\.js';/);
  assert.match(runtimeEntries, /export function hasOpenInternalDrawers\(App: AppLike\): boolean/);
  assert.match(runtimeEntries, /isDrawerEntryInternal\(App, d\) && isDrawerVisiblyOpen\(d\)/);
  assert.match(lifecycle, /const shouldDelayCloseForInternalDrawers = hasOpenInternalDrawers\(App\);/);
  assert.doesNotMatch(lifecycle, /const hasInternal = hasInternalDrawers\(App\);/);
  assert.match(motion, /const hasOpenInternalDrawersNow = hasOpenInternalDrawers\((?:A|App)\);/);
  assert.match(
    motion,
    /!doorsOpenFlag && hasOpenInternalDrawersNow && !hardCloseActive && runtimeNow < closeDelayUntil/
  );
  assert.match(motion, /else if \(hasOpenInternalDrawersNow && justClosed && !hardCloseActive\)/);
});
