import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';

type AnyRecord = Record<string, unknown>;

type StoreStub = {
  getState: () => AnyRecord;
  patch: (payload: AnyRecord, meta?: AnyRecord) => unknown;
  setUi: (patch: AnyRecord, meta?: AnyRecord) => unknown;
  setRuntime: (patch: AnyRecord, meta?: AnyRecord) => unknown;
  setModePatch: (patch: AnyRecord, meta?: AnyRecord) => unknown;
  setConfig: (patch: AnyRecord, meta?: AnyRecord) => unknown;
  setMeta: (patch: AnyRecord, meta?: AnyRecord) => unknown;
  subscribe: () => () => undefined;
};

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function applyDeepMerge(dst: AnyRecord, src: AnyRecord): AnyRecord {
  const out: AnyRecord = { ...dst };
  for (const key of Object.keys(src)) {
    const prev = out[key];
    const next = src[key];
    if (next && typeof next === 'object' && !Array.isArray(next)) {
      out[key] = applyDeepMerge(
        prev && typeof prev === 'object' && !Array.isArray(prev) ? (prev as AnyRecord) : {},
        next as AnyRecord
      );
      continue;
    }
    out[key] = Array.isArray(next) ? clone(next) : next;
  }
  return out;
}

function createStore(root?: AnyRecord): { state: AnyRecord; calls: AnyRecord[]; store: StoreStub } {
  const state: AnyRecord = root || {
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };
  const calls: AnyRecord[] = [];

  const store: StoreStub = {
    getState: () => state,
    patch: (payload: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.patch', payload: clone(payload), meta: clone(meta || {}) });
      if (payload.ui && typeof payload.ui === 'object')
        state.ui = applyDeepMerge(state.ui || {}, payload.ui as AnyRecord);
      if (payload.runtime && typeof payload.runtime === 'object')
        state.runtime = applyDeepMerge(state.runtime || {}, payload.runtime as AnyRecord);
      if (payload.mode && typeof payload.mode === 'object')
        state.mode = applyDeepMerge(state.mode || {}, payload.mode as AnyRecord);
      if (payload.meta && typeof payload.meta === 'object')
        state.meta = applyDeepMerge(state.meta || {}, payload.meta as AnyRecord);
      if (payload.config && typeof payload.config === 'object')
        state.config = applyDeepMerge(state.config || {}, payload.config as AnyRecord);
      return payload;
    },
    setUi: (patch: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.setUi', patch: clone(patch), meta: clone(meta || {}) });
      state.ui = applyDeepMerge(state.ui || {}, patch);
      return patch;
    },
    setRuntime: (patch: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.setRuntime', patch: clone(patch), meta: clone(meta || {}) });
      state.runtime = applyDeepMerge(state.runtime || {}, patch);
      return patch;
    },
    setModePatch: (patch: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.setModePatch', patch: clone(patch), meta: clone(meta || {}) });
      state.mode = applyDeepMerge(state.mode || {}, patch);
      return patch;
    },
    setConfig: (patch: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.setConfig', patch: clone(patch), meta: clone(meta || {}) });
      state.config = applyDeepMerge(state.config || {}, patch);
      return patch;
    },
    setMeta: (patch: AnyRecord, meta?: AnyRecord) => {
      calls.push({ op: 'store.setMeta', patch: clone(patch), meta: clone(meta || {}) });
      state.meta = applyDeepMerge(state.meta || {}, patch);
      return patch;
    },
    subscribe: () => () => undefined,
  };

  return { state, calls, store };
}

test('[state-api] commitUiSnapshot suppresses semantically unchanged snapshots when only __capturedAt would differ', () => {
  const { calls, store } = createStore({
    ui: {
      raw: { width: 180, doors: 4 },
      notesEnabled: true,
      __snapshot: true,
      __capturedAt: 111,
    },
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  const out = (App.actions as any).commitUiSnapshot(
    { raw: { width: 180, doors: 4 }, notesEnabled: true },
    { source: 'test:no-op-ui-snapshot' }
  );

  assert.equal(out, undefined);
  assert.equal(calls.length, 0);
});

test('[state-api] applyConfig suppresses unchanged canonical config patches', () => {
  const { calls, store } = createStore({
    ui: {},
    config: { width: 220, modulesConfiguration: [{ id: 'm1' }] },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  (App.actions as any).applyConfig(
    { width: 220, modulesConfiguration: [{ id: 'm1' }] },
    { source: 'test:no-op-config' }
  );

  assert.equal(calls.length, 0);
});

test('[state-api] root actions.patch filters unchanged slices before canonical dispatch', () => {
  const { calls, store, state } = createStore({
    ui: { activeTab: 'design', raw: { width: 200, height: 240 } },
    config: { width: 200 },
    runtime: { sketchMode: false, hoverId: 'a' },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  (App.actions as any).patch(
    {
      ui: { activeTab: 'design', raw: { width: 200 } },
      runtime: { sketchMode: true },
      config: { width: 200 },
    },
    { source: 'test:filtered-root-patch' }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'store.patch');
  assert.deepEqual(calls[0].payload, { runtime: { sketchMode: true } });
  assert.equal((calls[0].meta as AnyRecord).source, 'test:filtered-root-patch');
  assert.equal((state.runtime as AnyRecord).sketchMode, true);
  assert.equal((state.ui as AnyRecord).activeTab, 'design');
  assert.equal((state.config as AnyRecord).width, 200);
});

test('[state-api] config replace-key filtering preserves unchanged entries inside replaced map branches', () => {
  const { calls, store, state } = createStore({
    ui: {},
    config: {
      removedDoorsMap: { removed_d1_full: true },
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  (App.actions as any).config.patchMap(
    'removedDoorsMap',
    { removed_d2_full: true },
    { source: 'test:replace-map-merge' }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'store.setConfig');
  assert.deepEqual((calls[0].patch as AnyRecord).removedDoorsMap, {
    removed_d1_full: true,
    removed_d2_full: true,
  });
  assert.deepEqual((state.config as AnyRecord).removedDoorsMap, {
    removed_d1_full: true,
    removed_d2_full: true,
  });
});

test('[state-api] root actions.patch keeps single runtime slices on canonical root store.patch payloads after noop filtering', () => {
  const { calls, store, state } = createStore({
    ui: { activeTab: 'design' },
    config: {},
    runtime: { sketchMode: false, hoverId: 'keep' },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  (App.actions as any).patch(
    {
      runtime: { sketchMode: true, hoverId: 'keep' },
    },
    { source: 'test:single-runtime-route' }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'store.patch');
  assert.deepEqual(calls[0].payload, { runtime: { sketchMode: true } });
  assert.equal((calls[0].meta as AnyRecord).source, 'test:single-runtime-route');
  assert.equal((state.runtime as AnyRecord).sketchMode, true);
  assert.equal((state.runtime as AnyRecord).hoverId, 'keep');
});

test('[state-api] root actions.patch routes one meta slice through the dedicated meta writer instead of root patch', () => {
  const { calls, store, state } = createStore({
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, source: 'keep' },
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  (App.actions as any).patch(
    {
      meta: { dirty: true, source: 'keep' },
    },
    { source: 'test:single-meta-route' }
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].op, 'store.setMeta');
  assert.deepEqual(calls[0].patch, { dirty: true });
  assert.equal((calls[0].meta as AnyRecord).source, 'test:single-meta-route');
  assert.equal((state.meta as AnyRecord).dirty, true);
  assert.equal((state.meta as AnyRecord).source, 'keep');
});
