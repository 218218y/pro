import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createProjectDragDropState,
  loadProjectDragDropControllerModule,
} from './project_drag_drop_controller_runtime_helpers.js';

test('[project-drag-drop-controller] drop flow keeps file-only semantics and canonical reporting', async () => {
  const state = createProjectDragDropState();
  const { exports: mod, FakeFile, FakeDragEvent } = loadProjectDragDropControllerModule(state);
  const doc = { body: {} };
  const controller = mod.createProjectDragDropController(
    { id: 'app' },
    {
      doc,
      toast: (msg, type) => state.toasts.push([msg, type]),
    }
  );

  const txtEvent = new FakeDragEvent({ files: [new FakeFile('bad.txt')], types: ['Files'] });
  await controller.onDropHandle(txtEvent);

  const jsonEvent = new FakeDragEvent({ files: [new FakeFile('good.json')], types: ['Files'] });
  await controller.onDropHandle(jsonEvent);

  const overEvent = new FakeDragEvent({ files: [new FakeFile('x.json')], types: ['Files'] });
  controller.preventDefaultsForFilesOnly(overEvent);
  controller.onDragOverClass(overEvent);
  controller.onDragLeaveClass();

  assert.deepEqual(state.toasts, [['אנא גרור קובץ פרויקט (JSON) בלבד.', 'error']]);
  assert.deepEqual(state.loads, ['good.json']);
  assert.deepEqual(state.reports, [{ ok: true, file: 'good.json' }]);
  assert.deepEqual(state.toggles, [
    ['is-dragover', false],
    ['is-dragover', false],
    ['is-dragover', true],
    ['is-dragover', false],
  ]);
  assert.equal(overEvent.prevented, 1);
  assert.equal(overEvent.stopped, 1);
  assert.equal(jsonEvent.prevented, 1);
  assert.equal(jsonEvent.stopped, 1);
});
