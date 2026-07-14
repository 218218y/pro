import test from 'node:test';
import assert from 'node:assert/strict';

import { installStateApi } from '../esm/native/kernel/state_api.ts';
import { createStore } from '../esm/native/platform/store.ts';

test('project load transaction commits all state slices once and rolls them back as one root', () => {
  const store = createStore({
    initialState: {
      ui: { projectName: 'before', raw: { width: 100 } },
      config: { wardrobeType: 'hinged', savedNotes: [{ id: 'before' }] },
      runtime: { sketchMode: false, wardrobeTypeProfiles: { hinged: true }, restoring: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: true },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);
  const before = store.getState();
  const commitsBefore = store.getDebugStats().commitCount;

  const handle = App.actions.commitProjectLoadSnapshot(
    {
      ui: { projectName: 'after', raw: { width: 220 } },
      config: { wardrobeType: 'sliding', savedNotes: [{ id: 'after' }] },
      runtime: { sketchMode: true, wardrobeTypeProfiles: null, restoring: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
    { source: 'test:project.load', noBuild: true, noHistory: true, noAutosave: true }
  );
  assert.equal(handle.state, 'prepared');

  const committed = store.getState();
  assert.equal(store.getDebugStats().commitCount, commitsBefore + 1);
  assert.equal(committed.ui.projectName, 'after');
  assert.equal(committed.config.wardrobeType, 'sliding');
  assert.deepEqual(committed.config.savedNotes, [{ id: 'after' }]);
  assert.equal(committed.runtime.sketchMode, true);
  assert.equal(committed.runtime.wardrobeTypeProfiles, null);
  assert.equal(committed.meta.dirty, false);

  handle.rollback({ source: 'test:project.load.rollback', silent: true });
  assert.equal(handle.state, 'rolled-back');
  const rolledBack = store.getState();
  assert.deepEqual(rolledBack.ui, before.ui);
  assert.deepEqual(rolledBack.config, before.config);
  assert.deepEqual(rolledBack.runtime, before.runtime);
  assert.deepEqual(rolledBack.mode, before.mode);
  assert.equal(rolledBack.meta.dirty, before.meta.dirty);
  assert.equal(store.getDebugStats().commitCount, commitsBefore + 2);

  assert.throws(
    () => handle.rollback({ source: 'test:duplicate.rollback' }),
    /cannot roll back from rolled-back/i
  );
  assert.equal(store.getDebugStats().commitCount, commitsBefore + 2);
});

test('project load transaction commits ownership once and rejects rollback after business commit', () => {
  const store = createStore({
    initialState: {
      ui: { projectName: 'before', raw: { width: 100 } },
      config: { wardrobeType: 'hinged' },
      runtime: {},
      mode: { primary: 'none', opts: {} },
      meta: { dirty: true },
    },
  });
  const App = { actions: {}, services: {}, store } as any;
  installStateApi(App);

  const handle = App.actions.commitProjectLoadSnapshot(
    {
      ui: { projectName: 'after', raw: { width: 220 } },
      config: { wardrobeType: 'sliding' },
      runtime: { restoring: false },
      mode: { primary: 'none', opts: {} },
      meta: { dirty: false },
    },
    { source: 'test:project.load.commit', noBuild: true, noHistory: true, noAutosave: true }
  );

  assert.equal(handle.state, 'prepared');
  handle.commit();
  assert.equal(handle.state, 'committed');
  assert.throws(() => handle.commit(), /cannot commit from committed/i);
  assert.throws(() => handle.rollback({ source: 'test:late.rollback' }), /cannot roll back from committed/i);
  assert.equal(store.getState().ui.projectName, 'after');
});
