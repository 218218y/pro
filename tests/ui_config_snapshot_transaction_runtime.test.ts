import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { createStore } from '../esm/native/platform/store.ts';

test('ui/config snapshot transaction commits both slices as one store commit and can roll back the root', () => {
  const store = createStore({
    initialState: {
      ui: { raw: { width: 100, height: 220, depth: 60, doors: 2 }, structureSelect: 'before' },
      config: {
        wardrobeType: 'hinged',
        handlesMap: { d1_full: 'standard' },
        modulesConfiguration: [{ id: 'before', doors: 2 }],
      },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);
  const before = store.getState();
  const commitsBefore = store.getDebugStats().commitCount;

  const handle = App.actions.commitUiConfigSnapshot(
    {
      ui: {
        raw: { width: 0, doors: 0 },
        structureSelect: '',
      },
      config: {
        ...before.config,
        handlesMap: { d2_full: 'rail' },
        modulesConfiguration: [{ id: 'after', doors: 0 }],
      },
    },
    { source: 'test:ui-config-snapshot', noBuild: true }
  );

  assert.equal(handle.state, 'prepared');
  assert.equal(store.getDebugStats().commitCount, commitsBefore + 1);
  assert.equal(store.getState().ui.raw?.width, 0);
  assert.equal(store.getState().ui.raw?.height, 220);
  assert.deepEqual({ ...store.getState().config.handlesMap }, { d2_full: 'rail' });
  assert.equal(store.getState().config.modulesConfiguration?.[0]?.id, 'after');
  assert.equal(store.getState().config.modulesConfiguration?.length, 1);

  handle.rollback({ source: 'test:ui-config-snapshot:rollback', noHistory: true, noAutosave: true });
  assert.equal(handle.state, 'rolled-back');
  const rolledBack = store.getState();
  assert.deepEqual(rolledBack.ui, before.ui);
  assert.deepEqual(rolledBack.config, before.config);
  assert.deepEqual(rolledBack.runtime, before.runtime);
  assert.deepEqual(rolledBack.mode, before.mode);
  assert.equal(rolledBack.meta.dirty, before.meta.dirty);
  assert.equal(store.getDebugStats().commitCount, commitsBefore + 2);
});

test('ui/config snapshot transaction becomes irreversible after commit', () => {
  const store = createStore({
    initialState: {
      ui: { raw: { width: 100, height: 220, depth: 60, doors: 2 } },
      config: { wardrobeType: 'hinged', modulesConfiguration: [] },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);

  const handle = App.actions.commitUiConfigSnapshot(
    {
      ui: { raw: { width: 0, doors: 0 } },
      config: { wardrobeType: 'hinged', modulesConfiguration: [] },
    },
    { source: 'test:ui-config-snapshot:commit', noBuild: true }
  );
  handle.commit();

  assert.equal(handle.state, 'committed');
  assert.throws(() => handle.commit(), /cannot commit from committed/i);
  assert.throws(() => handle.rollback(), /cannot roll back from committed/i);
  assert.equal(store.getState().ui.raw?.doors, 0);
});
