const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function read(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

test('camera motion explicitly keeps the render loop awake while camera buttons animate', () => {
  const cameraMotion = read('esm/native/services/camera_motion.ts');
  const cameraShared = read('esm/native/services/camera_shared.ts');

  assert.match(cameraShared, /CAMERA_MOVE_RENDERING_UNTIL_SLOT = '__wpCameraMoveRenderingUntilMs'/);
  assert.match(cameraShared, /export function wakeCameraRenderLoop\(App: AppLike\): void \{/);
  assert.match(cameraShared, /triggerRenderViaPlatform\(App, false\)/);
  assert.match(cameraShared, /ensureRenderLoopViaPlatform\(App\)/);

  assert.match(cameraMotion, /const CAMERA_MOVE_DURATION_MS = 800;/);
  assert.match(cameraMotion, /const CAMERA_MOVE_RENDER_SETTLE_MS = 96;/);
  assert.match(cameraMotion, /markCameraMoveRenderingActive\(app, renderUntilMs\);/);
  assert.match(cameraMotion, /wakeCameraRenderLoop\(app\);[\s\S]*if \(progress < 1\) \{/);
  assert.match(cameraMotion, /clearCameraMoveRenderingActive\(app\);\s+wakeCameraRenderLoop\(app\);/);
});
