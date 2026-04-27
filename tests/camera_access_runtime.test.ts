import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureCameraService,
  getCameraMoveHandler,
  getCameraServiceMaybe,
  moveCameraViaService,
} from '../esm/native/services/camera_access.ts';
import {
  getServiceInstallStateMaybe,
  isCameraInstalled,
} from '../esm/native/runtime/install_state_access.ts';

test('camera access runtime: stable service slot + bound move handler', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      camera: {
        moveTo(view: string) {
          calls.push(view);
        },
      },
    },
  };

  const svc = getCameraServiceMaybe(App);
  assert.ok(svc);
  assert.equal(ensureCameraService(App), svc);

  const move = getCameraMoveHandler(App);
  assert.equal(typeof move, 'function');

  move?.('front');
  assert.deepEqual(calls, ['front']);

  assert.equal(moveCameraViaService(App, 'left'), true);
  assert.deepEqual(calls, ['front', 'left']);
});

test('camera access runtime: ensure installs canonical camera service seam', () => {
  const App: any = {};
  const svc = ensureCameraService(App);

  assert.equal(getCameraServiceMaybe(App), svc);
  assert.equal(isCameraInstalled(App), true);
  assert.equal(getServiceInstallStateMaybe(App)?.cameraInstalled, true);
  assert.equal(typeof svc.moveTo, 'function');
  assert.equal(Object.getPrototypeOf(svc), null);
});

test('camera access runtime: getCameraMoveHandler heals drifted moveTo back to the canonical service seam', () => {
  const calls: string[] = [];
  const App: any = {
    services: {
      camera: {
        moveTo(view: string) {
          calls.push(`canonical:${view}`);
        },
      },
    },
  };

  const svc = ensureCameraService(App);
  const canonicalMove = svc.moveTo;
  assert.equal(typeof canonicalMove, 'function');

  svc.moveTo = (view: string) => {
    calls.push(`drift:${view}`);
  };

  const healedMove = getCameraMoveHandler(App);
  assert.equal(typeof healedMove, 'function');
  assert.equal(svc.moveTo, canonicalMove);

  healedMove?.('front');
  assert.deepEqual(calls, ['canonical:front']);
});
