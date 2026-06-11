import test from 'node:test';
import assert from 'node:assert/strict';

import {
  ensureDepsNamespace,
  ensureDepsRoot,
  getDepMaybe,
  getDepsNamespaceMaybe,
  getDepsRootMaybe,
  hasDep,
  setDep,
} from '../esm/native/runtime/deps_access.js';
import {
  ensureBuilderDepsNamespace,
  ensureBuilderDepsRoot,
  isBuilderDepsReady,
  requireBuilderDepsReady,
  requireBuilderDepsRoot,
  setBuilderDepsReady,
} from '../esm/native/runtime/builder_deps_access.js';

test('deps_access keeps canonical deps namespaces stable and null-prototype where created', () => {
  const app: Record<string, unknown> = {};

  const deps = ensureDepsRoot(app);
  const flags = ensureDepsNamespace(app, 'flags');
  const builder = ensureBuilderDepsRoot(app);
  const builderRender = ensureBuilderDepsNamespace(app, 'render');

  assert.equal(getDepsRootMaybe(app), deps);
  assert.equal(ensureDepsRoot(app), deps);
  assert.equal(getDepsNamespaceMaybe(app, 'flags'), flags);
  assert.equal(ensureDepsNamespace(app, 'flags'), flags);
  assert.equal(requireBuilderDepsRoot(app as any), builder);
  assert.equal(ensureBuilderDepsRoot(app), builder);
  assert.equal(ensureBuilderDepsNamespace(app, 'render'), builderRender);

  assert.equal(Object.getPrototypeOf(deps), null);
  assert.equal(Object.getPrototypeOf(flags), null);
  assert.equal(Object.getPrototypeOf(builder), null);
  assert.equal(Object.getPrototypeOf(builderRender), null);
});

test('deps_access exposes focused dep reads and builder readiness guards', () => {
  const app: Record<string, unknown> = {};

  assert.equal(hasDep(app, 'THREE'), false);
  assert.equal(getDepMaybe(app, 'THREE'), null);
  assert.equal(setDep(app, 'THREE', { tag: 'three' }), true);
  assert.equal(hasDep(app, 'THREE'), true);
  assert.deepEqual(getDepMaybe(app, 'THREE'), { tag: 'three' });

  assert.equal(isBuilderDepsReady(app), false);
  assert.throws(() => requireBuilderDepsReady(app as any), /Builder deps missing|Builder deps not ready/);

  setBuilderDepsReady(app, true);
  assert.equal(isBuilderDepsReady(app), true);
  assert.equal(requireBuilderDepsReady(app as any).__ready, true);
});
