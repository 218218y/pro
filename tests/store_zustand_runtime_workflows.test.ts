import test from 'node:test';
import assert from 'node:assert/strict';

import { AnyRecord, asRec, createStore, dispatchCompat } from './store_zustand_parity_helpers.ts';

test('store parity: import-style config __snapshot replaces config atomically and preserves non-config slice sharing', () => {
  const store = createStore({
    initialState: {
      ui: { panelOpen: true },
      config: { a: 1, nested: { keep: true }, oldOnly: 'x' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
    },
  });

  const s1 = store.getState();
  const ui1 = s1.ui;
  const rt1 = s1.runtime;
  const mode1 = s1.mode;

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: {
        __snapshot: true,
        a: 2,
        nested: { imported: 1 },
        importedOnly: 'yes',
      },
    },
    meta: {
      source: 'test:import-config',
      noHistory: true,
      noAutosave: true,
      noPersist: true,
    },
  } as AnyRecord);

  const s2 = store.getState();
  const cfg = asRec(s2.config);
  assert.equal(cfg.a, 2);
  assert.deepEqual(asRec(cfg.nested), { imported: 1 });
  assert.equal(cfg.importedOnly, 'yes');
  assert.equal('oldOnly' in cfg, false);
  assert.equal(Array.isArray(cfg.modulesConfiguration), true);
  assert.equal(Array.isArray(cfg.stackSplitLowerModulesConfiguration), true);
  assert.equal(typeof cfg.cornerConfiguration, 'object');
  assert.equal(s2.ui, ui1);
  assert.equal(s2.runtime, rt1);
  assert.equal(s2.mode, mode1);

  const last = asRec(asRec(s2.meta).lastAction);
  assert.equal(last.type, 'PATCH');
  assert.equal(last.source, 'test:import-config');
  assert.equal(last.affectsConfig, true);
  assert.equal(last.noHistory, true);
  assert.equal(last.noAutosave, true);
  assert.equal(last.noPersist, true);
});

test('runtime parity: texture custom-upload style config writes preserve metadata and clear correctly', () => {
  const store = createStore({
    initialState: {
      config: { customUploadedDataURL: null, selectedTexture: 'oak' },
      ui: { selectedTab: 'design' },
      runtime: { busy: false },
      mode: { primary: 'none', opts: {} },
    },
  });

  const before = store.getState();
  const uiBefore = before.ui;
  const rtBefore = before.runtime;
  const modeBefore = before.mode;

  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: {
        customUploadedDataURL: 'data:image/png;base64,AAAA',
      },
    },
    meta: {
      source: 'runtime:texture-custom-upload',
      noHistory: true,
      noAutosave: true,
    },
  } as AnyRecord);

  let st = store.getState();
  assert.equal(asRec(st.config).customUploadedDataURL, 'data:image/png;base64,AAAA');
  assert.equal(st.ui, uiBefore);
  assert.equal(st.runtime, rtBefore);
  assert.equal(st.mode, modeBefore);
  let last = asRec(asRec(st.meta).lastAction);
  assert.equal(last.source, 'runtime:texture-custom-upload');
  assert.equal(last.affectsConfig, true);
  assert.equal(last.noHistory, true);
  assert.equal(last.noAutosave, true);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { customUploadedDataURL: null } },
    meta: { source: 'runtime:texture-custom-upload:clear', noHistory: true, noAutosave: true },
  } as AnyRecord);

  st = store.getState();
  assert.equal(asRec(st.config).customUploadedDataURL, null);
  last = asRec(asRec(st.meta).lastAction);
  assert.equal(last.source, 'runtime:texture-custom-upload:clear');
});

test('runtime parity: notes save-load restore/clear updates savedNotes without touching other slices', () => {
  const store = createStore({
    initialState: {
      ui: { selectedTab: 'notes' },
      config: { savedNotes: [{ text: 'old' }], wardrobeType: 'hinged' },
      runtime: { busy: false },
      mode: { primary: 'notes', opts: {} },
    },
  });

  const s1 = store.getState();
  const ui1 = s1.ui;
  const rt1 = s1.runtime;
  const mode1 = s1.mode;

  const restoredNotes = [
    { text: '<b>Hello</b>', style: { left: '10px', top: '20px' }, doorsOpen: false },
    { text: 'Second note', style: { width: '120px' }, doorsOpen: true },
  ];

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { savedNotes: restoredNotes } },
    meta: {
      source: 'notes:restore',
      immediate: true,
      noBuild: true,
      noHistory: true,
    },
  } as AnyRecord);

  let s2 = store.getState();
  assert.deepEqual(asRec(s2.config).savedNotes, restoredNotes);
  assert.equal(s2.ui, ui1);
  assert.equal(s2.runtime, rt1);
  assert.equal(s2.mode, mode1);
  let last = asRec(asRec(s2.meta).lastAction);
  assert.equal(last.source, 'notes:restore');
  assert.equal(last.immediate, true);
  assert.equal(last.noBuild, true);
  assert.equal(last.noHistory, true);
  assert.equal(last.affectsConfig, true);

  dispatchCompat(store, {
    type: 'PATCH',
    payload: { config: { savedNotes: [] } },
    meta: {
      source: 'notes:clear',
      immediate: true,
      noBuild: true,
      noHistory: true,
    },
  } as AnyRecord);

  s2 = store.getState();
  assert.deepEqual(asRec(s2.config).savedNotes, []);
  last = asRec(asRec(s2.meta).lastAction);
  assert.equal(last.source, 'notes:clear');
});

test('runtime parity: combined import-load and undo-redo sequence remains deterministic after texture+notes writes', () => {
  const store = createStore();

  const snapA = {
    ui: { selectedTab: 'design', raw: { width: 160 } },
    config: { wardrobeType: 'hinged', customUploadedDataURL: null, savedNotes: [] },
    runtime: { busy: false },
    mode: { primary: 'none', opts: {} },
    meta: { dirty: false },
  } as AnyRecord;

  const snapB = {
    ui: { selectedTab: 'notes', raw: { width: 220 } },
    config: {
      wardrobeType: 'sliding',
      customUploadedDataURL: 'data:image/png;base64,BBBB',
      savedNotes: [{ text: 'loaded' }],
    },
    runtime: { busy: false },
    mode: { primary: 'notes', opts: {} },
    meta: { dirty: true },
  } as AnyRecord;

  dispatchCompat(store, { type: 'SET', payload: snapA, meta: { source: 'runtime:load:A' } } as AnyRecord);
  dispatchCompat(store, {
    type: 'PATCH',
    payload: {
      config: {
        customUploadedDataURL: 'data:image/png;base64,TEMP',
        savedNotes: [{ text: 'temp' }],
      },
    },
    meta: { source: 'runtime:edit:temp', noHistory: true, noAutosave: true },
  } as AnyRecord);

  dispatchCompat(store, {
    type: 'SET',
    payload: snapB,
    meta: { source: 'runtime:import-load' },
  } as AnyRecord);
  let st = store.getState();
  assert.equal(asRec(st.config).wardrobeType, 'sliding');
  assert.equal(asRec(st.config).customUploadedDataURL, 'data:image/png;base64,BBBB');
  assert.deepEqual(asRec(st.config).savedNotes, [{ text: 'loaded' }]);
  assert.equal(asRec(st.ui).selectedTab, 'notes');

  dispatchCompat(store, { type: 'SET', payload: snapA, meta: { source: 'runtime:undo' } } as AnyRecord);
  st = store.getState();
  assert.equal(asRec(st.config).wardrobeType, 'hinged');
  assert.equal(asRec(st.config).customUploadedDataURL, null);
  assert.deepEqual(asRec(st.config).savedNotes, []);
  assert.equal(asRec(st.ui).selectedTab, 'design');

  dispatchCompat(store, { type: 'SET', payload: snapB, meta: { source: 'runtime:redo' } } as AnyRecord);
  st = store.getState();
  assert.equal(asRec(st.config).wardrobeType, 'sliding');
  assert.equal(asRec(st.config).customUploadedDataURL, 'data:image/png;base64,BBBB');
  assert.deepEqual(asRec(st.config).savedNotes, [{ text: 'loaded' }]);

  const last = asRec(asRec(st.meta).lastAction);
  assert.equal(last.type, 'SET');
  assert.equal(last.source, 'runtime:redo');
});
