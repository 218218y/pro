import test from 'node:test';
import assert from 'node:assert/strict';

import {
  captureCurrentSnapshot,
  normalizeModelLoadReason,
} from '../esm/native/services/models_apply_project.ts';

test('models apply project capture falls back to history snapshots and detaches preserved pdf draft state', () => {
  const state = {
    ui: {
      orderPdfEditorDraft: {
        notes: 'keep me',
        nested: { value: 1 },
      },
      orderPdfEditorZoom: '2.5',
    },
  };

  const App = {
    store: {
      getState() {
        return state;
      },
    },
    services: {
      history: {
        system: {
          getCurrentSnapshot() {
            return JSON.stringify({ settings: { width: 180 } });
          },
        },
      },
    },
  } as any;

  const snapshot = captureCurrentSnapshot(App);
  assert.deepEqual(snapshot?.settings, { width: 180 });
  assert.deepEqual(snapshot?.orderPdfEditorDraft, {
    notes: 'keep me',
    nested: { value: 1 },
  });
  assert.equal(snapshot?.orderPdfEditorZoom, 2.5);

  state.ui.orderPdfEditorDraft.nested.value = 9;
  assert.equal(snapshot?.orderPdfEditorDraft?.nested?.value, 1);
});

test('models apply project load reason normalization stays canonical for project-load driven outcomes', () => {
  assert.equal(normalizeModelLoadReason(' invalid '), 'invalid');
  assert.equal(normalizeModelLoadReason('superseded'), 'superseded');
  assert.equal(normalizeModelLoadReason('weird'), 'load');
});
