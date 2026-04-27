import test from 'node:test';
import assert from 'node:assert/strict';
import { bundleSources, readSource } from './_source_bundle.js';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

const bootMain = readSource('../esm/native/ui/boot_main.ts', import.meta.url);
const bootController = bundleSources(
  ['../esm/native/ui/ui_boot_controller_runtime.ts', '../esm/native/ui/ui_boot_controller_viewport.ts'],
  import.meta.url,
  { stripNoise: true }
);
const cameraPresets = readSource('../esm/native/services/camera_presets.ts', import.meta.url);
const servicesApi = readServicesApiPublicSurface(import.meta.url);

test('ui boot and camera presets stay on canonical viewport seams', () => {
  assert.match(bootMain, /from '\.\/ui_boot_controller_runtime\.js'/);
  assert.match(bootMain, /ensureUiBootViewportContext/);
  assert.match(bootMain, /primeUiBootCamera/);

  assert.match(bootController, /createViewportSurface\(/);
  assert.match(bootController, /initializeViewportSceneSyncOrThrow\(App\)/);
  assert.match(bootController, /primeViewportBootCameraOrThrow\(App\)/);
  assert.match(bootController, /resetCameraPreset\(App\)/);
  assert.match(cameraPresets, /getViewportCameraControls\(App\)/);

  assert.doesNotMatch(`${bootMain}\n${bootController}`, /App\.render\.(camera|controls)/);
  assert.doesNotMatch(cameraPresets, /App\?\.render|App\.render/);

  assert.match(servicesApi, /createViewportSurface/);
  assert.match(servicesApi, /setViewportCameraPose/);
  assert.match(servicesApi, /resetCameraPreset/);
  assert.match(servicesApi, /primeViewportBootCamera/);
  assert.match(servicesApi, /primeViewportBootCameraOrThrow/);
  assert.match(servicesApi, /initializeViewportSceneSyncOrThrow/);
});
