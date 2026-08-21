const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(process.cwd(), rel), 'utf8');
}

test('local door toggle paths stamp door motion and do not rely on one-shot render touches', () => {
  const toggleFlow = read('esm/native/services/canvas_picking_toggle_flow_shared.ts');
  const sketchBoxToggle = read('esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle.ts');
  const sketchBoxToggleRuntime = read(
    'esm/native/services/canvas_picking_toggle_flow_sketch_box_toggle_runtime.ts'
  );
  const motionController = read('esm/native/platform/render_loop_motion.ts');
  const motionDoors = read('esm/native/platform/render_loop_motion_doors.ts');
  const motionDrawers = read('esm/native/platform/render_loop_motion_drawers.ts');

  assert.match(toggleFlow, /export function markLocalDoorMotion\(App: AppContainer\): void \{/);
  assert.match(toggleFlow, /op: 'globalToggle\.cornerPent\.only',[\s\S]*?markLocalDoorMotion\(App\);/);
  assert.match(toggleFlow, /dr\.isOpen = !dr\.isOpen;\n\s*markLocalDoorMotion\(App\);/);

  assert.match(sketchBoxToggle, /markLocalMotion: \(\) => void;/);
  assert.match(sketchBoxToggle, /capabilities\.markLocalMotion\(\);/);
  assert.doesNotMatch(sketchBoxToggle, /markLocalDoorMotion|__wp_triggerRender\(App, true\);/);
  assert.match(
    sketchBoxToggleRuntime,
    /import \{ markLocalDoorMotion \} from '\.\/canvas_picking_toggle_flow_shared\.js';/
  );
  assert.match(sketchBoxToggleRuntime, /markLocalMotion: \(\) => markLocalDoorMotion\(App\),/);
  assert.doesNotMatch(sketchBoxToggleRuntime, /__wp_triggerRender\(App, true\);/);

  assert.match(motionController, /hasActiveDoorMotion/);
  assert.match(motionController, /hasActiveDrawerMotion/);
  assert.match(motionController, /frame\.isAnimating \|\| hasActiveDoorMotion \|\| hasActiveDrawerMotion/);
  assert.match(motionDoors, /return hasActiveDoorMotion;/);
  assert.match(motionDrawers, /return hasActiveDrawerMotion;/);
});
