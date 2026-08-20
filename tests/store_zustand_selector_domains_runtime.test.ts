import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

function createDomainTestStore() {
  return createStore({
    initialState: {
      ui: {
        activeTab: 'structure',
        width: '180',
        darkMode: false,
        raw: { width: '180', cellDimsWidth: '' },
      },
      config: { savedNotes: [], savedColors: [] },
      runtime: { sketchMode: false, paintColor: null, systemReady: true },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 0, updatedAt: 0 },
    },
  });
}

test('selector domains filter same-slice changes before selector evaluation', () => {
  const store = createDomainTestStore();
  let navigationEvaluations = 0;
  let appearanceEvaluations = 0;

  store.subscribeSelector(
    state => {
      navigationEvaluations += 1;
      return String(asRec(state.ui).activeTab || '');
    },
    () => undefined,
    { slice: 'ui', domain: 'navigation' }
  );
  store.subscribeSelector(
    state => {
      appearanceEvaluations += 1;
      return !!asRec(state.ui).darkMode;
    },
    () => undefined,
    { slice: 'ui', domain: 'appearance' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { activeTab: 'design' } },
    meta: { source: 'test:selector-domain:navigation' },
  } as AnyRecord);

  assert.equal(navigationEvaluations, 2);
  assert.equal(appearanceEvaluations, 1, 'same-slice unrelated domains must be filtered before evaluation');
  const stats = (store as AnyRecord).getDebugStats() as AnyRecord;
  assert.equal(stats.selectorFilteredCount, 1);
  assert.equal(stats.selectorEvaluationCount, 1);
});

test('selector slice and domain hints compose with AND while multi-domain hints compose with OR', () => {
  const store = createDomainTestStore();
  let impossibleCalls = 0;
  let multiDomainCalls = 0;

  store.subscribeSelector(
    state => {
      impossibleCalls += 1;
      return asRec(state.ui).activeTab;
    },
    () => undefined,
    { slice: 'config', domain: 'navigation' }
  );
  store.subscribeSelector(
    state => {
      multiDomainCalls += 1;
      return `${String(asRec(state.ui).activeTab)}:${String(asRec(state.ui).width)}`;
    },
    () => undefined,
    { slice: 'ui', domains: ['navigation', 'structure'] }
  );

  dispatchCompat(store, { type: 'PATCH', payload: { ui: { width: '190' } } } as AnyRecord);
  assert.equal(impossibleCalls, 1, 'domain matches must not bypass an unrelated slice hint');
  assert.equal(multiDomainCalls, 2, 'any matching domain should admit a multi-domain selector');
});

test('ui.raw nested keys retain precise structure/interior domain classification', () => {
  const store = createDomainTestStore();
  let structureCalls = 0;
  let interiorCalls = 0;

  store.subscribeSelector(
    state => {
      structureCalls += 1;
      return asRec(asRec(state.ui).raw).width;
    },
    () => undefined,
    { slice: 'ui', domain: 'structure' }
  );
  store.subscribeSelector(
    state => {
      interiorCalls += 1;
      return asRec(asRec(state.ui).raw).cellDimsWidth;
    },
    () => undefined,
    { slice: 'ui', domain: 'interior' }
  );

  dispatchCompat(store, { type: 'PATCH', payload: { ui: { raw: { width: '200' } } } } as AnyRecord);
  assert.equal(structureCalls, 2);
  assert.equal(interiorCalls, 1);

  dispatchCompat(store, { type: 'PATCH', payload: { ui: { raw: { cellDimsWidth: '55' } } } } as AnyRecord);
  assert.equal(structureCalls, 3, 'cell dimensions intentionally affect structural geometry too');
  assert.equal(interiorCalls, 2);
});

test('cell-dimension panel disclosure notifies its structure and interior consumers', () => {
  const store = createDomainTestStore();
  let structureCalls = 0;
  let interiorCalls = 0;
  let navigationCalls = 0;

  store.subscribeSelector(
    state => {
      structureCalls += 1;
      return !!asRec(state.ui).cellDimsPanelOpen;
    },
    () => undefined,
    { slice: 'ui', domain: 'structure' }
  );
  store.subscribeSelector(
    state => {
      interiorCalls += 1;
      return !!asRec(state.ui).cellDimsHexPanelOpen;
    },
    () => undefined,
    { slice: 'ui', domain: 'interior' }
  );
  store.subscribeSelector(
    state => {
      navigationCalls += 1;
      return String(asRec(state.ui).activeTab || '');
    },
    () => undefined,
    { slice: 'ui', domain: 'navigation' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { cellDimsPanelOpen: true, cellDimsHexPanelOpen: true } },
  } as AnyRecord);

  assert.equal(structureCalls, 2);
  assert.equal(interiorCalls, 2);
  assert.equal(navigationCalls, 1);
});

test('SET uses semantic domain classification instead of broad selector invalidation', () => {
  const store = createDomainTestStore();
  let navigationCalls = 0;
  let structureCalls = 0;

  store.subscribeSelector(
    state => {
      navigationCalls += 1;
      return asRec(state.ui).activeTab;
    },
    () => undefined,
    { slice: 'ui', domain: 'navigation' }
  );
  store.subscribeSelector(
    state => {
      structureCalls += 1;
      return asRec(state.ui).width;
    },
    () => undefined,
    { slice: 'ui', domain: 'structure' }
  );

  const current = store.getState();
  dispatchCompat(store, {
    type: 'SET',
    payload: {
      ...current,
      ui: { ...current.ui, width: '205', raw: { ...current.ui.raw, width: '205' } },
    },
    meta: { source: 'test:selector-domain:set' },
  } as AnyRecord);

  assert.equal(navigationCalls, 1, 'semantic SET should not wake unrelated navigation selectors');
  assert.equal(structureCalls, 2);
});

test('commit meta stamps remain observable without changing semantic affectsMeta', () => {
  const store = createDomainTestStore();
  let metaCalls = 0;
  let observedAffectsMeta: unknown = null;

  store.subscribeSelector(
    state => {
      metaCalls += 1;
      return Number(asRec(state.meta).version || 0);
    },
    (_next, _previous, actionMeta) => {
      observedAffectsMeta = asRec(actionMeta).affectsMeta;
    },
    { slice: 'meta', domain: 'meta' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { ui: { activeTab: 'design' } },
    meta: { source: 'test:selector-domain:meta-stamp' },
  } as AnyRecord);

  assert.equal(metaCalls, 2, 'commit stamps should remain observable by meta selectors');
  assert.equal(observedAffectsMeta, false, 'affectsMeta must continue to describe the caller mutation');
});

test('selector domains reject invalid names before registration', () => {
  const store = createDomainTestStore();
  const before = (store as AnyRecord).getDebugStats() as AnyRecord;

  assert.throws(
    () =>
      store.subscribeSelector(
        state => state.ui,
        () => undefined,
        {
          domain: 'future-domain' as never,
        }
      ),
    /\[WardrobePro\]\[store\] Invalid selector domain: future-domain/
  );

  const after = (store as AnyRecord).getDebugStats() as AnyRecord;
  assert.equal(after.selectorListenerCount, before.selectorListenerCount);
});

test('unknown future state keys fall back to broad invalidation instead of missing updates', () => {
  const store = createDomainTestStore();
  let appearanceCalls = 0;

  store.subscribeSelector(
    state => {
      appearanceCalls += 1;
      return asRec(state.runtime).paintColor;
    },
    () => undefined,
    { slice: 'runtime', domain: 'appearance' }
  );

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { runtime: { futureUnclassifiedRuntimeField: 1 } },
    meta: { source: 'test:selector-domain:future-field' },
  } as AnyRecord);

  assert.equal(
    appearanceCalls,
    2,
    'unclassified fields must conservatively evaluate domain selectors until the field is classified'
  );
});
