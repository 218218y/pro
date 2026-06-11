import test from 'node:test';
import assert from 'node:assert/strict';

import { installAutosaveService } from '../esm/native/services/autosave.ts';
import { installCameraService } from '../esm/native/services/camera_runtime.ts';
import { installViewportRuntimeService } from '../esm/native/services/viewport_runtime.ts';

test('camera/autosave/viewport install healing preserves canonical refs and repairs drifted surfaces', () => {
  const cameraApp: any = { services: { camera: {} } };
  const camera = installCameraService(cameraApp) as any;
  const cameraMove = camera.moveTo;
  camera.moveTo = () => 'drifted';
  installCameraService(cameraApp);
  assert.equal(camera.moveTo, cameraMove);
  assert.equal(camera.__wpMoveTo, cameraMove);

  const autosaveApp: any = { services: { autosave: {} } };
  const autosave = installAutosaveService(autosaveApp) as any;
  const schedule = autosave.schedule;
  const flushPending = autosave.flushPending;
  const forceSaveNow = autosave.forceSaveNow;
  autosave.schedule = () => undefined;
  delete autosave.flushPending;
  autosave.forceSaveNow = () => false;
  installAutosaveService(autosaveApp);
  assert.equal(autosave.schedule, schedule);
  assert.equal(autosave.flushPending, flushPending);
  assert.equal(autosave.forceSaveNow, forceSaveNow);
  assert.equal(autosave.__wpSchedule, schedule);
  assert.equal(autosave.__wpFlushPending, flushPending);
  assert.equal(autosave.__wpForceSaveNow, forceSaveNow);

  const viewportApp: any = { services: { viewport: {} } };
  const viewport = installViewportRuntimeService(viewportApp) as any;
  const setOrbitControlsEnabled = viewport.setOrbitControlsEnabled;
  const applySketchMode = viewport.applySketchMode;
  const initializeSceneSync = viewport.initializeSceneSync;
  viewport.setOrbitControlsEnabled = () => false;
  viewport.applySketchMode = () => false;
  delete viewport.initializeSceneSync;
  installViewportRuntimeService(viewportApp);
  assert.equal(viewport.setOrbitControlsEnabled, setOrbitControlsEnabled);
  assert.equal(viewport.applySketchMode, applySketchMode);
  assert.equal(viewport.initializeSceneSync, initializeSceneSync);
  assert.equal(viewport.__wpSetOrbitControlsEnabled, setOrbitControlsEnabled);
  assert.equal(viewport.__wpApplySketchMode, applySketchMode);
  assert.equal(viewport.__wpInitializeSceneSync, initializeSceneSync);
});

test('camera/autosave/viewport install healing adopts pre-existing healthy refs as canonical on first install', () => {
  const moveTo = () => undefined;
  const cameraApp: any = { services: { camera: { moveTo } } };
  const camera = installCameraService(cameraApp) as any;
  assert.equal(camera.moveTo, moveTo);
  assert.equal(camera.__wpMoveTo, moveTo);

  const schedule = () => undefined;
  const flushPending = () => true;
  const forceSaveNow = () => true;
  const autosaveApp: any = {
    services: {
      autosave: { schedule, flushPending, forceSaveNow },
    },
  };
  const autosave = installAutosaveService(autosaveApp) as any;
  assert.equal(autosave.schedule, schedule);
  assert.equal(autosave.flushPending, flushPending);
  assert.equal(autosave.forceSaveNow, forceSaveNow);

  const setOrbitControlsEnabled = () => true;
  const applySketchMode = () => true;
  const initializeSceneSync = () => true;
  const viewportApp: any = {
    services: {
      viewport: { setOrbitControlsEnabled, applySketchMode, initializeSceneSync },
    },
  };
  const viewport = installViewportRuntimeService(viewportApp) as any;
  assert.equal(viewport.setOrbitControlsEnabled, setOrbitControlsEnabled);
  assert.equal(viewport.applySketchMode, applySketchMode);
  assert.equal(viewport.initializeSceneSync, initializeSceneSync);
});
