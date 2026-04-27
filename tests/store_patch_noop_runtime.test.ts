import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store parity: repeated semantic config __snapshot PATCH is suppressed as a no-op', () => {
  const store = createStore({
    initialState: {
      ui: { selectedTab: 'design' },
      config: { wardrobeType: 'sliding', nested: { keep: true }, savedNotes: [{ text: 'keep' }] },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 4, updatedAt: 1234 },
    },
  });

  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  const before = store.getState();
  const debugBefore = (store as AnyRecord).getDebugStats();

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: {
        __snapshot: true,
        wardrobeType: 'sliding',
        nested: { keep: true },
        savedNotes: [{ text: 'keep' }],
      },
    },
    meta: { source: 'test:patch:config-snapshot:no-op', noHistory: true, noAutosave: true, noPersist: true },
  } as AnyRecord);

  const after = store.getState();
  const debugAfter = (store as AnyRecord).getDebugStats();
  assert.equal(after, before, 'semantic no-op config snapshot patch should preserve root reference');
  assert.equal(notifyCount, 0, 'semantic no-op config snapshot patch should not notify');
  assert.equal(
    asRec(after.meta).version,
    4,
    'semantic no-op config snapshot patch should not restamp version'
  );
  assert.equal(
    debugAfter.commitCount,
    debugBefore.commitCount,
    'semantic no-op config snapshot patch should not commit'
  );
  assert.equal(
    debugAfter.noopSkipCount,
    debugBefore.noopSkipCount + 1,
    'semantic no-op config snapshot patch should count as noop skip'
  );
});

test('store parity: repeated semantic ui __snapshot PATCH is suppressed as a no-op', () => {
  const store = createStore({
    initialState: {
      ui: {
        __snapshot: true,
        selectedTab: 'render',
        raw: { width: 220, doors: 4 },
      },
      config: {},
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 7, updatedAt: 4321 },
    },
  });

  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  const before = store.getState();
  const debugBefore = (store as AnyRecord).getDebugStats();

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      ui: {
        __snapshot: true,
        selectedTab: 'render',
        raw: { width: 220, doors: 4 },
      },
    },
    meta: {
      source: 'test:patch:ui-snapshot:no-op',
      noBuild: true,
      noHistory: true,
      noAutosave: true,
      noPersist: true,
    },
  } as AnyRecord);

  const after = store.getState();
  const debugAfter = (store as AnyRecord).getDebugStats();
  assert.equal(after, before, 'semantic no-op ui snapshot patch should preserve root reference');
  assert.equal(notifyCount, 0, 'semantic no-op ui snapshot patch should not notify');
  assert.equal(asRec(after.meta).version, 7, 'semantic no-op ui snapshot patch should not restamp version');
  assert.equal(
    debugAfter.commitCount,
    debugBefore.commitCount,
    'semantic no-op ui snapshot patch should not commit'
  );
  assert.equal(
    debugAfter.noopSkipCount,
    debugBefore.noopSkipCount + 1,
    'semantic no-op ui snapshot patch should count as noop skip'
  );
});

test('store parity: forceBuild PATCH bypasses semantic no-op suppression', () => {
  const store = createStore({
    initialState: {
      ui: { selectedTab: 'design' },
      config: { wardrobeType: 'sliding' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 2, updatedAt: 111 },
    },
  });

  let notifyCount = 0;
  store.subscribe((_st, actionMeta) => {
    notifyCount += 1;
    assert.equal(asRec(actionMeta).source, 'test:patch:force');
  });

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: { wardrobeType: 'sliding' },
    },
    meta: { source: 'test:patch:force', forceBuild: true },
  } as AnyRecord);

  const st = store.getState();
  const lastAction = asRec(asRec(st.meta).lastAction);
  assert.equal(notifyCount, 1, 'forceBuild patch should still notify');
  assert.equal(lastAction.type, 'PATCH');
  assert.equal(lastAction.source, 'test:patch:force');
  assert.equal(lastAction.forceBuild, true);
});

test('store parity: persisted semantic no-op config PATCH stays clean and skips commit', () => {
  const store = createStore({
    initialState: {
      ui: { selectedTab: 'design' },
      config: { wardrobeType: 'sliding', layout: { width: 180 } },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false, version: 5, updatedAt: 9876 },
    },
  });

  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  const before = store.getState();
  const debugBefore = (store as AnyRecord).getDebugStats();

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: { wardrobeType: 'sliding', layout: { width: 180 } },
    },
    meta: { source: 'test:patch:config:no-op:dirty-guard' },
  } as AnyRecord);

  const after = store.getState();
  const debugAfter = (store as AnyRecord).getDebugStats();

  assert.equal(after, before, 'persisted semantic no-op config patch should preserve root reference');
  assert.equal(notifyCount, 0, 'persisted semantic no-op config patch should not notify');
  assert.equal(asRec(after.meta).dirty, false, 'persisted semantic no-op config patch should stay clean');
  assert.equal(
    asRec(after.meta).version,
    5,
    'persisted semantic no-op config patch should not restamp version'
  );
  assert.equal(
    debugAfter.commitCount,
    debugBefore.commitCount,
    'persisted semantic no-op config patch should not commit'
  );
  assert.equal(
    debugAfter.noopSkipCount,
    debugBefore.noopSkipCount + 1,
    'persisted semantic no-op config patch should count as noop skip'
  );
});
