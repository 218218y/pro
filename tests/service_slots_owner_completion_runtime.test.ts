import test from 'node:test';
import assert from 'node:assert/strict';

import { installViewportRuntimeService } from '../esm/native/services/viewport_runtime.ts';
import { installSceneViewService } from '../esm/native/services/scene_view.ts';
import { ensureModelsService } from '../esm/native/runtime/models_access.ts';
import {
  getServiceInstallStateMaybe,
  isViewportInstalled,
} from '../esm/native/runtime/install_state_access.ts';

test('viewport runtime install reuses an existing canonical slot object', () => {
  const existingSlot = Object.assign(Object.create(null), { keep: 'viewport' });
  const App: any = {
    services: Object.assign(Object.create(null), { viewport: existingSlot }),
    store: { getState: () => ({ runtime: { sketchMode: false } }) },
    actions: { runtime: { patch() {} } },
    render: { controls: { enabled: true, target: {}, update() {} } },
    platform: {},
  };

  const service = installViewportRuntimeService(App);

  assert.equal(service, existingSlot);
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(service.keep, 'viewport');
  assert.equal(isViewportInstalled(App), true);
  assert.equal(getServiceInstallStateMaybe(App)?.viewportInstalled, true);
  assert.equal(typeof service.setOrbitControlsEnabled, 'function');
  assert.equal(typeof service.applySketchMode, 'function');
  assert.equal(typeof service.initializeSceneSync, 'function');
});

test('viewport runtime install keeps method refs stable across repeated installs and heals partial surfaces', () => {
  const existingSlot = Object.assign(Object.create(null), { keep: 'viewport' });
  const App: any = {
    services: Object.assign(Object.create(null), { viewport: existingSlot }),
    store: { getState: () => ({ runtime: { sketchMode: false } }) },
    actions: { runtime: { patch() {} } },
    render: { controls: { enabled: true, target: {}, update() {} } },
    platform: {},
  };

  const serviceAfterFirstInstall = installViewportRuntimeService(App);
  const setOrbitControlsEnabledRef = serviceAfterFirstInstall.setOrbitControlsEnabled;
  const applySketchModeRef = serviceAfterFirstInstall.applySketchMode;

  delete serviceAfterFirstInstall.initializeSceneSync;

  const serviceAfterSecondInstall = installViewportRuntimeService(App);

  assert.equal(serviceAfterSecondInstall, existingSlot);
  assert.equal(serviceAfterSecondInstall.setOrbitControlsEnabled, setOrbitControlsEnabledRef);
  assert.equal(serviceAfterSecondInstall.applySketchMode, applySketchModeRef);
  assert.equal(typeof serviceAfterSecondInstall.initializeSceneSync, 'function');
  assert.equal(isViewportInstalled(App), true);
});

test('scene view install reuses an existing canonical slot object and fills missing methods', () => {
  const existingSlot = Object.assign(Object.create(null), { keep: 'sceneView' });
  const App: any = {
    services: Object.assign(Object.create(null), { sceneView: existingSlot }),
    store: {
      getState: () => ({ ui: {}, runtime: {}, config: {}, mode: {}, meta: {} }),
      subscribeSelector: () => () => {},
    },
    render: {},
    platform: {},
  };

  const service = installSceneViewService(App);

  assert.equal(service, existingSlot);
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(service.keep, 'sceneView');
  assert.equal(typeof service.syncFromStore, 'function');
  assert.equal(typeof service.scheduleSyncFromStore, 'function');
  assert.equal(typeof service.installStoreSync, 'function');
  assert.equal(typeof service.disposeStoreSync, 'function');
});

test('models access creates canonical null-prototype services root and slot on demand', () => {
  const App: any = {};

  const service = ensureModelsService(App);

  assert.equal(App.services.models, service);
  assert.equal(Object.getPrototypeOf(App.services), null);
  assert.equal(Object.getPrototypeOf(service), null);
  assert.equal(typeof service.ensureLoaded, 'function');
  assert.equal(typeof service.exportUserModels, 'function');
  assert.equal(service.__modelsAccessNormalized, true);
});
