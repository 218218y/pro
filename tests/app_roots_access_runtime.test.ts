import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureActionsRootSlot,
  ensureBrowserRoot,
  ensureConfigRoot,
  ensureDepsRootSlot,
  ensureLayersRoot,
  ensurePlatformRoot,
  ensureRegistriesRoot,
  ensureRenderRoot,
  ensureStoreRoot,
  getActionsRootMaybe,
  getBootRootMaybe,
  getBrowserRootMaybe,
  getConfigRootMaybe,
  getDepsRootSlotMaybe,
  getRenderRootMaybe,
  getStoreRootMaybe,
  isBootReady,
  isLifecycleBootReady,
  isLifecycleTabHidden,
  setLifecycleTabHidden,
} from '../esm/native/runtime/app_roots_access.js';

test('app_roots_access keeps canonical root namespaces stable and null-prototype where created', () => {
  const app: Record<string, unknown> = {};

  const actions = ensureActionsRootSlot(app);
  const browser = ensureBrowserRoot(app);
  const config = ensureConfigRoot(app);
  const deps = ensureDepsRootSlot(app);
  const platform = ensurePlatformRoot(app);
  const layers = ensureLayersRoot(app);
  const registries = ensureRegistriesRoot(app);
  const render = ensureRenderRoot(app);
  const store = ensureStoreRoot(app);

  assert.equal(getActionsRootMaybe(app), actions);
  assert.equal(getBrowserRootMaybe(app), browser);
  assert.equal(getConfigRootMaybe(app), config);
  assert.equal(getDepsRootSlotMaybe(app), deps);
  assert.equal(ensureActionsRootSlot(app), actions);
  assert.equal(ensureBrowserRoot(app), browser);
  assert.equal(ensureConfigRoot(app), config);
  assert.equal(ensureDepsRootSlot(app), deps);
  assert.equal(ensurePlatformRoot(app), platform);
  assert.equal(ensureLayersRoot(app), layers);
  assert.equal(ensureRegistriesRoot(app), registries);
  assert.equal(getRenderRootMaybe(app), render);
  assert.equal(ensureRenderRoot(app), render);
  assert.equal(getStoreRootMaybe(app), store);
  assert.equal(ensureStoreRoot(app), store);

  assert.equal(Object.getPrototypeOf(actions), null);
  assert.equal(Object.getPrototypeOf(browser), null);
  assert.equal(Object.getPrototypeOf(config), null);
  assert.equal(Object.getPrototypeOf(deps), null);
  assert.equal(Object.getPrototypeOf(platform), null);
  assert.equal(Object.getPrototypeOf(layers), null);
  assert.equal(Object.getPrototypeOf(registries), null);
  assert.equal(Object.getPrototypeOf(render), null);
  assert.equal(Object.getPrototypeOf(store), null);
});

test('app_roots_access preserves pre-seeded browser/config/deps/render/store roots in place', () => {
  const browser = { confirm: () => true };
  const config = { DOOR_DELAY_MS: 123 };
  const deps = { THREE: { ok: true } };
  const render = { renderer: null };
  const store = { getState: () => ({ ok: true }) };
  const app: Record<string, unknown> = { browser, config, deps, render, store };

  assert.equal(ensureBrowserRoot(app), browser);
  assert.equal(ensureConfigRoot(app), config);
  assert.equal(ensureDepsRootSlot(app), deps);
  assert.equal(ensureRenderRoot(app), render);
  assert.equal(ensureStoreRoot(app), store);
  assert.equal(getBrowserRootMaybe(app), browser);
  assert.equal(getConfigRootMaybe(app), config);
  assert.equal(getDepsRootSlotMaybe(app), deps);
  assert.equal(getRenderRootMaybe(app), render);
  assert.equal(getStoreRootMaybe(app), store);
});

test('app_roots_access tracks lifecycle and boot readiness through focused helpers', () => {
  const app: Record<string, unknown> = {};

  assert.equal(isLifecycleTabHidden(app), false);
  assert.equal(setLifecycleTabHidden(app, true), true);
  assert.equal(isLifecycleTabHidden(app), true);
  assert.equal(setLifecycleTabHidden(app, false), true);
  assert.equal(isLifecycleTabHidden(app), false);

  assert.equal(isBootReady(app), false);
  app.boot = { isReady: () => true };
  assert.equal(isBootReady(app), true);
  assert.equal(getBootRootMaybe(app)?.isReady?.(), true);

  app.lifecycle = { bootReady: true };
  assert.equal(isLifecycleBootReady(app), true);
});
