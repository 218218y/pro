import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProjectDragDropState,
  loadProjectDragDropControllerModule,
} from './project_drag_drop_controller_runtime_helpers.js';

test('[project-drag-drop-controller] thrown load failures preserve actionable messages', async () => {
  const state = createProjectDragDropState({ throwLoadMessage: 'drag load exploded' });
  const { exports: mod, FakeFile, FakeDragEvent } = loadProjectDragDropControllerModule(state);
  const doc = { body: {} };
  const controller = mod.createProjectDragDropController(
    { id: 'app' },
    {
      doc,
      toast: (msg, type) => state.toasts.push([msg, type]),
    }
  );

  const jsonEvent = new FakeDragEvent({ files: [new FakeFile('broken.json')], types: ['Files'] });
  await controller.onDropHandle(jsonEvent);

  assert.deepEqual(state.loads, ['broken.json']);
  assert.deepEqual(state.reports, [{ ok: false, reason: 'error', message: 'drag load exploded' }]);
  assert.deepEqual(state.toggles, [['is-dragover', false]]);
  assert.equal(jsonEvent.prevented, 1);
  assert.equal(jsonEvent.stopped, 1);
});
