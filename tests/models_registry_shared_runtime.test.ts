import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _cloneJSON,
  _normalizeModel,
  _attachPdfEditorDraft,
  modelsRuntimeState,
} from '../esm/native/services/models_registry.ts';

function resetRuntimeState() {
  modelsRuntimeState.normalizer = null;
  modelsRuntimeState.presets = [];
  modelsRuntimeState.loaded = false;
  modelsRuntimeState.all = [];
  modelsRuntimeState.listeners = [];
  modelsRuntimeState.revision = 0;
}

test('models registry shared: clone helper detaches cyclic nested records instead of reusing live refs', () => {
  const source: any = { id: 'm1', name: 'Alpha', meta: { accent: 'red' } };
  source.self = source;

  const cloned = _cloneJSON(source) as any;
  assert.notEqual(cloned, source);
  assert.notEqual(cloned.meta, source.meta);

  cloned.meta.accent = 'blue';
  assert.equal(source.meta.accent, 'red');
  assert.equal(cloned.self, cloned);
});

test('models registry shared: normalizeModel detaches nested payloads for cyclic imported models', () => {
  resetRuntimeState();
  const imported: any = { id: 'm1', name: 'Alpha', meta: { accent: 'red' } };
  imported.self = imported;

  const normalized = _normalizeModel(imported) as any;
  assert.ok(normalized);
  assert.notEqual(normalized, imported);
  assert.notEqual(normalized.meta, imported.meta);
  normalized.meta.accent = 'blue';
  assert.equal(imported.meta.accent, 'red');
});

test('models registry shared: attachPdfEditorDraft detaches nested draft payloads from UI state', () => {
  const draft: any = {
    detailsTouched: true,
    manualEnabled: true,
    manualDetails: 'A',
    notes: 'B',
    meta: { accent: 'red' },
  };

  const App = {
    store: {
      getState() {
        return {
          ui: {
            orderPdfEditorDraft: draft,
            orderPdfEditorZoom: 2,
          },
        };
      },
    },
  } as any;

  const snap: Record<string, unknown> = {};
  _attachPdfEditorDraft(App, snap as any);

  assert.equal(snap.orderPdfEditorZoom, 2);
  assert.ok(snap.orderPdfEditorDraft);
  assert.notEqual(snap.orderPdfEditorDraft, draft);
  assert.notEqual((snap.orderPdfEditorDraft as any).meta, draft.meta);

  (snap.orderPdfEditorDraft as any).meta.accent = 'blue';
  assert.equal(draft.meta.accent, 'red');
});
