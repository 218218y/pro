import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store parity: silent dispatch updates state/meta but does not notify listeners', () => {
  const store = createStore({
    initialState: {
      ui: { a: 1 },
      config: {},
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  let calls = 0;
  let lastNotifiedMeta: AnyRecord | null = null;
  store.subscribe((_st, actionMeta) => {
    calls++;
    lastNotifiedMeta = asRec(actionMeta);
  });

  const before = store.getState();
  const beforeMeta = asRec(before.meta);

  dispatchCompat(
    store,
    {
      type: 'PATCH',
      payload: { ui: { a: 2 } },
      meta: { source: 'test:silent' } as AnyRecord,
    } as AnyRecord,
    { silent: true }
  );

  const after = store.getState();
  const meta = asRec(after.meta);
  const lastAction = asRec(meta.lastAction);

  assert.equal(calls, 0);
  assert.equal(asRec(after.ui).a, 2);
  assert.equal(meta.version, ((beforeMeta.version as number) | 0) + 1);
  assert.equal(typeof meta.updatedAt, 'number');
  assert.ok((meta.updatedAt as number) >= 0);
  assert.equal(lastAction.type, 'PATCH');
  assert.equal(lastAction.source, 'test:silent');
  assert.equal(lastAction.silent, true);
  assert.equal(lastNotifiedMeta, null);
});

test('store parity: stamped meta.lastAction reflects payload slices and meta flags', () => {
  const store = createStore();

  let notifyCount = 0;
  let notifyMeta: AnyRecord | null = null;
  store.subscribe((_st, actionMeta) => {
    notifyCount++;
    notifyMeta = asRec(actionMeta);
  });

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      ui: { panelOpen: true },
      config: { projectName: 'x' },
      runtime: { busy: true },
      mode: { primary: 'edit' },
      meta: { dirty: true },
    },
    meta: {
      source: 'test:flags',
      immediate: true,
      noBuild: true,
      noAutosave: true,
      noPersist: true,
      noHistory: true,
      force: true,
      forceBuild: true,
      uiOnly: true,
      noCapture: true,
    },
  } as AnyRecord);

  const st = store.getState();
  const meta = asRec(st.meta);
  const lastAction = asRec(meta.lastAction);

  assert.equal(notifyCount, 1);
  assert.ok(notifyMeta);
  assert.equal(asRec(st.meta).dirty, true);
  assert.equal(lastAction.type, 'PATCH');
  assert.equal(lastAction.source, 'test:flags');
  assert.equal(lastAction.immediate, true);
  assert.equal(lastAction.noBuild, true);
  assert.equal(lastAction.noAutosave, true);
  assert.equal(lastAction.noPersist, true);
  assert.equal(lastAction.noHistory, true);
  assert.equal(lastAction.force, true);
  assert.equal(lastAction.forceBuild, true);
  assert.equal(lastAction.uiOnly, true);
  assert.equal(lastAction.noCapture, true);
  assert.equal(lastAction.affectsUi, true);
  assert.equal(lastAction.affectsConfig, true);
  assert.equal(lastAction.affectsRuntime, true);
  assert.equal(lastAction.affectsMode, true);
  assert.equal(lastAction.affectsMeta, true);
  assert.equal(lastAction.silent, false);
  assert.equal(typeof lastAction.ts, 'number');
  assert.equal(lastAction.ts, meta.updatedAt);
});

test('store parity: persisted config patch auto-marks dirty for before-unload/save guards', () => {
  const store = createStore({
    initialState: {
      ui: {},
      config: { wardrobeType: 'hinged' },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: { wardrobeType: 'sliding' },
    },
    meta: { source: 'test:auto-dirty' },
  } as AnyRecord);

  let st = store.getState();
  assert.equal(asRec(st.config).wardrobeType, 'sliding');
  assert.equal(asRec(st.meta).dirty, true);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      meta: { dirty: false },
    },
    meta: { source: 'test:auto-dirty:reset', noPersist: true },
  } as AnyRecord);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: { wardrobeType: 'hinged' },
    },
    meta: { source: 'test:auto-dirty:noPersist', noPersist: true },
  } as AnyRecord);

  st = store.getState();
  assert.equal(asRec(st.config).wardrobeType, 'hinged');
  assert.equal(asRec(st.meta).dirty, false, 'transient noPersist config writes should stay clean');
});

test('store parity: config.__replace fully replaces targeted keys while other keys still deep-merge', () => {
  const store = createStore({
    initialState: {
      config: {
        theme: { accent: 'blue', nested: { keep: 1 } },
        sizing: { width: 100 },
      },
    },
  });

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: {
        __replace: { theme: true },
        theme: { accent: 'red' },
        sizing: { height: 200 },
      },
    },
    meta: { source: 'test:replace' },
  } as AnyRecord);

  const cfg = asRec(store.getState().config);
  assert.deepEqual(cfg.theme, { accent: 'red' });
  assert.deepEqual(cfg.sizing, { width: 100, height: 200 });
});

test('store parity: structural sharing keeps untouched slices and no-op ui patch references stable', () => {
  const store = createStore({
    initialState: {
      ui: { raw: { width: 160 }, items: [1, 2] },
      config: { keep: { x: 1 } },
      runtime: { flag: false },
      mode: { primary: 'none', opts: {} },
    },
  });

  const s1 = store.getState();
  const ui1 = s1.ui;
  const cfg1 = s1.config;
  const mode1 = s1.mode;
  const rt1 = s1.runtime;
  const meta1 = s1.meta;

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { runtime: { flag: true } },
    meta: { source: 'test:runtime-only' },
  } as AnyRecord);

  const s2 = store.getState();
  assert.equal(s2.ui, ui1);
  assert.equal(s2.config, cfg1);
  assert.equal(s2.mode, mode1);
  assert.notEqual(s2.runtime, rt1);
  assert.notEqual(s2.meta, meta1);

  const ui2 = s2.ui;
  const raw2 = asRec(ui2).raw;
  const items2 = asRec(ui2).items;

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      ui: {
        raw: { width: 160 },
        items: [1, 2],
      },
    },
    meta: { source: 'test:noop-ui' },
  } as AnyRecord);

  const s3 = store.getState();
  assert.equal(s3.ui, ui2, 'no-op ui patch should preserve ui slice reference');
  assert.equal(asRec(s3.ui).raw, raw2, 'nested raw object should remain shared');
  assert.equal(asRec(s3.ui).items, items2, 'array should be reused on shallow-equal patch');

  const storeAny = store as unknown as { getAction?: () => AnyRecord | null };
  const lastEnv = storeAny.getAction?.();
  assert.equal(asRec(lastEnv).type, 'PATCH');
});

test('store parity: listener actionMeta mutation does not corrupt stored meta.lastAction', () => {
  const store = createStore();

  store.subscribe((_st, actionMeta) => {
    const m = asRec(actionMeta);
    m.source = 'listener:mutated';
    m.affectsUi = false;
    m.extraInjected = 'x';
  });

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { probe: 1 } },
    meta: { source: 'test:listener-isolation' },
  } as AnyRecord);

  const lastAction = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(lastAction.source, 'test:listener-isolation');
  assert.equal(lastAction.affectsUi, true);
  assert.equal(lastAction.extraInjected, undefined);
});

test('store parity: helper patch APIs stamp canonical metadata for UI/config/runtime/meta toggles', () => {
  const store = createStore();

  (store as unknown as { setUi: (p: unknown, m?: unknown) => void }).setUi({ panelOpen: true });
  let last = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(last.type, 'PATCH');
  assert.equal(last.source, 'ui');
  assert.equal(last.affectsUi, true);
  assert.equal(last.noBuild, true);
  assert.equal(last.noHistory, true);

  (store as unknown as { setConfig: (p: unknown, m?: unknown) => void }).setConfig({ projectName: 'A' });
  last = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(last.source, 'config');
  assert.equal(last.affectsConfig, true);

  (store as unknown as { setRuntime: (p: unknown, m?: unknown) => void }).setRuntime({ busy: true });
  last = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(last.source, 'runtime');
  assert.equal(last.affectsRuntime, true);

  (store as unknown as { setDirty: (v: unknown, m?: unknown) => void }).setDirty(false);
  let meta = asRec(store.getState().meta);
  last = asRec(meta.lastAction);
  assert.equal(meta.dirty, false);
  assert.equal(last.source, 'dirty');
  assert.equal(last.affectsMeta, true);
  assert.equal(last.noBuild, true);
  assert.equal(last.noPersist, true);

  (store as unknown as { setDirty: (v: unknown, m?: unknown) => void }).setDirty(true);
  meta = asRec(store.getState().meta);
  last = asRec(meta.lastAction);
  assert.equal(meta.dirty, true);
  assert.equal(last.source, 'dirty');
  assert.equal(last.affectsMeta, true);
  assert.equal(last.noBuild, true);
  assert.equal(last.noPersist, true);
});

test('store parity: mode helper replaces opts instead of merging stale keys', () => {
  const store = createStore();

  (store as unknown as { setMode: (primary: unknown, opts?: unknown, meta?: unknown) => void }).setMode(
    'split',
    {
      splitVariant: 'custom',
      keep: true,
    }
  );
  let mode = asRec(store.getState().mode);
  assert.equal(mode.primary, 'split');
  assert.deepEqual(asRec(mode.opts), { splitVariant: 'custom', keep: true });

  (store as unknown as { setMode: (primary: unknown, opts?: unknown, meta?: unknown) => void }).setMode(
    'none',
    {}
  );
  mode = asRec(store.getState().mode);
  assert.equal(mode.primary, 'none');
  assert.deepEqual(asRec(mode.opts), {});

  (store as unknown as { setMode: (primary: unknown, opts?: unknown, meta?: unknown) => void }).setMode(
    'split',
    {}
  );
  mode = asRec(store.getState().mode);
  assert.equal(mode.primary, 'split');
  assert.deepEqual(asRec(mode.opts), {});
});
