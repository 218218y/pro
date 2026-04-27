const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('local door mode drives internal drawers by shared module ownership and local motion timestamps', () => {
  const shared = read('esm/native/services/doors_runtime_shared.ts');
  const runtimeSupport = read('esm/native/runtime/doors_runtime_support.ts');
  const runtimeModes = read('esm/native/runtime/doors_runtime_support_modes.ts');
  const runtimeEntries = read('esm/native/runtime/doors_runtime_support_entries.ts');
  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
    read('esm/native/platform/render_loop_motion_drawers.ts'),
  ].join('\n');
  const visuals = [
    read('esm/native/services/doors_runtime_visuals.ts'),
    read('esm/native/services/doors_runtime_visuals_doors.ts'),
    read('esm/native/services/doors_runtime_visuals_drawers.ts'),
  ].join('\n');
  const toggleFlow = [
    read('esm/native/services/canvas_picking_toggle_flow.ts'),
    read('esm/native/services/canvas_picking_toggle_flow_shared.ts'),
  ].join('\n');

  assert.match(shared, /doors_runtime_support\.js/);
  assert.match(runtimeEntries, /export function getOpenDoorModuleKeys\(App: AppLike\): Set<string>/);
  assert.match(
    runtimeEntries,
    /export function getDrawerModuleKey\(drawer: DrawerVisualEntryLike \| null \| undefined\): string \| null/
  );
  assert.match(
    runtimeEntries,
    /export function getVisibleOpenInternalDrawerModuleKeys\(App: AppLike\): Set<string>/
  );

  assert.match(
    motion,
    /const localDoorModules = globalClickMode \? new Set<string>\(\) : getOpenDoorModuleKeys\((?:A|App)\);/
  );
  assert.match(
    motion,
    /const visibleOpenInternalDrawerModules = globalClickMode\s*\? new Set<string>\(\)\s*:\s*getVisibleOpenInternalDrawerModuleKeys\((?:A|App)\);/
  );
  assert.match(
    motion,
    /if \(!frame\.globalClickMode && !targetOpen && frame\.timeSinceToggle < frame\.delayTime\) \{/
  );
  assert.match(motion, /const moduleKey = getDrawerModuleKey\(d\);/);
  assert.match(motion, /shouldOpen = !!\(matchesOpenModule && frame\.timeSinceToggle > frame\.delayTime\);/);

  assert.match(
    visuals,
    /const localOpenDoorModules = globalClickMode \? new Set<string>\(\) : getOpenDoorModuleKeys\(App\);/
  );
  assert.match(visuals, /const moduleKey = getDrawerModuleKey\(drawer\);/);
  assert.match(
    visuals,
    /shouldOpen = !!\(!sketchEditActive && matchesOpenModule && timeSinceToggle > delayTime\);/
  );

  assert.match(toggleFlow, /function markLocalDoorMotion\(App: AppContainer\): void \{/);
  assert.match(toggleFlow, /writeDoorsRuntimeNumber\(App, 'lastToggleTime', now\);/);
  assert.match(toggleFlow, /runPlatformActivityRenderTouch\(App, \{/);
  assert.match(toggleFlow, /ensureRenderLoopAfterTrigger: true,/);
  assert.doesNotMatch(toggleFlow, /touchPlatformActivity\(App\);/);
  assert.doesNotMatch(toggleFlow, /ensureRenderLoopViaPlatform\(App\);/);
  assert.doesNotMatch(toggleFlow, /markLocalDoorMotion\(App\);\n      __wp_triggerRender\(App\);/);
});
