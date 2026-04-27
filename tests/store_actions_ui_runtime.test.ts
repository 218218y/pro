import test from 'node:test';
import assert from 'node:assert/strict';

import {
  applyUiRawScalarPatch,
  applyUiSoftScalarPatch,
} from '../esm/native/ui/react/actions/store_actions_ui.ts';

type UiState = Record<string, unknown> & { raw?: Record<string, unknown> };

type AppLike = {
  actions: {
    ui: {
      patchSoft?: (patch: unknown, meta?: unknown) => unknown;
      setScalarSoft?: (key: string, value: unknown, meta?: unknown) => unknown;
      setRawScalar?: (key: string, value: unknown, meta?: unknown) => unknown;
    };
  };
  store: {
    getState: () => { ui: UiState };
  };
};

function createApp(initialUi: UiState = {}): AppLike & { calls: Array<[string, unknown, unknown?]> } {
  let uiState: UiState = { ...initialUi, raw: initialUi.raw ? { ...initialUi.raw } : initialUi.raw };
  const calls: Array<[string, unknown, unknown?]> = [];
  const app: AppLike & { calls: Array<[string, unknown, unknown?]> } = {
    calls,
    actions: {
      ui: {
        patchSoft(patch: unknown, meta?: unknown) {
          calls.push(['patchSoft', patch, meta]);
          const rec = (patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : {}) || {};
          const next: UiState = { ...uiState };
          for (const key of Object.keys(rec)) {
            if (key === 'raw' && rec.raw && typeof rec.raw === 'object' && !Array.isArray(rec.raw)) {
              next.raw = { ...(next.raw || {}), ...(rec.raw as Record<string, unknown>) };
              continue;
            }
            next[key] = rec[key];
          }
          uiState = next;
          return patch;
        },
        setScalarSoft(key: string, value: unknown, meta?: unknown) {
          calls.push(['setScalarSoft', { key, value }, meta]);
          uiState = { ...uiState, [key]: value };
          return value;
        },
        setRawScalar(key: string, value: unknown, meta?: unknown) {
          calls.push(['setRawScalar', { key, value }, meta]);
          uiState = { ...uiState, raw: { ...(uiState.raw || {}), [key]: value } };
          return value;
        },
      },
    },
    store: {
      getState: () => ({ ui: uiState }),
    },
  };
  return app;
}

test('[store-actions-ui] applyUiSoftScalarPatch batches multi-key soft patches through patchSoft once', () => {
  const app = createApp();

  applyUiSoftScalarPatch(app as any, { width: 180, height: 220 }, { source: 'test' });

  assert.deepEqual(
    app.calls.map(entry => entry[0]),
    ['patchSoft']
  );
  assert.deepEqual(app.calls[0][1], { width: 180, height: 220 });
});

test('[store-actions-ui] applyUiRawScalarPatch batches multi-key raw patches through patchSoft once', () => {
  const app = createApp({ raw: {} });

  applyUiRawScalarPatch(app as any, { width: 180, depth: 60 }, { source: 'test' });

  assert.deepEqual(
    app.calls.map(entry => entry[0]),
    ['patchSoft']
  );
  assert.deepEqual(app.calls[0][1], { raw: { width: 180, depth: 60 } });
});

test('[store-actions-ui] batched helpers stay idle when the effective patch is unchanged', () => {
  const app = createApp({ width: 180, height: 220, raw: { width: 180, depth: 60 } });

  applyUiSoftScalarPatch(app as any, { width: 180, height: 220 }, { source: 'test' });
  applyUiRawScalarPatch(app as any, { width: 180, depth: 60 }, { source: 'test' });

  assert.equal(app.calls.length, 0);
});
