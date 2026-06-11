import test from 'node:test';
import assert from 'node:assert/strict';

import { createAppContainer } from '../esm/app_container.js';
import {
  ensureAppLayer,
  ensureAppLayers,
  getAppLayer,
  getAppLayers,
} from '../esm/native/runtime/layers_access.js';
import { installCoreLayerSurface } from '../esm/native/core/install.js';

test('layers access preserves shared layer root and unrelated entries', () => {
  const App: any = createAppContainer();
  App.layers.customLayer = { tag: 'keep-me' };

  const layers = ensureAppLayers(App);
  const engine = ensureAppLayer(App, 'engine');

  assert.equal(getAppLayers(App), layers);
  assert.equal(getAppLayer(App, 'engine'), engine);
  assert.equal(App.layers.customLayer.tag, 'keep-me');
  assert.equal(Object.getPrototypeOf(layers), null);
  assert.equal(Object.getPrototypeOf(engine), null);
});

test('core layer installer reuses existing layer object instead of replacing it', () => {
  const App: any = createAppContainer();
  const preexisting = ensureAppLayer(App, 'core');
  preexisting.note = 'preserve-shape';

  const installed = installCoreLayerSurface(App);

  assert.equal(installed, preexisting);
  assert.equal(App.layers.core.note, 'preserve-shape');
  assert.equal(installed.kind, 'core');
  assert.equal(typeof installed.api.readRootState, 'function');
});
