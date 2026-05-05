const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'esm/native/platform/render_loop_impl_runtime.ts'), 'utf8');

test('render loop keeps plain render wakeups one-shot and continues only for real motion', () => {
  assert.match(
    source,
    /let controlsStillMoving = false;[\s\S]*controlsStillMoving = call0m\(c, c\['update'\]\) === true;/
  );
  assert.match(
    source,
    /const shouldContinueLoop = motionFrame\.isAnimating \|\| controlsStillMoving \|\| cameraMoveRenderingActive;[\s\S]*if \(!shouldContinueLoop\) \{[\s\S]*clearLoopSchedule\(A\);[\s\S]*return;[\s\S]*\}/
  );
  assert.doesNotMatch(
    source,
    /const shouldContinueLoop = motionFrame\.isActiveState/,
    'active-state wakeups must not keep RAF alive by themselves'
  );
  assert.match(
    source,
    /const cameraMoveActiveUntil = Number\(getRenderSlot\(A, '__wpCameraMoveRenderingUntilMs'\)\) \|\| 0;/,
    'camera service motion should be a real render-loop continuation source'
  );
});
