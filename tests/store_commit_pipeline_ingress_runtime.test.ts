import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store commit pipeline: initial root ingress detaches mutable caller-owned values', () => {
  const source = {
    ui: { raw: { width: 180 }, panels: [{ id: 'ui-1', nested: { open: true } }] },
    config: { savedNotes: [{ text: 'keep', style: { left: '10px' } }] },
    runtime: { overlay: { open: true }, queue: [{ id: 'rt-1' }] },
    mode: { primary: 'edit', opts: { focus: { id: 'door-1' } } },
    meta: { dirty: false, version: 0, updatedAt: 0, tags: [{ id: 'meta-1' }] },
  } as AnyRecord;

  const store = createStore({ initialState: source });
  const state = store.getState();

  asRec(asRec(source.ui).raw).width = 999;
  (asRec(source.ui).panels as AnyRecord[])[0].nested = { open: false };
  (asRec(source.config).savedNotes as AnyRecord[])[0].text = 'mutated';
  asRec(asRec(source.runtime).overlay).open = false;
  (asRec(source.runtime).queue as AnyRecord[])[0].id = 'mutated';
  asRec(asRec(source.mode).opts).focus = { id: 'mutated' };
  (asRec(source.meta).tags as AnyRecord[])[0].id = 'mutated';

  assert.equal(asRec(asRec(state.ui).raw).width, 180);
  assert.equal(asRec((asRec(state.ui).panels as AnyRecord[])[0].nested).open, true);
  assert.equal((asRec(state.config).savedNotes as AnyRecord[])[0].text, 'keep');
  assert.equal(asRec(asRec(state.runtime).overlay).open, true);
  assert.equal((asRec(state.runtime).queue as AnyRecord[])[0].id, 'rt-1');
  assert.equal(asRec(asRec(asRec(state.mode).opts).focus).id, 'door-1');
  assert.equal((asRec(state.meta).tags as AnyRecord[])[0].id, 'meta-1');
});

test('store commit pipeline: UI-only structural input PATCH cannot silently rematerialize config', () => {
  const store = createStore({
    initialState: {
      ui: { structureSelect: '', singleDoorPos: '', raw: { doors: 4 } },
      config: {
        wardrobeType: 'hinged',
        isLibraryMode: false,
        modulesConfiguration: [{ doors: 2 }, { doors: 2 }],
      },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  const before = store.getState();
  const configBefore = before.config;
  const signatureBefore = (asRec(configBefore).modulesConfiguration as AnyRecord[]).map(entry =>
    Number(asRec(entry).doors)
  );
  let configSelectorCalls = 0;
  store.subscribeSelector(
    state => {
      configSelectorCalls += 1;
      return state.config;
    },
    () => undefined,
    { slice: 'config' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { raw: { doors: 5 } } },
    meta: {
      source: 'test:stage1:ui-only-structure',
      noBuild: true,
      noHistory: true,
      noAutosave: true,
      noPersist: true,
    },
  } as AnyRecord);

  const after = store.getState();
  const last = asRec(asRec(after.meta).lastAction);
  assert.equal(after.config, configBefore, 'UI-only PATCH must preserve the config slice reference');
  assert.deepEqual(
    (asRec(after.config).modulesConfiguration as AnyRecord[]).map(entry => Number(asRec(entry).doors)),
    signatureBefore,
    'UI-only PATCH must not derive persistent config behind the action contract'
  );
  assert.equal(last.affectsUi, true);
  assert.equal(last.affectsConfig, false);
  assert.equal(configSelectorCalls, 1, 'config selectors must not wake for a UI-only commit');
});

test('store commit pipeline: PATCH affects flags are derived from actual slice changes', () => {
  const store = createStore({
    initialState: {
      ui: { panelOpen: false },
      config: { projectName: 'before' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  let uiSelectorCalls = 0;
  let configSelectorCalls = 0;
  let runtimeSelectorCalls = 0;
  store.subscribeSelector(
    state => {
      uiSelectorCalls += 1;
      return asRec(state.ui).panelOpen;
    },
    () => undefined,
    { slice: 'ui' }
  );
  store.subscribeSelector(
    state => {
      configSelectorCalls += 1;
      return asRec(state.config).projectName;
    },
    () => undefined,
    { slice: 'config' }
  );
  store.subscribeSelector(
    state => {
      runtimeSelectorCalls += 1;
      return asRec(state.runtime).busy;
    },
    () => undefined,
    { slice: 'runtime' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      ui: { panelOpen: false },
      config: { projectName: 'before' },
      runtime: { busy: true },
    },
    meta: { source: 'test:stage1:actual-change-set', noPersist: true },
  } as AnyRecord);

  const last = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(last.affectsUi, false);
  assert.equal(last.affectsConfig, false);
  assert.equal(last.affectsRuntime, true);
  assert.equal(last.affectsMode, false);
  assert.equal(last.affectsMeta, false);
  assert.equal(uiSelectorCalls, 1, 'no-op UI payload must not wake UI selectors');
  assert.equal(configSelectorCalls, 1, 'no-op config payload must not wake config selectors');
  assert.equal(runtimeSelectorCalls, 2, 'changed runtime payload must wake runtime selectors');
});

test('store commit pipeline: internal PATCH writers detach new mutable payload branches without root normalization', () => {
  const store = createStore({
    initialState: {
      ui: {},
      config: {},
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  const payload = {
    ui: { panel: { nested: { open: true } }, items: [{ id: 'ui-1', data: { x: 1 } }] },
    config: {
      savedNotes: [{ text: 'note', style: { left: '12px' } }],
      customPatchState: { nested: { value: 7 } },
    },
    runtime: { overlay: { open: true }, queue: [{ id: 'rt-1', data: { y: 2 } }] },
    mode: { primary: 'edit', opts: { focus: { id: 'door-1' } } },
  } as AnyRecord;

  dispatchCompat(store, {
    type: 'PATCH',
    payload,
    meta: { source: 'test:stage1:patch-detach', noPersist: true },
  } as AnyRecord);
  const state = store.getState();

  asRec(asRec(payload.ui).panel).nested = { open: false };
  asRec((asRec(payload.ui).items as AnyRecord[])[0].data).x = 99;
  (asRec(payload.config).savedNotes as AnyRecord[])[0].text = 'mutated';
  asRec(asRec(asRec(payload.config).customPatchState).nested).value = 99;
  asRec(asRec(payload.runtime).overlay).open = false;
  asRec((asRec(payload.runtime).queue as AnyRecord[])[0].data).y = 99;
  asRec(asRec(payload.mode).opts).focus = { id: 'mutated' };

  assert.equal(asRec(asRec(asRec(state.ui).panel).nested).open, true);
  assert.equal(asRec((asRec(state.ui).items as AnyRecord[])[0].data).x, 1);
  assert.equal((asRec(state.config).savedNotes as AnyRecord[])[0].text, 'note');
  assert.equal(asRec(asRec(asRec(state.config).customPatchState).nested).value, 7);
  assert.equal(asRec(asRec(state.runtime).overlay).open, true);
  assert.equal(asRec((asRec(state.runtime).queue as AnyRecord[])[0].data).y, 2);
  assert.equal(asRec(asRec(asRec(state.mode).opts).focus).id, 'door-1');
});

test('store commit pipeline: forced semantic no-op PATCH commits metadata without false slice invalidation', () => {
  const store = createStore({
    initialState: {
      ui: {},
      config: { projectName: 'same' },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 2, updatedAt: 100 },
    },
  });

  let configSelectorCalls = 0;
  store.subscribeSelector(
    state => {
      configSelectorCalls += 1;
      return asRec(state.config).projectName;
    },
    () => undefined,
    { slice: 'config' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { projectName: 'same' } },
    meta: { source: 'test:stage1:forced-noop', forceBuild: true, noPersist: true },
  } as AnyRecord);

  const last = asRec(asRec(store.getState().meta).lastAction);
  assert.equal(last.forceBuild, true);
  assert.equal(last.affectsConfig, false);
  assert.equal(configSelectorCalls, 1, 'forced no-op must not fake a config invalidation');
});
