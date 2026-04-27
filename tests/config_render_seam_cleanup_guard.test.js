import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

function read(rel) {
  return fs.readFileSync(new URL(`../${rel}`, import.meta.url), 'utf8');
}

function stripNoise(input) {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''")
    .replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""')
    .replace(/`[^`\\]*(?:\\.[^`\\]*)*`/g, '``');
}

test('config/render cleanup routes targeted owners through canonical seams', () => {
  const sidebar = read('esm/native/ui/react/sidebar_shared.ts');
  assert.match(sidebar, /readConfigLooseScalarFromApp\(app, 'site2EnabledTabs', null\)/);
  assert.doesNotMatch(stripNoise(sidebar), /app\.config/);

  const motion = [
    read('esm/native/platform/render_loop_motion.ts'),
    read('esm/native/platform/render_loop_motion_frame_state.ts'),
    read('esm/native/platform/render_loop_motion_doors.ts'),
    read('esm/native/platform/render_loop_motion_drawers.ts'),
  ].join('\n');
  assert.match(motion, /readConfigNumberLooseFromApp\((?:A|App), 'DOOR_DELAY_MS', 600\)/);
  assert.match(motion, /readConfigNumberLooseFromApp\((?:A|App), 'ACTIVE_STATE_MS', 4000\)/);
  assert.match(motion, /getRenderSlot<boolean>\((?:A|App), '__wpSketchDbgPrevSketch'\)/);
  assert.match(motion, /setRenderSlot\((?:A|App), '__wpSketchDbgMisalignTs', now\)/);
  assert.doesNotMatch(stripNoise(motion), /app\.config/);
  assert.doesNotMatch(stripNoise(motion), /\bA\.render\b/);

  const cachePruning = [
    read('esm/native/platform/cache_pruning.ts'),
    read('esm/native/platform/cache_pruning_shared.ts'),
    read('esm/native/platform/cache_pruning_runtime.ts'),
  ].join('\n');
  assert.match(cachePruning, /ensureCachePruningSlots\(root\)/);
  assert.match(cachePruning, /readConfigNumberLooseFromApp\(app, sourceKey, Number\.NaN\)/);
  assert.match(cachePruning, /setRenderSlot\(root, 'lastPruneAt', now\)/);
  assert.doesNotMatch(stripNoise(cachePruning), /app\.render\s*=/);
  assert.doesNotMatch(stripNoise(cachePruning), /root\.config/);

  const camera = [
    read('esm/native/services/camera.ts'),
    read('esm/native/services/camera_shared.ts'),
    read('esm/native/services/camera_motion.ts'),
    read('esm/native/services/camera_runtime.ts'),
  ].join('\n');
  assert.match(camera, /from '\.\.\/runtime\/render_access\.js';/);
  assert.match(camera, /const camera = getCamera\(app\);/);
  assert.match(camera, /const controls = getControls\(app\);/);
  assert.match(camera, /ensureServiceSlot<InstallableCameraService>\(app, 'camera'\)/);
  assert.doesNotMatch(stripNoise(camera), /app\.render/);

  const geomPatchContracts = read('esm/native/platform/three_geometry_cache_patch_contracts.ts');
  assert.match(geomPatchContracts, /getDepsNamespaceMaybe<FlagsLike>\(app, 'flags'\)/);
  assert.doesNotMatch(stripNoise(geomPatchContracts), /app\.deps\.flags/);
});
