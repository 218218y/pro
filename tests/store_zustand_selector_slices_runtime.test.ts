import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store selector slices skip selectors outside the committed slice', () => {
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
  let uiListenerCalls = 0;
  store.subscribeSelector(
    state => {
      uiSelectorCalls += 1;
      return !!asRec(state.ui).panelOpen;
    },
    () => {
      uiListenerCalls += 1;
    },
    { slice: 'ui' }
  );

  let configSelectorCalls = 0;
  store.subscribeSelector(
    state => {
      configSelectorCalls += 1;
      return String(asRec(state.config).projectName || '');
    },
    () => undefined,
    { slice: 'config' }
  );

  let runtimeSelectorCalls = 0;
  store.subscribeSelector(
    state => {
      runtimeSelectorCalls += 1;
      return !!asRec(state.runtime).busy;
    },
    () => undefined,
    { slice: 'runtime' }
  );

  assert.equal(uiSelectorCalls, 1);
  assert.equal(configSelectorCalls, 1);
  assert.equal(runtimeSelectorCalls, 1);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { runtime: { busy: true } },
    meta: { source: 'test:selector-slices:runtime' },
  } as AnyRecord);

  assert.equal(uiSelectorCalls, 1, 'runtime-only commits should not evaluate ui selectors');
  assert.equal(configSelectorCalls, 1, 'runtime-only commits should not evaluate config selectors');
  assert.equal(runtimeSelectorCalls, 2, 'runtime selectors should evaluate for runtime commits');
  assert.equal(uiListenerCalls, 0);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { panelOpen: true } },
    meta: { source: 'test:selector-slices:ui' },
  } as AnyRecord);

  assert.equal(uiSelectorCalls, 2, 'ui selectors should evaluate for ui commits');
  assert.equal(configSelectorCalls, 1, 'ui-only commits should not evaluate config selectors');
  assert.equal(runtimeSelectorCalls, 2, 'ui-only commits should not evaluate runtime selectors');
  assert.equal(uiListenerCalls, 1, 'ui selector listener should still fire when its selected value changes');

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { projectName: 'after' } },
    meta: { source: 'test:selector-slices:config' },
  } as AnyRecord);

  assert.equal(uiSelectorCalls, 2, 'config-only commits should not evaluate ui selectors');
  assert.equal(configSelectorCalls, 2, 'config selectors should evaluate for config commits');
  assert.equal(runtimeSelectorCalls, 2, 'config-only commits should not evaluate runtime selectors');
});

test('store selector root/all subscriptions and legacy subscriptions remain broad', () => {
  const store = createStore({
    initialState: {
      ui: { legacyFlag: false },
      config: { projectName: 'before' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  let rootSelectorCalls = 0;
  let rootListenerCalls = 0;
  store.subscribeSelector(
    state => {
      rootSelectorCalls += 1;
      return Number(asRec(state.meta).version || 0);
    },
    () => {
      rootListenerCalls += 1;
    },
    { slice: 'root' }
  );

  let allSelectorCalls = 0;
  let allListenerCalls = 0;
  store.subscribeSelector(
    state => {
      allSelectorCalls += 1;
      return !!asRec(state.runtime).busy;
    },
    () => {
      allListenerCalls += 1;
    },
    { slice: 'all' }
  );

  let legacySelectorCalls = 0;
  let legacyListenerCalls = 0;
  store.subscribeSelector(
    state => {
      legacySelectorCalls += 1;
      return !!asRec(state.ui).legacyFlag;
    },
    () => {
      legacyListenerCalls += 1;
    }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { runtime: { busy: true } },
    meta: { source: 'test:selector-slices:broad-runtime' },
  } as AnyRecord);

  assert.equal(rootSelectorCalls, 2);
  assert.equal(rootListenerCalls, 1);
  assert.equal(allSelectorCalls, 2);
  assert.equal(allListenerCalls, 1);
  assert.equal(legacySelectorCalls, 2, 'subscriptions without slice should keep broad evaluation');
  assert.equal(legacyListenerCalls, 0);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { legacyFlag: true } },
    meta: { source: 'test:selector-slices:broad-ui' },
  } as AnyRecord);

  assert.equal(rootSelectorCalls, 3);
  assert.equal(rootListenerCalls, 2);
  assert.equal(allSelectorCalls, 3);
  assert.equal(allListenerCalls, 1);
  assert.equal(legacySelectorCalls, 3);
  assert.equal(legacyListenerCalls, 1, 'legacy no-slice selectors should still notify on selected changes');
});

test('store selector slices support multi-slice subscriptions', () => {
  const store = createStore({
    initialState: {
      ui: { lightingControl: false },
      config: { projectName: 'before' },
      runtime: { sketchMode: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });

  let selectorCalls = 0;
  let listenerCalls = 0;
  store.subscribeSelector(
    state => {
      selectorCalls += 1;
      return `${!!asRec(state.runtime).sketchMode}:${!!asRec(state.ui).lightingControl}`;
    },
    () => {
      listenerCalls += 1;
    },
    { slices: ['runtime', 'ui'] }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { projectName: 'after' } },
    meta: { source: 'test:selector-slices:multi-config' },
  } as AnyRecord);
  assert.equal(selectorCalls, 1, 'multi-slice selectors should skip unrelated config commits');
  assert.equal(listenerCalls, 0);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { runtime: { sketchMode: true } },
    meta: { source: 'test:selector-slices:multi-runtime' },
  } as AnyRecord);
  assert.equal(selectorCalls, 2);
  assert.equal(listenerCalls, 1);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { lightingControl: true } },
    meta: { source: 'test:selector-slices:multi-ui' },
  } as AnyRecord);
  assert.equal(selectorCalls, 3);
  assert.equal(listenerCalls, 2);
});

test('store selector slices reject invalid slice names with a clear error', () => {
  const store = createStore();
  const statsBefore = (store as AnyRecord).getDebugStats() as AnyRecord;

  assert.throws(() => {
    store.subscribeSelector(
      state => state.ui,
      () => undefined,
      { slice: 'invalid-slice' as never }
    );
  }, /\[WardrobePro\]\[store\] Invalid selector slice: invalid-slice/);

  const statsAfter = (store as AnyRecord).getDebugStats() as AnyRecord;
  assert.equal(statsAfter.selectorListenerCount, statsBefore.selectorListenerCount);
});
