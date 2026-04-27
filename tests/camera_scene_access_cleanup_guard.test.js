import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readServicesApiPublicSurface } from './_services_api_bundle.js';

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

const cameraAccess = read('esm/native/services/camera_access.ts');
const sceneViewAccess = read('esm/native/services/scene_view_access.ts');
const overlayRaw = [
  read('esm/native/ui/react/overlay_app.tsx'),
  read('esm/native/ui/react/overlay_top_controls.tsx'),
].join('\n');
const sceneRuntimeRaw = read('esm/native/services/scene_runtime.ts');
const projectIoRaw = [
  read('esm/native/io/project_io_orchestrator.ts'),
  read('esm/native/io/project_io_orchestrator_load_ops.ts'),
  read('esm/native/io/project_io_orchestrator_project_load.ts'),
].join('\n');
const servicesApi = readServicesApiPublicSurface(import.meta.url);

const overlay = stripNoise(overlayRaw);
const sceneRuntime = stripNoise(sceneRuntimeRaw);
const projectIo = stripNoise(projectIoRaw);

test('[camera-scene-access] canonical camera/scene access helpers are exported', () => {
  assert.match(cameraAccess, /export function getCameraServiceMaybe\(/);
  assert.match(cameraAccess, /export function ensureCameraService\(/);
  assert.match(cameraAccess, /export function getCameraMoveHandler\(/);
  assert.match(cameraAccess, /export function moveCameraViaService\(/);

  assert.match(sceneViewAccess, /export function getSceneViewServiceMaybe\(/);
  assert.match(sceneViewAccess, /export function ensureSceneViewService\(/);
  assert.match(sceneViewAccess, /export function initSceneLightsViaService\(/);
  assert.match(sceneViewAccess, /export function installSceneViewStoreSyncViaService\(/);
  assert.match(sceneViewAccess, /export function syncSceneViewViaService\(/);
  assert.match(sceneViewAccess, /export function updateSceneLightsViaService\(/);
  assert.match(sceneViewAccess, /export function updateSceneModeViaService\(/);

  assert.match(servicesApi, /moveCameraViaService/);
  assert.match(servicesApi, /updateSceneLightsViaService/);
});

test('[camera-scene-access] UI and runtime callers use canonical camera/scene seams', () => {
  assert.match(overlayRaw, /moveCameraViaService\(app, view\)/);
  assert.match(sceneRuntimeRaw, /initSceneLightsViaService\(App\)/);
  assert.match(sceneRuntimeRaw, /installSceneViewStoreSyncViaService\(App\)/);
  assert.match(sceneRuntimeRaw, /syncSceneViewViaService\(App, opts\)/);
  assert.match(sceneRuntimeRaw, /updateSceneLightsViaService\(App, !!updateShadows\)/);
  assert.match(sceneRuntimeRaw, /updateSceneModeViaService\(App\)/);
  assert.match(projectIoRaw, /updateSceneLightsViaService\(App, true\)/);
});

test('[camera-scene-access] cleaned callers stop probing legacy camera/scene service bags directly', () => {
  assert.doesNotMatch(overlay, /actions\.moveCamera/);
  assert.doesNotMatch(overlay, /services\.camera/);
  assert.doesNotMatch(sceneRuntime, /services\.sceneView/);
  assert.doesNotMatch(projectIo, /services\.sceneView/);
});
