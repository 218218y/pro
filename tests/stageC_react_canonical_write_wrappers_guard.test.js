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
  setUiDarkMode,
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

function createCanonicalActionsRecorder(state) {
  /** @type {Array<Record<string, unknown>>} */
  const calls = [];

  return {
    calls,
    actions: {
      ui: {
        patch(patch, meta) {
          calls.push({ op: 'actions.ui.patch', patch, meta });
          Object.assign(state.ui, patch || {});
          return patch;
        },
        patchSoft(patch, meta) {
          calls.push({ op: 'actions.ui.patchSoft', patch, meta });
          Object.assign(state.ui, patch || {});
          return patch;
        },
        setScalar(key, value, meta) {
          calls.push({ op: 'actions.ui.setScalar', key, value, meta });
          state.ui[key] = value;
          return value;
        },
        setScalarSoft(key, value, meta) {
          calls.push({ op: 'actions.ui.setScalarSoft', key, value, meta });
          state.ui[key] = value;
          return value;
        },
        setRawScalar(key, value, meta) {
          calls.push({ op: 'actions.ui.setRawScalar', key, value, meta });
          state.ui.raw = { ...(state.ui.raw || {}), [key]: value };
          return value;
        },
      },
      runtime: {
        setScalar(key, value, meta) {
          calls.push({ op: 'actions.runtime.setScalar', key, value, meta });
          state.runtime[key] = value;
          return value;
        },
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
        setDarkMode(on, meta) {
          calls.push({ op: 'ui.setDarkMode', on, meta });
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
  setUiDarkMode(App, 1, { source: 'react:darkMode' });

  assert.deepEqual(calls, [
    { op: 'ui.setActiveTab', next: 'render', meta: { source: 'react:tab' } },
    { op: 'ui.setFlag', key: 'notesEnabled', on: true, meta: { source: 'react:flag' } },
    { op: 'ui.setShowContents', on: true, meta: { source: 'react:contents' } },
    { op: 'ui.setShowHanger', on: false, meta: { source: 'react:hanger' } },
    { op: 'ui.setCurrentFloorType', value: 'oak', meta: { source: 'react:floor' } },
    { op: 'ui.setDarkMode', on: true, meta: { source: 'react:darkMode' } },
  ]);
});

test('[stageC] react UI/runtime wrappers use canonical slice writers with normalized patches', () => {
  const state = createStoreState();
  const store = createStoreRecorder(state).store;
  const { actions, calls } = createCanonicalActionsRecorder(state);
  const App = { actions, store };

  setUiActiveTab(App, 'design', { source: 'react:tab' });
  setUiFlag(App, 'notesEnabled', 1, { source: 'react:flag' });
  setUiShowContents(App, true, { source: 'react:contents' });
  setUiShowHanger(App, true, { source: 'react:hanger' });
  setUiCurrentFloorType(App, 'tile', { source: 'react:floor' });
  setUiDarkMode(App, true, { source: 'react:darkMode' });
  setRuntimeGlobalClickMode(App, 'truthy', { source: 'react:globalClick' });
  setRuntimeSketchMode(App, 0, { source: 'react:sketchMode' });

  assert.deepEqual(state.ui, {
    activeTab: 'design',
    notesEnabled: true,
    showContents: false,
    showHanger: true,
    currentFloorType: 'tile',
    darkMode: true,
  });
  assert.deepEqual(state.runtime, {
    globalClickMode: true,
    sketchMode: false,
  });

  assert.deepEqual(
    calls.map(call => ({
      op: call.op,
      key: call.key,
      value: call.value,
      patch: call.patch,
    })),
    [
      { op: 'actions.ui.setScalarSoft', key: 'activeTab', value: 'design', patch: undefined },
      { op: 'actions.ui.setScalar', key: 'notesEnabled', value: true, patch: undefined },
      {
        op: 'actions.ui.patch',
        key: undefined,
        value: undefined,
        patch: { showContents: true, showHanger: false },
      },
      {
        op: 'actions.ui.patch',
        key: undefined,
        value: undefined,
        patch: { showHanger: true, showContents: false },
      },
      { op: 'actions.ui.setScalarSoft', key: 'currentFloorType', value: 'tile', patch: undefined },
      { op: 'actions.ui.setScalarSoft', key: 'darkMode', value: true, patch: undefined },
      { op: 'actions.runtime.setScalar', key: 'globalClickMode', value: true, patch: undefined },
      { op: 'actions.runtime.setScalar', key: 'sketchMode', value: false, patch: undefined },
    ]
  );
});

test('[stageC] react UI/runtime wrappers fail fast without canonical actions instead of root store.patch fallback', () => {
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

  assert.throws(
    () => setUiActiveTab(App, 'shop', { source: 'react:tab:minimal' }),
    /Missing canonical action.*actions\.ui\.setScalarSoft/
  );
  assert.throws(
    () => setRuntimeSketchMode(App, true, { source: 'react:sketchMode:minimal' }),
    /Missing canonical action.*actions\.runtime\.setScalar/
  );

  assert.deepEqual(state.ui, {});
  assert.deepEqual(state.runtime, {});
  assert.deepEqual(calls, []);
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
