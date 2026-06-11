import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';

type AnyRecord = Record<string, unknown>;

test('[state-api] commitUiSnapshot commits through the canonical root patch path when the store exposes patch', () => {
  const calls: Array<{ via: string; payload: AnyRecord; meta: AnyRecord }> = [];

  const App: AnyRecord = {
    actions: {},
    store: {
      setUi: (patch: AnyRecord, meta: AnyRecord) => {
        calls.push({ via: 'store.setUi', payload: patch, meta });
        return 'store.setUi';
      },
      getState: () => ({ ui: {}, config: {}, runtime: {}, meta: { version: 0 } }),
      patch: (payload: AnyRecord, meta: AnyRecord) => {
        calls.push({ via: 'store.patch', payload, meta });
        return 'store.patch';
      },
      subscribe: () => () => undefined,
    },
    stateKernel: {
      commitFromSnapshot: (_snap: AnyRecord, _meta: AnyRecord) => {
        throw new Error('delete-pass: should not use raw kernel snapshot commit');
      },
    },
  };

  installStateApi(App as any);

  const out = (App.actions as any).commitUiSnapshot(
    { raw: { width: 180 }, notesEnabled: true },
    { source: 'test:uiSnap' }
  );

  assert.equal(out, 'store.patch');

  assert.equal(calls.length, 1);
  assert.equal(calls[0].via, 'store.patch');
  assert.equal((calls[0].payload as AnyRecord).ui.raw.width, 180);
  assert.equal((calls[0].payload as AnyRecord).ui.notesEnabled, true);
  assert.equal((calls[0].payload as AnyRecord).ui.__snapshot, true);
  assert.equal(typeof (calls[0].payload as AnyRecord).ui.__capturedAt, 'number');
  assert.equal((calls[0].meta as AnyRecord).source, 'test:uiSnap');
});

test('[state-api] commitUiSnapshot does not call actions.ui.patch or store.setUi when store.patch exists', () => {
  let uiPatchCalled = 0;
  let storeSetUiCalled = 0;
  const calls: Array<{ via: string; payload: AnyRecord; meta: AnyRecord }> = [];

  const App: AnyRecord = {
    actions: {
      ui: {
        patch: () => {
          uiPatchCalled += 1;
          throw new Error('should not be called');
        },
      },
    },
    store: {
      getState: () => ({ ui: {}, config: {}, runtime: {}, meta: { version: 0 } }),
      setUi: (payload: AnyRecord, meta: AnyRecord) => {
        storeSetUiCalled += 1;
        calls.push({ via: 'store.setUi', payload, meta });
        return undefined;
      },
      patch: (payload: AnyRecord, meta: AnyRecord) => {
        calls.push({ via: 'store.patch', payload, meta });
        return undefined;
      },
      subscribe: () => () => undefined,
    },
  };

  installStateApi(App as any);

  const out = (App.actions as any).commitUiSnapshot(
    { raw: { doors: 5 }, projectName: 'A' },
    { source: 'test:uiSnap:singlePath' }
  );

  assert.equal(uiPatchCalled, 0);
  assert.equal(storeSetUiCalled, 0);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].via, 'store.patch');
  assert.equal((calls[0].payload as AnyRecord).ui.raw.doors, 5);
  assert.equal((calls[0].payload as AnyRecord).ui.projectName, 'A');
  assert.equal((calls[0].meta as AnyRecord).source, 'test:uiSnap:singlePath');
  assert.equal(out as any, undefined);
});

test('[state-api] applyConfig commits through the dedicated config writer (no legacy cfg surface fallback)', () => {
  const calls: AnyRecord[] = [];
  const App: AnyRecord = {
    actions: {},
    store: {
      getState: () => ({ ui: {}, config: {}, runtime: {}, meta: { version: 0 } }),
      setConfig: (patch: AnyRecord, meta?: AnyRecord) => {
        calls.push({ patch, meta: meta || {} });
        return undefined;
      },
      patch: (payload: AnyRecord, meta?: AnyRecord) => {
        calls.push({ payload, meta: meta || {}, via: 'store.patch' });
        return undefined;
      },
      subscribe: () => () => undefined,
    },
    stateKernel: {
      patchConfigMaps: () => {
        throw new Error('should not call raw kernel patching in pure mode');
      },
      captureConfig: () => {
        throw new Error('should not read raw kernel config in pure mode');
      },
    },
  };

  installStateApi(App as any);

  (App.actions as any).applyConfig({ doors: 4, width: 220 }, { source: 'test:applyConfig' });

  assert.equal(calls.length, 1);
  assert.equal((calls[0].patch as AnyRecord).doors, 4);
  assert.equal((calls[0].patch as AnyRecord).width, 220);
  assert.equal((calls[0].meta as AnyRecord).source, 'test:applyConfig');
  assert.equal(calls[0].via as any, undefined);
});
