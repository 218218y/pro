import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store parity: SET canonicalizes root shape and keeps mode/meta defaults', () => {
  const store = createStore({
    initialState: {
      ui: { keep: 1 },
      config: { before: true },
      runtime: { before: true },
      mode: { primary: 'edit', opts: { x: 1 } },
      meta: { dirty: true, version: 3, updatedAt: 123 },
    },
    getNoneMode: () => 'none_mode',
  });

  dispatchCompat(store, {
    type: 'SET',
    payload: {
      ui: { next: 1 },
      config: { next: 2 },
      runtime: { next: 3 },
      mode: {},
      meta: { dirty: false },
    },
    meta: { source: 'test:set' },
  } as AnyRecord);

  const st = store.getState();
  const mode = asRec(st.mode);
  const meta = asRec(st.meta);
  const lastAction = asRec(meta.lastAction);

  assert.equal(mode.primary, 'none_mode');
  assert.deepEqual(asRec(mode.opts), {});
  assert.equal(meta.dirty, false);
  assert.equal(typeof meta.version, 'number');
  assert.equal(meta.version, 1, 'SET should restamp from normalized meta defaults');
  assert.equal(typeof meta.updatedAt, 'number');
  assert.equal(lastAction.type, 'SET');
  assert.equal(lastAction.source, 'test:set');
  assert.equal(lastAction.affectsUi, true);
  assert.equal(lastAction.affectsConfig, true);
  assert.equal(lastAction.affectsRuntime, true);
  assert.equal(lastAction.affectsMode, true);
  assert.equal(lastAction.affectsMeta, true);
});

test('store parity: repeated semantic SET payload is suppressed as a no-op', () => {
  const initial = {
    ui: { tab: 'design', raw: { width: 220 } },
    config: { wardrobeType: 'sliding', savedNotes: [{ text: 'keep' }] },
    runtime: { busy: false },
    mode: { primary: 'notes', opts: { focus: 'note-1' } },
    meta: { dirty: true, version: 5, updatedAt: 123456, lastAction: { type: 'PATCH', source: 'seed' } },
  } as AnyRecord;

  const store = createStore({ initialState: initial });
  let notifyCount = 0;
  store.subscribe(() => {
    notifyCount += 1;
  });

  const before = store.getState();
  const debugBefore = (store as AnyRecord).getDebugStats();

  dispatchCompat(store, {
    type: 'SET',
    payload: {
      ui: { tab: 'design', raw: { width: 220 } },
      config: { wardrobeType: 'sliding', savedNotes: [{ text: 'keep' }] },
      runtime: { busy: false },
      mode: { primary: 'notes', opts: { focus: 'note-1' } },
      meta: { dirty: true },
    },
    meta: { source: 'test:set:no-op' },
  } as AnyRecord);

  const after = store.getState();
  const debugAfter = (store as AnyRecord).getDebugStats();

  assert.equal(after, before, 'semantic no-op SET should preserve root reference');
  assert.equal(notifyCount, 0, 'semantic no-op SET should not notify listeners');
  assert.equal(asRec(after.meta).version, 5, 'semantic no-op SET should not restamp version');
  assert.equal(debugAfter.commitCount, debugBefore.commitCount, 'semantic no-op SET should not commit');
  assert.equal(
    debugAfter.noopSkipCount,
    debugBefore.noopSkipCount + 1,
    'semantic no-op SET should count as noop skip'
  );
});

test('store parity: forceBuild SET bypasses semantic no-op suppression', () => {
  const initial = {
    ui: { tab: 'design' },
    config: { wardrobeType: 'sliding' },
    runtime: { busy: false },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false, version: 2, updatedAt: 111 },
  } as AnyRecord;

  const store = createStore({ initialState: initial });
  let notifyCount = 0;
  store.subscribe((_st, actionMeta) => {
    notifyCount += 1;
    assert.equal(asRec(actionMeta).source, 'test:set:force');
  });

  dispatchCompat(store, {
    type: 'SET',
    payload: {
      ui: { tab: 'design' },
      config: { wardrobeType: 'sliding' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
    meta: { source: 'test:set:force', forceBuild: true },
  } as AnyRecord);

  const st = store.getState();
  const lastAction = asRec(asRec(st.meta).lastAction);
  assert.equal(notifyCount, 1, 'forceBuild SET should still notify');
  assert.equal(
    asRec(st.meta).version,
    1,
    'forceBuild SET should still restamp version from canonical SET defaults'
  );
  assert.equal(lastAction.type, 'SET');
  assert.equal(lastAction.source, 'test:set:force');
  assert.equal(lastAction.forceBuild, true);
});

test('store parity: project-load style SET restores snapshot slices after UI toggles', () => {
  const store = createStore();

  const projectSnapshot = {
    ui: { raw: { width: 180 }, selectedTab: 'structure' },
    config: { wardrobeType: 'hinged', modulesConfiguration: [{ id: 1 }] },
    runtime: { busy: false },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  };

  dispatchCompat(store, {
    type: 'SET',
    payload: projectSnapshot,
    meta: { source: 'test:project-load' },
  } as AnyRecord);

  (store as unknown as { setUi: (p: unknown, m?: unknown) => void }).setUi(
    { selectedTab: 'design' },
    {
      source: 'test:ui-toggle',
    }
  );

  let st = store.getState();
  assert.equal(asRec(st.ui).selectedTab, 'design');

  dispatchCompat(store, {
    type: 'SET',
    payload: projectSnapshot,
    meta: { source: 'test:undo-restore' },
  } as AnyRecord);
  st = store.getState();
  assert.equal(asRec(st.ui).selectedTab, 'structure');
  assert.equal(asRec(asRec(st.ui).raw).width, 180);
  assert.equal(asRec(st.config).wardrobeType, 'hinged');

  const last = asRec(asRec(st.meta).lastAction);
  assert.equal(last.type, 'SET');
  assert.equal(last.source, 'test:undo-restore');
});

test('store parity: undo/redo roundtrip restores prior snapshot cleanly after UI/config toggles', () => {
  const store = createStore();

  const snapA = {
    ui: { selectedTab: 'structure', raw: { width: 160, doors: 4 } },
    config: { wardrobeType: 'hinged', isLibraryMode: false },
    runtime: { busy: false },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  } as AnyRecord;

  const snapB = {
    ui: { selectedTab: 'design', raw: { width: 220, doors: 6 } },
    config: { wardrobeType: 'sliding', isLibraryMode: true },
    runtime: { busy: false },
    mode: { primary: 'groove', opts: { source: 'ui' } },
    meta: { dirty: true },
  } as AnyRecord;

  dispatchCompat(store, { type: 'SET', payload: snapA, meta: { source: 'test:load:A' } } as AnyRecord);
  (store as unknown as { setUi: (p: unknown, m?: unknown) => void }).setUi({ selectedTab: 'render' }, {
    source: 'test:ui-toggle',
    noBuild: true,
  } as AnyRecord);
  (store as unknown as { setConfig: (p: unknown, m?: unknown) => void }).setConfig({ isLibraryMode: true }, {
    source: 'test:cfg-toggle',
  } as AnyRecord);

  dispatchCompat(store, { type: 'SET', payload: snapB, meta: { source: 'test:redo' } } as AnyRecord);
  let st = store.getState();
  assert.equal(asRec(st.ui).selectedTab, 'design');
  assert.equal(asRec(asRec(st.ui).raw).width, 220);
  assert.equal(asRec(st.config).wardrobeType, 'sliding');
  assert.equal(asRec(st.mode).primary, 'groove');

  dispatchCompat(store, { type: 'SET', payload: snapA, meta: { source: 'test:undo' } } as AnyRecord);
  st = store.getState();
  assert.equal(asRec(st.ui).selectedTab, 'structure');
  assert.equal(asRec(asRec(st.ui).raw).width, 160);
  assert.equal(asRec(asRec(st.ui).raw).doors, 4);
  assert.equal(asRec(st.config).wardrobeType, 'hinged');
  assert.equal(asRec(st.config).isLibraryMode, false);
  assert.equal(asRec(st.mode).primary, 'none');
  assert.equal(asRec(st.meta).dirty, false);

  const last = asRec(asRec(st.meta).lastAction);
  assert.equal(last.type, 'SET');
  assert.equal(last.source, 'test:undo');
});
