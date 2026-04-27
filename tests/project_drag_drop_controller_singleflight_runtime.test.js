import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProjectDragDropState,
  loadProjectDragDropControllerModule,
} from './project_drag_drop_controller_runtime_helpers.js';

test('[project-drag-drop-controller] duplicate inflight drops for the same file reuse one pending load', async () => {
  const state = createProjectDragDropState({ deferLoads: true });
  const { exports: mod, FakeFile, FakeDragEvent } = loadProjectDragDropControllerModule(state);
  const doc = { body: {} };
  const controller = mod.createProjectDragDropController(
    { id: 'app' },
    {
      doc,
      toast: (msg, type) => state.toasts.push([msg, type]),
    }
  );

  const first = new FakeDragEvent({
    files: [new FakeFile('same.json', { size: 10, type: 'application/json', lastModified: 1 })],
    types: ['Files'],
  });
  const second = new FakeDragEvent({
    files: [new FakeFile('same.json', { size: 10, type: 'application/json', lastModified: 1 })],
    types: ['Files'],
  });

  const firstPromise = controller.onDropHandle(first);
  const secondPromise = controller.onDropHandle(second);
  await Promise.resolve();

  assert.equal(state.loadCalls, 1);
  assert.deepEqual(state.loads, ['same.json']);
  assert.equal(state.pendingLoads.length, 1);
  assert.equal(first.prevented, 1);
  assert.equal(second.prevented, 1);

  const different = new FakeDragEvent({
    files: [new FakeFile('different.json', { size: 11, type: 'application/json', lastModified: 2 })],
    types: ['Files'],
  });
  const differentPromise = controller.onDropHandle(different);
  const differentResult = await differentPromise;
  assert.equal(differentResult, undefined);
  assert.equal(state.loadCalls, 1);
  assert.deepEqual(state.loads, ['same.json']);
  assert.equal(state.pendingLoads.length, 1);
  assert.deepEqual(state.reports, [{ ok: false, reason: 'busy' }]);

  state.pendingLoads[0].deferred.resolve({ ok: true, file: 'same.json' });
  await Promise.all([firstPromise, secondPromise]);

  assert.deepEqual(state.reports, [
    { ok: false, reason: 'busy' },
    { ok: true, file: 'same.json' },
  ]);
});
