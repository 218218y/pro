import test from 'node:test';
import assert from 'node:assert/strict';

import { installBuilderHandlesV7 } from '../esm/native/builder/handles.ts';

function createApp(handles?: Record<string, unknown>) {
  return {
    services: {
      builder: {
        handles: handles ?? {},
      },
    },
  } as any;
}

test('handles install keeps canonical method refs stable across repeated installs and heals missing methods', () => {
  const App = createApp();

  const installed = installBuilderHandlesV7(App);
  const createRef = installed.createHandleMeshV7;
  const applyRef = installed.applyHandles;
  const purgeRef = installed.purgeHandlesForRemovedDoors;

  assert.equal(typeof createRef, 'function');
  assert.equal(typeof applyRef, 'function');
  assert.equal(typeof purgeRef, 'function');

  delete installed.applyHandles;

  const reinstalled = installBuilderHandlesV7(App);
  assert.equal(reinstalled, installed);
  assert.equal(reinstalled.createHandleMeshV7, createRef);
  assert.equal(reinstalled.applyHandles, applyRef);
  assert.equal(reinstalled.purgeHandlesForRemovedDoors, purgeRef);
});

test('handles install heals public drift even when the legacy marker is already set', () => {
  const driftedApply = () => 'drifted';
  const App = createApp({
    __esm_builder_handles_v7_v1: true,
    applyHandles: driftedApply,
  });

  const installed = installBuilderHandlesV7(App);
  const canonicalApply = installed.applyHandles;

  assert.notEqual(canonicalApply, driftedApply);
  assert.equal(typeof installed.createHandleMeshV7, 'function');
  assert.equal(typeof installed.purgeHandlesForRemovedDoors, 'function');

  installed.applyHandles = () => 'drifted-again';
  installBuilderHandlesV7(App);

  assert.equal(installed.applyHandles, canonicalApply);
});
