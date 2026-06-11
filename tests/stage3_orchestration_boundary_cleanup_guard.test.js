import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

test('[stage3-orchestration] render loop owner delegates visual effects to helper factory', () => {
  const owner = read('esm/native/platform/render_loop_impl.ts');
  const runtime = read('esm/native/platform/render_loop_impl_runtime.ts');
  const helper = [
    read('esm/native/platform/render_loop_visual_effects.ts'),
    read('esm/native/platform/render_loop_visual_effects_shared.ts'),
    read('esm/native/platform/render_loop_visual_effects_mirror.ts'),
    read('esm/native/platform/render_loop_visual_effects_floor.ts'),
    read('esm/native/platform/render_loop_visual_effects_front_overlay.ts'),
  ].join('\n');
  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
    read('esm/native/platform/render_loop_motion_drawers.ts'),
  ].join('\n');
  const mirror = read('esm/native/platform/render_loop_mirror_driver.ts');

  assert.match(owner, /createInstalledRenderAnimate/);
  assert.match(runtime, /createRenderLoopVisualEffects/);
  assert.match(runtime, /createRenderLoopMotionController/);
  assert.match(runtime, /createRenderLoopMirrorDriver/);
  assert.match(runtime, /const __visualEffects = createRenderLoopVisualEffects/);
  assert.match(runtime, /const __motion = createRenderLoopMotionController/);
  assert.match(runtime, /const __mirrorDriver = createRenderLoopMirrorDriver/);
  assert.match(helper, /function createRenderLoopVisualEffects/);
  assert.match(helper, /function __wp_updateMirrorMotionState/);
  assert.match(helper, /export function updateRenderLoopMirrorMotionState\(/);
  assert.match(helper, /export function autoHideRenderLoopRoomFloor\(/);
  assert.match(helper, /export function updateRenderLoopFrontOverlaySeamsVisibility\(/);
  assert.match(motion, /export function createRenderLoopMotionController/);
  assert.match(motion, /(?:function updateRenderLoopDoorMotions\(|updateRenderLoopDoorMotions\()/);
  assert.match(motion, /(?:function updateRenderLoopDrawerMotions\(|updateRenderLoopDrawerMotions\()/);
  assert.match(mirror, /export function createRenderLoopMirrorDriver/);
  assert.match(mirror, /function updateMirrorCube/);
});

test('[stage3-orchestration] project io owner delegates UI bridge and runtime flows to helper factories', () => {
  const owner = read('esm/native/io/project_io.ts');
  const bridge = read('esm/native/io/project_io_feedback_bridge.ts');
  const orchestrator = read('esm/native/io/project_io_orchestrator.ts');

  assert.match(owner, /createProjectIoFeedbackBridge/);
  assert.match(owner, /createProjectIoOrchestrator/);
  assert.match(owner, /ensureProjectIoService\(App\)/);

  assert.match(bridge, /function createProjectIoFeedbackBridge/);
  assert.match(orchestrator, /function createProjectIoOrchestrator/);
  assert.match(orchestrator, /function loadProjectData/);
  assert.match(orchestrator, /function exportCurrentProject/);
  assert.match(orchestrator, /function restoreLastSession/);
});
