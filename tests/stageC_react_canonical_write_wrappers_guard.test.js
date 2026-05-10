import test from 'node:test';
import assert from 'node:assert/strict';

import {
  setCfgCustomUploadedDataURL,
  setCfgHandlesMap,
  setCfgSavedNotes,
  setRuntimeGlobalClickMode,
  setRuntimeSketchMode,
  setUiActiveTab,
  setUiCurrentFloorType,
  setUiFlag,
  setUiShowContents,
  setUiShowHanger,
} from '../esm/native/ui/react/actions/store_actions.ts';

function createStoreState() {
  return {
    ui: {},
    config: {},
    runtime: {},
    mode: { primary: 'none', opts: {} },
    meta: {},
  };
}

function createStoreRecorder(state) {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];

  return {
    calls,
    store: {
      getState() {
        return state;
      },
      setUi(patch, meta) {
        calls.push({ op: 'store.setUi', patch, meta });
        Object.assign(state.ui, patch || {});
        return patch;
      },
      setConfig(patch, meta) {
        calls.push({ op: 'store.setConfig', patch, meta });
        Object.assign(state.config, patch || {});
        return patch;
      },
      setRuntime(patch, meta) {
        calls.push({ op: 'store.setRuntime', patch, meta });
        Object.assign(state.runtime, patch || {});
        return patch;
      },
      setMeta(patch, meta) {
        calls.push({ op: 'store.setMeta', patch, meta });
        Object.assign(state.meta, patch || {});
        return patch;
      },
      patch(payload, meta) {
        calls.push({ op: 'store.patch', payload, meta });
        if (payload && typeof payload === 'object') {
          if (payload.ui && typeof payload.ui === 'object') Object.assign(state.ui, payload.ui);
          if (payload.runtime && typeof payload.runtime === 'object')
            Object.assign(state.runtime, payload.runtime);
          if (payload.config && typeof payload.config === 'object')
            Object.assign(state.config, payload.config);
          if (payload.meta && typeof payload.meta === 'object') Object.assign(state.meta, payload.meta);
          if (payload.mode && typeof payload.mode === 'object') Object.assign(state.mode, payload.mode);
        }
        return payload;
      },
      subscribe() {
        return () => undefined;
      },
    },
  };
}

test('[stageC] react UI wrappers prefer semantic UI namespace methods when installed', () => {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];
  const App = {
    actions: {
      ui: {
        setActiveTab(next, meta) {
          calls.push({ op: 'ui.setActiveTab', next, meta });
        },
        setFlag(key, on, meta) {
          calls.push({ op: 'ui.setFlag', key, on, meta });
        },
        setShowContents(on, meta) {
          calls.push({ op: 'ui.setShowContents', on, meta });
        },
        setShowHanger(on, meta) {
          calls.push({ op: 'ui.setShowHanger', on, meta });
        },
        setCurrentFloorType(value, meta) {
          calls.push({ op: 'ui.setCurrentFloorType', value, meta });
        },
      },
    },
    store: createStoreRecorder(createStoreState()).store,
  };

  setUiActiveTab(App, 'render', { source: 'react:tab' });
  setUiFlag(App, 'notesEnabled', 'x', { source: 'react:flag' });
  setUiShowContents(App, 1, { source: 'react:contents' });
  setUiShowHanger(App, 0, { source: 'react:hanger' });
  setUiCurrentFloorType(App, 'oak', { source: 'react:floor' });

  assert.deepEqual(calls, [
    { op: 'ui.setActiveTab', next: 'render', meta: { source: 'react:tab' } },
    { op: 'ui.setFlag', key: 'notesEnabled', on: true, meta: { source: 'react:flag' } },
    { op: 'ui.setShowContents', on: true, meta: { source: 'react:contents' } },
    { op: 'ui.setShowHanger', on: false, meta: { source: 'react:hanger' } },
    { op: 'ui.setCurrentFloorType', value: 'oak', meta: { source: 'react:floor' } },
  ]);
});

test('[stageC] react UI/runtime wrappers use canonical slice writers with normalized patches', () => {
  const state = createStoreState();
  const { calls, store } = createStoreRecorder(state);
  const App = { actions: {}, store };

  setUiActiveTab(App, 'design', { source: 'react:tab' });
  setUiFlag(App, 'notesEnabled', 1, { source: 'react:flag' });
  setUiShowContents(App, true, { source: 'react:contents' });
  setUiShowHanger(App, true, { source: 'react:hanger' });
  setUiCurrentFloorType(App, 'tile', { source: 'react:floor' });
  setRuntimeGlobalClickMode(App, 'truthy', { source: 'react:globalClick' });
  setRuntimeSketchMode(App, 0, { source: 'react:sketchMode' });

  assert.deepEqual(state.ui, {
    activeTab: 'design',
    notesEnabled: true,
    showContents: false,
    showHanger: true,
    currentFloorType: 'tile',
  });
  assert.deepEqual(state.runtime, {
    globalClickMode: true,
    sketchMode: false,
  });

  assert.deepEqual(
    calls.map(call => ({ op: call.op, payload: call.payload ?? call.patch })),
    [
      { op: 'store.setUi', payload: { activeTab: 'design' } },
      { op: 'store.setUi', payload: { notesEnabled: true } },
      { op: 'store.setUi', payload: { showContents: true, showHanger: false } },
      { op: 'store.setUi', payload: { showHanger: true, showContents: false } },
      { op: 'store.setUi', payload: { currentFloorType: 'tile' } },
      { op: 'store.setRuntime', payload: { globalClickMode: true } },
      { op: 'store.setRuntime', payload: { sketchMode: false } },
    ]
  );
});

test('[stageC] react UI/runtime wrappers keep root store.patch fallback for minimal stores', () => {
  const state = createStoreState();
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];
  const App = {
    actions: {},
    store: {
      getState() {
        return state;
      },
      patch(payload, meta) {
        calls.push({ op: 'store.patch', payload, meta });
        if (payload && typeof payload === 'object') {
          if (payload.ui && typeof payload.ui === 'object') Object.assign(state.ui, payload.ui);
          if (payload.runtime && typeof payload.runtime === 'object')
            Object.assign(state.runtime, payload.runtime);
        }
        return payload;
      },
    },
  };

  setUiActiveTab(App, 'shop', { source: 'react:tab:minimal' });
  setRuntimeSketchMode(App, true, { source: 'react:sketchMode:minimal' });

  assert.deepEqual(state.ui, { activeTab: 'shop' });
  assert.deepEqual(state.runtime, { sketchMode: true });
  assert.deepEqual(
    calls.map(call => ({ op: call.op, payload: call.payload })),
    [
      { op: 'store.patch', payload: { ui: { activeTab: 'shop' } } },
      { op: 'store.patch', payload: { runtime: { sketchMode: true } } },
    ]
  );
});

test('[stageC] react config wrappers route through semantic config seams before generic scalar/map fallbacks', () => {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];
  const state = createStoreState();
  const { store } = createStoreRecorder(state);

  const App = {
    actions: {
      config: {
        setSavedNotes(next, meta) {
          calls.push({ op: 'config.setSavedNotes', next, meta });
        },
        setCustomUploadedDataURL(value, meta) {
          calls.push({ op: 'config.setCustomUploadedDataURL', value, meta });
        },
      },
    },
    store,
  };

  setCfgSavedNotes(App, [{ id: 'n1' }], { source: 'react:notes' });
  setCfgCustomUploadedDataURL(App, 'data:image/png;base64,abc', { source: 'react:texture' });

  assert.deepEqual(calls, [
    { op: 'config.setSavedNotes', next: [{ id: 'n1' }], meta: { source: 'react:notes' } },
    {
      op: 'config.setCustomUploadedDataURL',
      value: 'data:image/png;base64,abc',
      meta: { source: 'react:texture' },
    },
  ]);

  calls.length = 0;
  const fallbackApp = { actions: {}, store };
  setCfgHandlesMap(fallbackApp, { door_1: 'bar' }, { source: 'react:handles' });

  assert.deepEqual(state.config.handlesMap, { door_1: 'bar' });
  assert.deepEqual(calls, []);
});
