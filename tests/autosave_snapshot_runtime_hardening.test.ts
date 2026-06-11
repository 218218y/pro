import test from 'node:test';
import assert from 'node:assert/strict';

import { captureAutosaveSnapshot } from '../esm/native/services/autosave.ts';

function createAppWithLiveDraft(draft: unknown) {
  return {
    services: {
      project: {
        capture() {
          return { settings: { width: 120 }, meta: { source: 'persist' } };
        },
      },
    },
    store: {
      getState() {
        return {
          ui: {
            orderPdfEditorDraft: draft,
            orderPdfEditorZoom: 1.5,
          },
          config: {},
          runtime: { systemReady: true, restoring: false },
          mode: {},
          meta: {},
        };
      },
    },
  } as any;
}

test('autosave snapshot: toxic orderPdfEditorDraft is sanitized and detached instead of aliasing the live draft', () => {
  const cyclic: Record<string, unknown> = { label: 'bad' };
  cyclic.self = cyclic;

  const liveDraft: Record<string, unknown> = {
    pages: [{ id: 'p1', html: '<p>keep</p>' }],
    meta: {
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
      nested: { keep: 1 },
    },
    badBigInt: 7n,
    badCycle: cyclic,
  };

  const App = createAppWithLiveDraft(liveDraft);
  const snapshot = captureAutosaveSnapshot(App);

  assert.ok(snapshot);
  assert.notEqual(snapshot?.orderPdfEditorDraft, liveDraft);
  assert.deepEqual(snapshot?.orderPdfEditorDraft, {
    pages: [{ id: 'p1', html: '<p>keep</p>' }],
    meta: {
      createdAt: '2026-01-02T03:04:05.000Z',
      nested: { keep: 1 },
    },
    badCycle: { label: 'bad' },
  });
  assert.equal((snapshot?.orderPdfEditorDraft as any)?.badCycle?.self, undefined);
  assert.equal(snapshot?.orderPdfEditorZoom, 1.5);

  liveDraft.meta = { createdAt: 'mutated', nested: { keep: 9 } };
  assert.deepEqual((snapshot?.orderPdfEditorDraft as any)?.meta, {
    createdAt: '2026-01-02T03:04:05.000Z',
    nested: { keep: 1 },
  });
});
