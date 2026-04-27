import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getBuilderDepsRoot,
  ensureBuilderDepsRoot,
  getBuilderDepsNamespace,
  ensureBuilderDepsNamespace,
  isBuilderDepsReady,
  setBuilderDepsReady,
} from '../esm/native/runtime/builder_deps_access.ts';

test('builder deps access runtime: root + namespace seams are stable', () => {
  const App: any = {};
  const root = ensureBuilderDepsRoot(App);
  const materials = ensureBuilderDepsNamespace(App, 'materials');
  materials.cache = 1;

  assert.equal(root, getBuilderDepsRoot(App));
  assert.equal(materials, getBuilderDepsNamespace(App, 'materials'));
  assert.equal((ensureBuilderDepsNamespace(App, 'materials') as any).cache, 1);
});

test('builder deps access runtime: ready flag stays on canonical builder deps root', () => {
  const App: any = {};
  assert.equal(isBuilderDepsReady(App), false);
  setBuilderDepsReady(App, true);
  assert.equal(isBuilderDepsReady(App), true);
  setBuilderDepsReady(App, false);
  assert.equal(isBuilderDepsReady(App), false);
});
