import test from 'node:test';
import assert from 'node:assert/strict';

import { getCameraService } from '../esm/native/services/camera_runtime.ts';
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

test('camera access runtime: a rejected move is reported once and is not retried through the same service', () => {
  const calls: string[] = [];
  const reports: Array<{ error: unknown; context: any }> = [];
  const App: any = {
    services: {
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
      camera: {
        moveTo(view: string) {
          calls.push(view);
          throw new Error('camera move rejected');
        },
      },
    },
  };

  assert.equal(moveCameraViaService(App, 'front'), false);
  assert.deepEqual(calls, ['front']);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].context?.where, 'native/services/camera_access');
  assert.equal(reports[0].context?.op, 'move.invoke');
  assert.equal(reports[0].context?.fatal, false);
});

test('camera runtime: a rejected canonical service read remains fail-soft and publishes a diagnostic', () => {
  const reports: Array<{ error: unknown; context: any }> = [];
  const services = new Proxy(
    {
      errors: {
        report(error: unknown, context: any) {
          reports.push({ error, context });
        },
      },
    } as Record<string, unknown>,
    {
      get(target, key, receiver) {
        if (key === 'camera') throw new Error('camera slot read rejected');
        return Reflect.get(target, key, receiver);
      },
    }
  );
  const App: any = { services };

  assert.equal(getCameraService(App), null);
  assert.equal(reports.length, 1);
  assert.equal(reports[0].context?.where, 'native/services/camera_runtime');
  assert.equal(reports[0].context?.op, 'service.read');
  assert.equal(reports[0].context?.fatal, false);
});
