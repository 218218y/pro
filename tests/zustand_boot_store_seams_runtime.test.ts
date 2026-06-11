import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canCommitBootSeedUiSnapshot,
  commitBootSeedUiSnapshotMaybe,
  commitBootSeedUiSnapshotOrThrow,
  installStoreReactivityMaybe,
  installStoreReactivityOrThrow,
} from '../esm/native/runtime/store_boot_access.ts';
import { installStateApi } from '../esm/native/kernel/state_api.ts';

test('boot store seams runtime: installStoreReactivityMaybe calls actions.store.installReactivity (state-api-installed)', () => {
  const calls: string[] = [];
  const kernel = {
    installStoreReactivity() {
      calls.push('kernel');
      return 'ok';
    },
  };

  const store = {
    getState: () => ({ ui: {}, config: {}, runtime: {}, meta: { version: 0 } }),
    patch: () => undefined,
    subscribe: () => () => undefined,
  };

  const app1: any = { actions: {}, stateKernel: kernel, store };
  installStateApi(app1);

  assert.equal(typeof app1.actions.store.installReactivity, 'function');
  assert.equal(typeof app1.actions.store.hasReactivityInstalled, 'function');

  assert.equal(installStoreReactivityMaybe(app1), true);
  assert.equal(app1.actions.store.hasReactivityInstalled(), true);

  // Delete-pass: boot/runtime helpers must not probe raw kernel install seams.
  assert.deepEqual(calls, []);

  calls.length = 0;
  assert.equal(installStoreReactivityMaybe({ stateKernel: kernel, store }), false);
  assert.deepEqual(calls, []);
});

test('boot store seams runtime: installStoreReactivityOrThrow preserves missing-seam and inner failure causes', () => {
  assert.throws(
    () => installStoreReactivityOrThrow({}, 'UI boot store reactivity'),
    /actions\.store\.installReactivity\(\) is required/i
  );

  const app: any = {
    actions: {
      store: {
        installReactivity() {
          throw new Error('reactivity exploded');
        },
      },
    },
  };

  assert.throws(() => installStoreReactivityOrThrow(app, 'UI boot store reactivity'), /reactivity exploded/i);
});

test('boot store seams runtime: commit seed snapshot prefers actions.commitUiSnapshot', () => {
  let got: any = null;
  const app: any = {
    actions: {
      commitUiSnapshot: (ui: any, meta: any) => {
        got = { ui, meta };
      },
    },
    stateKernel: {
      commitFromSnapshot: () => {
        throw new Error('should not use kernel when actions surface exists');
      },
    },
  };
  assert.equal(canCommitBootSeedUiSnapshot(app), true);
  assert.equal(commitBootSeedUiSnapshotMaybe(app, { raw: { width: '100' } }), true);
  assert.equal(got.ui.raw.width, '100');
  assert.equal(got.meta.source, 'init:seed');
  assert.equal(got.meta.noHistory, true);
});

test('boot store seams runtime: commitBootSeedUiSnapshotOrThrow preserves canonical meta and inner failures', () => {
  let got: any = null;
  const app: any = {
    actions: {
      commitUiSnapshot(ui: any, meta: any) {
        got = { ui, meta };
      },
      meta: {
        uiOnly(meta?: Record<string, unknown>, source?: string) {
          return {
            ...(meta || {}),
            source: source || 'unknown',
            uiOnly: true,
            noHistory: true,
            noBuild: true,
          };
        },
      },
    },
  };

  assert.doesNotThrow(() =>
    commitBootSeedUiSnapshotOrThrow(app, { raw: { width: 100 } }, 'init:seed', 'UI boot seed snapshot')
  );
  assert.deepEqual(got, {
    ui: { raw: { width: 100 } },
    meta: { source: 'init:seed', uiOnly: true, noHistory: true, noBuild: true },
  });

  assert.throws(
    () => commitBootSeedUiSnapshotOrThrow({}, {}, 'init:seed', 'UI boot seed snapshot'),
    /actions\.commitUiSnapshot\(ui, meta\) is required/i
  );

  const exploding: any = {
    actions: {
      commitUiSnapshot() {
        throw new Error('commit exploded');
      },
    },
  };
  assert.throws(
    () =>
      commitBootSeedUiSnapshotOrThrow(exploding, { raw: { h: 200 } }, 'init:seed', 'UI boot seed snapshot'),
    /commit exploded/i
  );
});

test('boot store seams runtime: commit seed snapshot requires canonical actions.commitUiSnapshot seam', () => {
  let called = 0;
  let lastMeta: any = null;
  const appWithActions: any = {
    actions: {
      commitUiSnapshot(ui: any, meta: any) {
        called++;
        assert.deepEqual(ui, { raw: { h: 200 } });
        lastMeta = meta;
      },
    },
    stateKernel: {
      commitFromSnapshot: () => {
        throw new Error('runtime boot seam should not call raw kernel commit');
      },
    },
  };
  assert.equal(canCommitBootSeedUiSnapshot(appWithActions), true);
  assert.equal(commitBootSeedUiSnapshotMaybe(appWithActions, { raw: { h: 200 } }), true);
  assert.equal(called, 1);
  assert.equal(lastMeta.source, 'init:seed');

  const kernelOnly: any = {
    stateKernel: {
      commitFromSnapshot: () => {
        throw new Error('should not be called');
      },
    },
  };
  assert.equal(canCommitBootSeedUiSnapshot(kernelOnly), false);
  assert.equal(commitBootSeedUiSnapshotMaybe(kernelOnly, { raw: { h: 200 } }), false);

  assert.equal(canCommitBootSeedUiSnapshot({}), false);
  assert.equal(commitBootSeedUiSnapshotMaybe({}, {}), false);
});
