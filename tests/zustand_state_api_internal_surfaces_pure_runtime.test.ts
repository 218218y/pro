import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';

type AnyRecord = Record<string, unknown>;

function asRec(v: unknown): AnyRecord {
  return (v && typeof v === 'object' ? (v as AnyRecord) : {}) as AnyRecord;
}

function createStoreStub(root?: AnyRecord) {
  const state: AnyRecord = root || {
    ui: {},
    config: { isManualWidth: false },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };

  const applyPatch = (payload: AnyRecord) => {
    if (!payload || typeof payload !== 'object') return;
    if (payload.ui && typeof payload.ui === 'object') Object.assign(state.ui || (state.ui = {}), payload.ui);
    if (payload.runtime && typeof payload.runtime === 'object')
      Object.assign(state.runtime || (state.runtime = {}), payload.runtime);
    if (payload.mode && typeof payload.mode === 'object')
      Object.assign(state.mode || (state.mode = {}), payload.mode);
    if (payload.meta && typeof payload.meta === 'object')
      Object.assign(state.meta || (state.meta = {}), payload.meta);
    if (payload.config && typeof payload.config === 'object')
      Object.assign(state.config || (state.config = {}), payload.config);
  };

  return {
    getState: () => state,
    patch: (payload: AnyRecord) => {
      applyPatch(payload);
      return payload;
    },
    setUi: (patch: AnyRecord, _meta?: AnyRecord) => {
      applyPatch({ ui: patch });
      return patch;
    },
    setRuntime: (patch: AnyRecord, _meta?: AnyRecord) => {
      applyPatch({ runtime: patch });
      return patch;
    },
    setModePatch: (patch: AnyRecord, _meta?: AnyRecord) => {
      applyPatch({ mode: patch });
      return patch;
    },
    setConfig: (patch: AnyRecord, _meta?: AnyRecord) => {
      applyPatch({ config: patch });
      return patch;
    },
    setMeta: (patch: AnyRecord, _meta?: AnyRecord) => {
      applyPatch({ meta: patch });
      return patch;
    },
    subscribe: () => () => undefined,
  };
}

test('[state-api] builder/config read seams are store-backed (no raw kernel capture)', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub({
    ui: { a: 1 },
    config: { width: 180 },
    mode: { primary: 'none', opts: {} },
    runtime: {},
    meta: {},
  });
  const App: AnyRecord = {
    actions: {},
    store,
    services: { history: { system: { id: 'svc' } } },
    stateKernel: {
      historySystem: { id: 'sk' },
      getBuildState() {
        calls.push({ op: 'getBuildState' });
        return { ui: { from: 'kernel' }, config: { width: 181 }, mode: { primary: 'edit', opts: {} } };
      },
      captureConfig() {
        calls.push({ op: 'captureConfig' });
        return { width: 181, __snapshot: true };
      },
    },
  };

  installStateApi(App as any);

  const buildState = (App.actions as any).builder.getBuildState({ modeOnly: true });
  const cfgSnap = (App.actions as any).config.captureSnapshot();
  const historyFromSurface = (App.actions as any).history.getSystem();

  assert.equal((buildState as AnyRecord).config.width, 180);
  assert.equal((cfgSnap as AnyRecord).width, 180);
  assert.equal((historyFromSurface as AnyRecord).id, 'svc');
  assert.equal(calls.length, 0);
});

test('[state-api] builder.getBuildState canonicalizes structural config slices against the live UI snapshot', () => {
  const sourceLower = [{ extDrawersCount: '3' }, null];
  const sourceCorner = {
    modulesConfiguration: [{ doors: '9', layout: 'drawers' }],
    stackSplitLower: { modulesConfiguration: [{ extDrawersCount: '4' }, null] },
  };
  const store = createStoreStub({
    ui: { doors: 5, singleDoorPos: 'right', structureSelect: '', raw: { doors: 5, singleDoorPos: 'right' } },
    config: {
      wardrobeType: 'hinged',
      modulesConfiguration: [{ doors: '9', layout: 'drawers' }, null],
      stackSplitLowerModulesConfiguration: sourceLower,
      cornerConfiguration: sourceCorner,
    },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = { actions: {}, store };

  installStateApi(App as any);

  const state = (App.actions as any).builder.getBuildState();

  assert.deepEqual(
    ((state as AnyRecord).config as AnyRecord).modulesConfiguration.map((entry: AnyRecord) => entry.doors),
    [2, 2, 1]
  );
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).stackSplitLowerModulesConfiguration[0].extDrawersCount,
    3
  );
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).stackSplitLowerModulesConfiguration[1].extDrawersCount,
    0
  );
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).cornerConfiguration.modulesConfiguration[0].doors,
    '9'
  );
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).cornerConfiguration.stackSplitLower.modulesConfiguration[1]
      .extDrawersCount,
    0
  );

  (sourceLower[0] as AnyRecord).extDrawersCount = 99;
  (sourceCorner.modulesConfiguration[0] as AnyRecord).doors = 44;
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).stackSplitLowerModulesConfiguration[0].extDrawersCount,
    3
  );
  assert.equal(
    ((state as AnyRecord).config as AnyRecord).cornerConfiguration.modulesConfiguration[0].doors,
    '9'
  );
});

test('[state-api] modules.replaceAll commits via actions.applyConfig -> dedicated config writer', () => {
  const committed: AnyRecord[] = [];
  const store = createStoreStub({
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = {
    actions: {},
    store: {
      ...store,
      setConfig: (patch: AnyRecord, meta?: AnyRecord) => (
        committed.push({ patch, meta }),
        (store as AnyRecord).setConfig(patch, meta)
      ),
    },
  };

  installStateApi(App as any);

  (App.actions as any).modules.replaceAll([{ id: 'm1' }], { source: 'test:modules' });

  assert.equal(committed.length, 1);
  assert.deepEqual(asRec(committed[0].patch), { modulesConfiguration: [{ id: 'm1' }] });
  assert.equal(asRec(committed[0].meta).source, 'test:modules');
});

test('[state-api] root actions.patch preserves multi-slice payloads through store.patch instead of falling through dedicated single-slice writers', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub({
    ui: { activeTab: 'design' },
    config: { isManualWidth: false },
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  });
  const App: AnyRecord = {
    actions: {},
    store: {
      ...store,
      patch: (payload: AnyRecord, meta?: AnyRecord) => {
        calls.push({ op: 'store.patch', payload, meta });
        return (store as AnyRecord).patch(payload, meta);
      },
      setConfig: (patch: AnyRecord, meta?: AnyRecord) => {
        calls.push({ op: 'store.setConfig', patch, meta });
        return (store as AnyRecord).setConfig(patch, meta);
      },
      setRuntime: (patch: AnyRecord, meta?: AnyRecord) => {
        calls.push({ op: 'store.setRuntime', patch, meta });
        return (store as AnyRecord).setRuntime(patch, meta);
      },
    },
  };

  installStateApi(App as any);

  const out = (App.actions as any).patch(
    { config: { isManualWidth: true }, runtime: { sketchMode: true } },
    { source: 'test:multi-slice' }
  );

  assert.deepEqual(out, { config: { isManualWidth: true }, runtime: { sketchMode: true } });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    op: 'store.patch',
    payload: { config: { isManualWidth: true }, runtime: { sketchMode: true } },
    meta: { source: 'test:multi-slice' },
  });
  assert.equal((App.store.getState() as AnyRecord).config.isManualWidth, true);
  assert.equal((App.store.getState() as AnyRecord).runtime.sketchMode, true);
});

test('[state-api] public mutation surfaces reject unknown keys and backend protocol metadata before store writes', () => {
  const calls: AnyRecord[] = [];
  const store = createStoreStub({
    ui: { activeTab: 'design', raw: { width: 200 } },
    config: { isManualWidth: false, handlesMap: { d1_full: 'bar' } },
    runtime: { sketchMode: false },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  });
  const App: AnyRecord = {
    actions: {},
    store: {
      ...store,
      patch(payload: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'patch', payload, meta });
        return store.patch(payload);
      },
      setUi(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'setUi', patch, meta });
        return store.setUi(patch, meta);
      },
      setRuntime(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'setRuntime', patch, meta });
        return store.setRuntime(patch, meta);
      },
      setModePatch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'setModePatch', patch, meta });
        return store.setModePatch(patch, meta);
      },
      setConfig(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'setConfig', patch, meta });
        return store.setConfig(patch, meta);
      },
    },
  };

  installStateApi(App as any);
  const actions = App.actions as any;

  assert.throws(() => actions.patch([]), /actions\.patch must be a plain object/);
  assert.throws(() => actions.patch(new Date()), /actions\.patch must be a plain object/);
  assert.throws(() => actions.patch({ mysterySlice: {} }), /rejects unknown key\(s\): mysterySlice/);
  assert.throws(() => actions.patch({ config: { width: 260 } }), /rejects unknown key\(s\): width/);
  assert.throws(
    () => actions.patch({ config: { __replace: { isManualWidth: true } } }),
    /rejects unknown key\(s\): __replace/
  );
  assert.throws(
    () => actions.patch({ config: { handlesMap: { d1_full: 'rail' } } }),
    /cannot write known config map branches \(handlesMap\)/
  );
  assert.throws(() => actions.patch({ ui: { __snapshot: true } }), /rejects unknown key\(s\): __snapshot/);
  assert.throws(() => actions.ui.patch({ imaginaryUiKey: true }), /rejects unknown key\(s\): imaginaryUiKey/);
  assert.throws(
    () => actions.ui.patch({ raw: { imaginaryDimension: 10 } }),
    /rejects unknown key\(s\): imaginaryDimension/
  );
  assert.throws(
    () => actions.ui.patch({ raw: { width: '260' } }),
    /raw\.width must be a finite number or null/
  );
  assert.throws(
    () => actions.runtime.patch({ imaginaryRuntimeFlag: true }),
    /rejects unknown key\(s\): imaginaryRuntimeFlag/
  );
  assert.throws(() => actions.mode.patch({ version: 2 }), /rejects unknown key\(s\): version/);
  assert.throws(() => actions.mode.patch({ opts: [] }), /mode\.patch\.opts must be a plain object/);
  assert.throws(() => actions.patch({ meta: { dirty: 'yes' } }), /meta\.dirty must be boolean/);

  assert.throws(() => actions.setCfgScalar('width', 260), /rejects unknown scalar key: width/);
  assert.throws(
    () => actions.ui.setScalar('imaginaryUiKey', true),
    /rejects unknown scalar key: imaginaryUiKey/
  );
  assert.throws(
    () => actions.ui.setRawScalar('structureSelect', 'custom'),
    /rejects unknown raw scalar key: structureSelect/
  );
  assert.throws(
    () => actions.runtime.setScalar('imaginaryRuntimeFlag', true),
    /rejects unknown scalar key: imaginaryRuntimeFlag/
  );

  assert.equal(calls.length, 0, 'rejected public writes must not reach any store writer');
  assert.equal(asRec(store.getState().config).isManualWidth, false);
  assert.equal(asRec(asRec(store.getState().ui).raw).width, 200);
  assert.equal(asRec(store.getState().runtime).sketchMode, false);
});
