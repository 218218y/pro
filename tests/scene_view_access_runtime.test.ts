import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureSceneViewService,
  getSceneViewServiceMaybe,
  initSceneLightsViaService,
  updateSceneLightsViaService,
  updateSceneModeViaService,
} from '../esm/native/services/scene_view_access.ts';

function createAppWithSceneViewSlot(sceneView: Record<string, unknown>) {
  return {
    services: Object.assign(Object.create(null), { sceneView }),
    store: {
      getState: () => ({ ui: {}, runtime: {}, config: {}, mode: {}, meta: {} }),
      subscribeSelector: () => () => {},
    },
    render: Object.assign(Object.create(null), {
      scene: Object.assign(Object.create(null), {
        add() {},
        getObjectByName() {
          return null;
        },
      }),
      roomGroup: Object.assign(Object.create(null), {
        getObjectByName() {
          return null;
        },
      }),
      shadowMap: Object.assign(Object.create(null), { needsUpdate: false }),
    }),
    platform: Object.assign(Object.create(null), {
      triggerRender() {},
    }),
  } as any;
}

test('scene view access runtime: access helpers heal missing methods on an existing canonical slot', () => {
  const existingSlot = Object.assign(Object.create(null), { keep: 'sceneView' }) as Record<string, unknown>;
  const App = createAppWithSceneViewSlot(existingSlot);

  assert.equal(getSceneViewServiceMaybe(App), existingSlot);
  assert.equal(typeof existingSlot.initLights, 'undefined');
  assert.equal(typeof existingSlot.updateSceneMode, 'undefined');

  assert.equal(initSceneLightsViaService(App), true);
  assert.equal(updateSceneModeViaService(App), true);

  assert.equal(App.services.sceneView, existingSlot);
  assert.equal(existingSlot.keep, 'sceneView');
  assert.equal(typeof existingSlot.initLights, 'function');
  assert.equal(typeof existingSlot.updateSceneMode, 'function');
});

test('scene view access runtime: access helpers restore canonical methods after public drift', () => {
  const existingSlot = Object.assign(Object.create(null), { keep: 'sceneView' }) as Record<string, unknown>;
  const App = createAppWithSceneViewSlot(existingSlot);
  const service = ensureSceneViewService(App) as Record<string, unknown>;
  const canonicalInitLights = service.initLights;
  const canonicalUpdateLights = service.updateLights;

  const driftedCalls: string[] = [];
  service.initLights = () => {
    driftedCalls.push('initLights:drifted');
  };
  service.updateLights = () => {
    driftedCalls.push('updateLights:drifted');
  };

  assert.equal(initSceneLightsViaService(App), true);
  assert.equal(updateSceneLightsViaService(App, true), true);

  assert.equal(service.initLights, canonicalInitLights);
  assert.equal(service.updateLights, canonicalUpdateLights);
  assert.deepEqual(driftedCalls, []);
});
