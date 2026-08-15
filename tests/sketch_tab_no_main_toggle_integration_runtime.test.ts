import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { createStore } from '../esm/native/platform/store.ts';
import { toggleSketchNoMainWardrobe } from '../esm/native/ui/react/tabs/sketch_tab_no_main_toggle.ts';

test('Sketch No-Main uses the installed ui/config snapshot transaction with canonical config map replacement', () => {
  const store = createStore({
    initialState: {
      ui: {
        raw: { width: 240, height: 220, depth: 60, doors: 4 },
        structureSelect: 'main',
        singleDoorPos: 'left',
        stackSplitEnabled: true,
      },
      config: {
        wardrobeType: 'hinged',
        handlesMap: { d1_full: 'rail' },
        modulesConfiguration: [{ id: 'main', doors: 4 }],
      },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);
  App.actions.history.batch = (callback: () => unknown) => callback();
  App.actions.modules.recomputeFromUi = () => ({ ok: true });

  assert.deepEqual(toggleSketchNoMainWardrobe({ app: App, meta: App.actions.meta }), {
    ok: true,
    active: true,
    restored: false,
  });
  assert.equal(store.getState().ui.raw?.doors, 0);
  assert.equal(store.getState().ui.raw?.width, 0);
  assert.deepEqual({ ...store.getState().config.handlesMap }, { d1_full: 'rail' });

  assert.deepEqual(toggleSketchNoMainWardrobe({ app: App, meta: App.actions.meta }), {
    ok: true,
    active: false,
    restored: true,
  });
  assert.equal(store.getState().ui.raw?.doors, 4);
  assert.equal(store.getState().ui.raw?.width, 240);
  assert.deepEqual({ ...store.getState().config.handlesMap }, { d1_full: 'rail' });
});

test('Sketch No-Main rolls back the installed ui/config transaction when recompute throws', () => {
  const store = createStore({
    initialState: {
      ui: {
        raw: { width: 240, height: 220, depth: 60, doors: 4 },
        structureSelect: 'main',
        singleDoorPos: 'left',
        stackSplitEnabled: true,
      },
      config: {
        wardrobeType: 'hinged',
        handlesMap: { d1_full: 'rail' },
        modulesConfiguration: [{ id: 'main', doors: 4 }],
      },
      runtime: { selectedModuleId: 'main' },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);
  App.actions.history.batch = (callback: () => unknown) => callback();
  App.actions.modules.recomputeFromUi = () => {
    throw new Error('recompute failed');
  };
  const before = store.getState();
  const beforeBusinessState = {
    ui: structuredClone(before.ui),
    config: structuredClone(before.config),
    runtime: structuredClone(before.runtime),
    mode: structuredClone(before.mode),
    dirty: before.meta.dirty,
  };

  assert.throws(() => toggleSketchNoMainWardrobe({ app: App, meta: App.actions.meta }), /recompute failed/);

  const after = store.getState();
  assert.deepEqual(
    {
      ui: structuredClone(after.ui),
      config: structuredClone(after.config),
      runtime: structuredClone(after.runtime),
      mode: structuredClone(after.mode),
      dirty: after.meta.dirty,
    },
    beforeBusinessState
  );
});
