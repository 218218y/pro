import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyViewportSketchMode,
  initializeViewportSceneSyncOrThrow,
  primeViewportBootCamera,
  primeViewportBootCameraOrThrow,
  setOrbitControlsEnabled,
} from '../esm/native/services/viewport_runtime.ts';

test('viewport_runtime toggles orbit controls through the canonical helper', () => {
  const App: any = { render: { controls: { enabled: true } } };
  assert.equal(setOrbitControlsEnabled(App, false), true);
  assert.equal(App.render.controls.enabled, false);
  assert.equal(setOrbitControlsEnabled(App, true), true);
  assert.equal(App.render.controls.enabled, true);
});

test('viewport_runtime writes sketchMode, syncs scene view and rebuilds through one seam', () => {
  const calls: string[] = [];
  const App: any = {
    store: {
      getState: () => ({ runtime: { sketchMode: false } }),
      patch: (patch: any) => {
        App.__runtime = { ...(App.__runtime || {}), ...(patch.runtime || {}) };
      },
    },
    __runtime: { sketchMode: false },
    actions: {
      runtime: {
        patch: (patch: any) => {
          App.__runtime = { ...(App.__runtime || {}), ...(patch || {}) };
        },
      },
    },
    services: {
      sceneView: {
        syncFromStore: (opts: any) => calls.push(`sync:${opts.reason}:${String(!!opts.force)}`),
      },
      builder: {
        buildWardrobe: () => calls.push('build'),
      },
    },
  };
  App.store.getState = () => ({ runtime: { ...App.__runtime } });

  const changed = applyViewportSketchMode(App, true, {
    source: 'test',
    rebuild: true,
    updateShadows: false,
    reason: 'unit-test',
  });

  assert.equal(changed, true);
  assert.equal(App.__runtime.sketchMode, true);
  assert.deepEqual(calls, ['sync:unit-test:false', 'build']);
});

test('viewport_runtime primes the canonical default camera preset through the service seam', () => {
  const App: any = {
    render: {
      camera: { position: { set() {} } },
      controls: { target: { set() {} }, update() {}, enabled: true },
    },
  };

  assert.equal(primeViewportBootCamera(App), true);
  assert.doesNotThrow(() => primeViewportBootCameraOrThrow(App));
});

test('viewport_runtime strict boot helpers throw when canonical seams are missing', () => {
  assert.throws(() => primeViewportBootCameraOrThrow({}), /canonical default viewport boot camera preset/i);
  assert.throws(
    () =>
      initializeViewportSceneSyncOrThrow({
        services: {
          sceneView: {
            initLights() {},
            installStoreSync() {
              return false;
            },
            syncFromStore() {
              throw new Error('sync exploded');
            },
          },
        },
      }),
    /scene sync failed during initialization/i
  );
});
