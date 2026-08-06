import test from 'node:test';
import assert from 'node:assert/strict';

import {
  _cloneJSON,
  _modelsReportNonFatal,
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

test('models registry shared: detached fallback remains cycle-safe when native and JSON cloning reject', () => {
  const originalStructuredClone = globalThis.structuredClone;
  (globalThis as any).structuredClone = () => {
    throw new Error('native clone unavailable');
  };

  try {
    const source: any = { id: 'm1', name: 'Alpha', meta: { accent: 'red' } };
    source.self = source;

    const cloned = _cloneJSON(source) as any;
    assert.ok(cloned);
    assert.notEqual(cloned, source);
    assert.notEqual(cloned.meta, source.meta);
    assert.equal(cloned.self, cloned);
  } finally {
    (globalThis as any).structuredClone = originalStructuredClone;
  }
});

test('models registry shared: exhausted clone paths fail closed and publish one stable diagnostic', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: {
      platform: {
        reportError(error: unknown, ctx: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  } as any;
  const hostile = new Proxy(
    { id: 'm-hostile', name: 'Hostile' },
    {
      ownKeys() {
        throw new Error('hostile ownKeys rejected');
      },
    }
  );

  const cloned = _cloneJSON(hostile, { App, op: 'sharedRuntime.hostileClone' });

  assert.equal(cloned, null);
  assert.equal(reports.length, 1);
  assert.match(String((reports[0]?.error as Error)?.message || ''), /could not create a detached clone/i);
  assert.deepEqual(reports[0]?.ctx, {
    where: 'native/services/models_registry',
    op: 'sharedRuntime.hostileClone.cloneExhausted',
    fatal: false,
  });
});

test('models registry shared: nonfatal reports use stable metadata and throttle duplicates', () => {
  const reports: Array<{ error: unknown; ctx: any }> = [];
  const App = {
    services: {
      platform: {
        reportError(error: unknown, ctx: unknown) {
          reports.push({ error, ctx });
        },
      },
    },
  } as any;
  const error = new Error('dedupe registry diagnostic');

  _modelsReportNonFatal(App, 'sharedRuntime.dedupe', error, 60_000);
  _modelsReportNonFatal(App, 'sharedRuntime.dedupe', error, 60_000);

  assert.equal(reports.length, 1);
  assert.equal(reports[0]?.error, error);
  assert.deepEqual(reports[0]?.ctx, {
    where: 'native/services/models_registry',
    op: 'sharedRuntime.dedupe',
    fatal: false,
  });
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
    detailsText: 'A',
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
