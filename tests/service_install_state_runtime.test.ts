import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureServiceInstallState,
  getServiceInstallStateMaybe,
  isAppStartInstalled,
  isAppStartStarted,
  isAutosaveInstalled,
  isBootInstalled,
  isBrowserUiOpsInstalled,
  isCameraInstalled,
  isConfigCompoundsInstalled,
  isErrorsInstalled,
  isLifecycleVisibilityInstalled,
  isPlatformInstalled,
  isUiBootMainInstalled,
  isSmokeChecksInstalled,
  isViewportInstalled,
  markAppStartInstalled,
  markAutosaveInstalled,
  markBootInstalled,
  markBrowserUiOpsInstalled,
  markCameraInstalled,
  markConfigCompoundsInstalled,
  markErrorsInstalled,
  markLifecycleVisibilityInstalled,
  markPlatformInstalled,
  markUiBootMainInstalled,
  markSmokeChecksInstalled,
  markViewportInstalled,
  setAppStartStarted,
} from '../esm/native/runtime/install_state_access.ts';
import { installAutosaveService } from '../esm/native/services/autosave.ts';
import { installCameraService } from '../esm/native/services/camera.ts';
import { installConfigCompoundsService } from '../esm/native/services/config_compounds.ts';
import { installViewportRuntimeService } from '../esm/native/services/viewport_runtime.ts';

test('service install state runtime: canonical slot is null-prototype and stores flags centrally', () => {
  const App: any = {};

  const state = ensureServiceInstallState(App);
  assert.equal(App.services.serviceInstallState, state);
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(Object.getPrototypeOf(state), null);

  markAppStartInstalled(App);
  setAppStartStarted(App, true);
  markCameraInstalled(App);
  markAutosaveInstalled(App);
  markViewportInstalled(App);
  markConfigCompoundsInstalled(App);
  markErrorsInstalled(App);
  markUiBootMainInstalled(App);
  markBootInstalled(App);
  markPlatformInstalled(App);
  markSmokeChecksInstalled(App);
  markBrowserUiOpsInstalled(App);
  markLifecycleVisibilityInstalled(App);

  assert.equal(isAppStartInstalled(App), true);
  assert.equal(isAppStartStarted(App), true);
  assert.equal(isCameraInstalled(App), true);
  assert.equal(isAutosaveInstalled(App), true);
  assert.equal(isViewportInstalled(App), true);
  assert.equal(isConfigCompoundsInstalled(App), true);
  assert.equal(isErrorsInstalled(App), true);
  assert.equal(isUiBootMainInstalled(App), true);
  assert.equal(isBootInstalled(App), true);
  assert.equal(isPlatformInstalled(App), true);
  assert.equal(isSmokeChecksInstalled(App), true);
  assert.equal(isBrowserUiOpsInstalled(App), true);
  assert.equal(isLifecycleVisibilityInstalled(App), true);

  assert.equal(getServiceInstallStateMaybe(App)?.appStartInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.appStartStarted, true);
  assert.equal(getServiceInstallStateMaybe(App)?.cameraInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.autosaveInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.viewportInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.configCompoundsInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.errorsInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.uiBootMainInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.bootInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.platformInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.smokeChecksInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.browserUiOpsInstalled, true);
  assert.equal(getServiceInstallStateMaybe(App)?.lifecycleVisibilityInstalled, true);
});

function createRuntimeInstallApp() {
  return {
    services: Object.create(null),
    actions: {
      ui: { setScalarSoft() {} },
      runtime: { patch() {} },
    },
    store: {
      getState: () => ({
        ui: {},
        runtime: { sketchMode: false },
        mode: {},
        meta: {},
        config: {
          modulesConfiguration: [{}],
          cornerConfiguration: {},
        },
      }),
    },
    state: { get: () => ({}) },
    render: {
      controls: { enabled: true, target: { x: 0, y: 0, z: 0 }, update() {} },
    },
    platform: {},
    deps: {
      browser: {
        window: {
          setTimeout(fn: () => void) {
            fn();
            return 1;
          },
          clearTimeout() {},
        },
      },
    },
  } as any;
}

test('service install state runtime: representative service installers keep install markers centralized', async () => {
  const App = createRuntimeInstallApp();

  const autosave = installAutosaveService(App);
  const camera = installCameraService(App);
  const viewport = installViewportRuntimeService(App);
  const configCompounds = installConfigCompoundsService(App, { maxAttempts: 1, retryDelayMs: 0 });
  await Promise.resolve(configCompounds);

  const state = getServiceInstallStateMaybe(App);
  assert.equal(state?.autosaveInstalled, true);
  assert.equal(state?.cameraInstalled, true);
  assert.equal(state?.viewportInstalled, true);
  assert.equal(state?.configCompoundsInstalled, true);

  assert.equal('__installed' in autosave, false);
  assert.equal('__started' in autosave, false);
  assert.equal('__installed' in camera, false);
  assert.equal('__installed' in viewport, false);
  assert.equal('__installed' in configCompounds, false);
  assert.equal('__wpUiOpsInstalledV1' in App, false);
});
