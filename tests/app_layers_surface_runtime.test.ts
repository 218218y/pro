import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppContainer } from '../esm/app_container.js';
import { installCoreLayerSurface } from '../esm/native/core/install.js';
import { installEngineLayerSurface } from '../esm/native/engine/install.js';

test('core/engine layer surfaces install stable runtime facades', () => {
  const App: any = createAppContainer();

  const core = installCoreLayerSurface(App);
  const engine = installEngineLayerSurface(App);

  assert.equal(App.layers.core, core);
  assert.equal(App.layers.engine, engine);
  assert.equal(installCoreLayerSurface(App), core);
  assert.equal(installEngineLayerSurface(App), engine);
  assert.equal(core.kind, 'core');
  assert.equal(engine.kind, 'engine');
  assert.equal(typeof core.api.readRootState, 'function');
  assert.equal(typeof core.install.installAppStartService, 'function');
  assert.equal(typeof engine.api.createViewportSurface, 'function');
  assert.equal(typeof engine.install.installSceneViewService, 'function');
  assert.ok(Object.isFrozen(core.api));
  assert.ok(Object.isFrozen(core.install));
  assert.ok(Object.isFrozen(engine.api));
  assert.ok(Object.isFrozen(engine.install));
});
