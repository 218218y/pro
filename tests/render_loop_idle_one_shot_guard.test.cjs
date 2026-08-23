const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'esm/native/platform/render_loop_impl_runtime.ts'), 'utf8');

function indexOfOrThrow(needle) {
  const index = source.indexOf(needle);
  assert.notEqual(index, -1, `missing render-loop contract: ${needle}`);
  return index;
}

test('render loop keeps plain render wakeups one-shot and continues only for real motion', () => {
  const controlsStateIdx = indexOfOrThrow('let controlsStillMoving = false;');
  const measuredControlsIdx = indexOfOrThrow('controlsStillMoving = __framePerfEnabled');
  const controlsFallbackIdx = indexOfOrThrow(": call0m(c, c['update']) === true;");
  const continuationStateIdx = indexOfOrThrow(
    "const mirrorWorkPending = getRenderSlot(A, '__mirrorWorkPending') === true;"
  );
  const continuationDecisionIdx = indexOfOrThrow('const shouldContinueLoop =');
  const continuationSourcesIdx = indexOfOrThrow(
    'motionFrame.isAnimating || controlsStillMoving || cameraMoveRenderingActive || mirrorWorkPending;'
  );
  const inactiveStopIdx = source.indexOf('if (!shouldContinueLoop) {', continuationSourcesIdx);
  const clearScheduleIdx = source.indexOf('clearLoopSchedule(A);', inactiveStopIdx);
  const inactiveReturnIdx = source.indexOf('return;', clearScheduleIdx);

  assert.ok(
    controlsStateIdx < measuredControlsIdx && measuredControlsIdx < controlsFallbackIdx,
    'controls.update must feed the real-motion state in both measured and ordinary frames'
  );
  assert.ok(
    continuationStateIdx < continuationDecisionIdx &&
      continuationDecisionIdx < continuationSourcesIdx &&
      continuationSourcesIdx < inactiveStopIdx &&
      inactiveStopIdx < clearScheduleIdx &&
      clearScheduleIdx < inactiveReturnIdx,
    'the loop must stop after evaluating only the canonical real-motion continuation sources'
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
  assert.match(
    source,
    /const mirrorWorkPending = getRenderSlot\(A, '__mirrorWorkPending'\) === true;/,
    'deferred mirror work should keep RAF alive until the cube map refreshes'
  );
});
