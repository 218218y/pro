import test from 'node:test';
import assert from 'node:assert/strict';

import {
  dispatchCanonicalPatchPayload,
  dispatchDedicatedCanonicalPatchPayload,
  getSingleSlicePatchRoute,
  getWriteActions,
  getWriteAppLike,
  getWriteStore,
  hasCanonicalPatchDispatch,
  hasDedicatedCanonicalPatchDispatch,
  patchSliceCanonical,
  touchMetaCanonical,
} from '../esm/native/runtime/slice_write_access.ts';
import { ensureMetaActionsNamespace } from '../esm/native/runtime/meta_actions_namespace.ts';

type AnyRecord = Record<string, unknown>;

test('[slice-write-access] getSingleSlicePatchRoute normalizes one-slice payloads', () => {
  assert.deepEqual(getSingleSlicePatchRoute({ runtime: { sketchMode: true } }), {
    namespace: 'runtime',
    payload: { sketchMode: true },
  });

  assert.equal(getSingleSlicePatchRoute({ runtime: { sketchMode: true }, ui: { activeTab: 'x' } }), null);
  assert.equal(getSingleSlicePatchRoute({}), null);
});

test('[slice-write-access] getSingleSlicePatchRoute canonicalizes noisy one-slice payloads and rejects empty single-slice payloads', () => {
  assert.deepEqual(
    getSingleSlicePatchRoute({ runtime: { sketchMode: true }, ui: {}, unknown: { ignored: true } }),
    {
      namespace: 'runtime',
      payload: { sketchMode: true },
    }
  );

  assert.equal(getSingleSlicePatchRoute({ ui: {} }), null);
});

test('[slice-write-access] patchSliceCanonical prefers namespaced patch over store/root patch routes', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch', patch, meta });
          return { via: 'runtime.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setRuntime(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setRuntime', patch, meta });
        return { via: 'store.setRuntime' };
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = patchSliceCanonical(
    App,
    'runtime',
    { sketchMode: true },
    { source: 'rt' },
    {
      storeWriter: 'setRuntime',
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'runtime.patch' });
  assert.deepEqual(calls, [{ op: 'runtime.patch', patch: { sketchMode: true }, meta: { source: 'rt' } }]);
});

test('[slice-write-access] patchSliceCanonical avoids namespace lookup when preferred store writer handles the patch', () => {
  let runtimeReads = 0;
  const calls: AnyRecord[] = [];
  const actions = {} as AnyRecord;
  Object.defineProperty(actions, 'runtime', {
    configurable: true,
    enumerable: true,
    get() {
      runtimeReads += 1;
      return {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch', patch, meta });
          return { via: 'runtime.patch' };
        },
      };
    },
  });

  const App = {
    actions,
    store: {
      setRuntime(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setRuntime', patch, meta });
        return { via: 'store.setRuntime' };
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = patchSliceCanonical(
    App,
    'runtime',
    { sketchMode: true },
    { source: 'rt:prefer-store' },
    {
      storeWriter: 'setRuntime',
      preferStoreWriter: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'store.setRuntime' });
  assert.equal(runtimeReads, 0);
  assert.deepEqual(calls, [
    {
      op: 'store.setRuntime',
      patch: { sketchMode: true },
      meta: { source: 'rt:prefer-store' },
    },
  ]);
});

test('[slice-write-access] patchSliceCanonical treats dedicated store writers as terminal even when they return undefined', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      config: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'config.patch', patch, meta });
          return { via: 'config.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setConfig(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setConfig', patch, meta });
        return undefined;
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = patchSliceCanonical(
    App,
    'config',
    { width: 120 },
    { source: 'cfg' },
    {
      storeWriter: 'setConfig',
      preferStoreWriter: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.equal(out, undefined);
  assert.deepEqual(calls, [{ op: 'store.setConfig', patch: { width: 120 }, meta: { source: 'cfg' } }]);
});

test('[slice-write-access] patchSliceCanonical resolves write roots once per dispatch attempt', () => {
  let actionsReads = 0;
  let storeReads = 0;
  const calls: AnyRecord[] = [];
  const actions = {
    config: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'config.patch', patch, meta });
        return { via: 'config.patch' };
      },
    },
    patch(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'actions.patch', patch, meta });
      return { via: 'actions.patch' };
    },
  } satisfies AnyRecord;
  const store = {
    setConfig(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.setConfig', patch, meta });
      return undefined;
    },
    patch(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.patch', patch, meta });
      return { via: 'store.patch' };
    },
  } satisfies AnyRecord;
  const App = {
    get actions() {
      actionsReads += 1;
      return actions;
    },
    get store() {
      storeReads += 1;
      return store;
    },
  } satisfies AnyRecord;

  const out = patchSliceCanonical(
    App,
    'config',
    { width: 144 },
    { source: 'cfg:cached' },
    {
      storeWriter: 'setConfig',
      preferStoreWriter: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.equal(out, undefined);
  assert.equal(actionsReads, 1);
  assert.equal(storeReads, 1);
  assert.deepEqual(calls, [{ op: 'store.setConfig', patch: { width: 144 }, meta: { source: 'cfg:cached' } }]);
});

test('[slice-write-access] patchSliceCanonical skips write root resolution for empty slice payloads', () => {
  let actionsReads = 0;
  let storeReads = 0;
  const App = {
    get actions() {
      actionsReads += 1;
      return {
        runtime: {
          patch() {
            throw new Error('runtime.patch should not run for an empty payload');
          },
        },
      };
    },
    get store() {
      storeReads += 1;
      return {
        setRuntime() {
          throw new Error('store.setRuntime should not run for an empty payload');
        },
      };
    },
  } satisfies AnyRecord;

  const out = patchSliceCanonical(
    App,
    'runtime',
    {},
    { source: 'rt:empty' },
    {
      storeWriter: 'setRuntime',
      preferStoreWriter: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.equal(out, undefined);
  assert.equal(actionsReads, 0);
  assert.equal(storeReads, 0);
});

test('[slice-write-access] repeated dispatch refreshes cached namespace bindings after actions swap', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch:first', patch, meta });
          return { via: 'runtime.patch:first' };
        },
      },
    },
    store: {},
  } satisfies AnyRecord;

  const first = patchSliceCanonical(
    App,
    'runtime',
    { sketchMode: true },
    { source: 'first' },
    {
      storeWriter: 'setRuntime',
      allowRootStorePatch: false,
    }
  );

  App.actions.runtime = {
    patch(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'runtime.patch:second', patch, meta });
      return { via: 'runtime.patch:second' };
    },
  };

  const second = patchSliceCanonical(
    App,
    'runtime',
    { sketchMode: false },
    { source: 'second' },
    {
      storeWriter: 'setRuntime',
      allowRootStorePatch: false,
    }
  );

  assert.deepEqual(first, { via: 'runtime.patch:first' });
  assert.deepEqual(second, { via: 'runtime.patch:second' });
  assert.deepEqual(calls, [
    { op: 'runtime.patch:first', patch: { sketchMode: true }, meta: { source: 'first' } },
    { op: 'runtime.patch:second', patch: { sketchMode: false }, meta: { source: 'second' } },
  ]);
});

test('[slice-write-access] repeated meta touch refreshes cached meta namespace after touch mode changes', () => {
  const calls: AnyRecord[] = [];
  const metaNamespace = {
    touch(meta?: AnyRecord) {
      calls.push({ op: 'meta.touch:first', meta });
      return { via: 'meta.touch:first' };
    },
  } satisfies AnyRecord;
  const App = {
    actions: {
      meta: metaNamespace,
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const first = touchMetaCanonical(App, { source: 'first-touch' }, { allowRootStorePatch: true });

  metaNamespace.touch = ensureMetaActionsNamespace({ meta: {} }).touch;
  const second = touchMetaCanonical(App, { source: 'second-touch' }, { allowRootStorePatch: true });

  metaNamespace.touch = (meta?: AnyRecord) => {
    calls.push({ op: 'meta.touch:third', meta });
    return { via: 'meta.touch:third' };
  };
  const third = touchMetaCanonical(App, { source: 'third-touch' }, { allowRootStorePatch: true });

  assert.deepEqual(first, { via: 'meta.touch:first' });
  assert.deepEqual(second, { via: 'store.patch' });
  assert.deepEqual(third, { via: 'meta.touch:third' });
  assert.deepEqual(calls, [
    { op: 'meta.touch:first', meta: { source: 'first-touch' } },
    { op: 'store.patch', patch: {}, meta: { source: 'second-touch' } },
    { op: 'meta.touch:third', meta: { source: 'third-touch' } },
  ]);
});
test('[slice-write-access] dispatchCanonicalPatchPayload reuses one resolved context for meta touch routes', () => {
  let actionsReads = 0;
  let storeReads = 0;
  const calls: AnyRecord[] = [];
  const actions = {
    meta: {
      touch(meta?: AnyRecord) {
        calls.push({ op: 'meta.touch', meta });
        return { via: 'meta.touch' };
      },
    },
    patch(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'actions.patch', patch, meta });
      return { via: 'actions.patch' };
    },
  } satisfies AnyRecord;
  const store = {
    setMeta(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.setMeta', patch, meta });
      return { via: 'store.setMeta' };
    },
    patch(patch: AnyRecord, meta?: AnyRecord) {
      calls.push({ op: 'store.patch', patch, meta });
      return { via: 'store.patch' };
    },
  } satisfies AnyRecord;
  const App = {
    get actions() {
      actionsReads += 1;
      return actions;
    },
    get store() {
      storeReads += 1;
      return store;
    },
  } satisfies AnyRecord;

  const out = dispatchCanonicalPatchPayload(
    App,
    {},
    { source: 'meta:cached' },
    {
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'meta.touch' });
  assert.equal(actionsReads, 1);
  assert.equal(storeReads, 1);
  assert.deepEqual(calls, [{ op: 'meta.touch', meta: { source: 'meta:cached' } }]);
});

test('[slice-write-access] dispatchCanonicalPatchPayload uses explicit meta touch before generic root patch', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return { via: 'touch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setMeta(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setMeta', patch, meta });
        return { via: 'store.setMeta' };
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = dispatchCanonicalPatchPayload(
    App,
    {},
    { source: 'touch' },
    {
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'touch' });
  assert.deepEqual(calls, [{ op: 'meta.touch', meta: { source: 'touch' } }]);
});

test('[slice-write-access] dispatchCanonicalPatchPayload falls through from root action patch to root store patch when action returns undefined', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return undefined;
      },
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = dispatchCanonicalPatchPayload(
    App,
    { ui: { activeTab: 'doors' }, config: { width: 120 } },
    { source: 'root-fallback' },
    {
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'store.patch' });
  assert.deepEqual(calls, [
    {
      op: 'actions.patch',
      patch: { ui: { activeTab: 'doors' }, config: { width: 120 } },
      meta: { source: 'root-fallback' },
    },
    {
      op: 'store.patch',
      patch: { ui: { activeTab: 'doors' }, config: { width: 120 } },
      meta: { source: 'root-fallback' },
    },
  ]);
});

test('[slice-write-access] root patch routes are opt-in instead of default write paths', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: ensureMetaActionsNamespace({}),
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  assert.equal(
    patchSliceCanonical(
      App,
      'config',
      { width: 120 },
      { source: 'config:missing-writer' },
      { storeWriter: 'setConfig' }
    ),
    undefined
  );
  assert.equal(
    dispatchCanonicalPatchPayload(
      App,
      { ui: { activeTab: 'design' }, config: { width: 120 } },
      { source: 'root:missing-opt-in' }
    ),
    undefined
  );
  assert.equal(touchMetaCanonical(App, { source: 'meta:missing-writer' }), undefined);
  assert.deepEqual(calls, []);

  const explicitRoot = dispatchCanonicalPatchPayload(
    App,
    { ui: { activeTab: 'design' }, config: { width: 120 } },
    { source: 'root:explicit' },
    { allowRootStorePatch: true }
  );
  assert.deepEqual(explicitRoot, { via: 'store.patch' });
  assert.deepEqual(calls, [
    {
      op: 'store.patch',
      patch: { ui: { activeTab: 'design' }, config: { width: 120 } },
      meta: { source: 'root:explicit' },
    },
  ]);
});

test('[slice-write-access] hasCanonicalPatchDispatch distinguishes leaf seams from missing writers', () => {
  const App = {
    store: {
      setConfig() {},
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(App, { config: { width: 120 } }, { allowRootStorePatch: false }),
    true
  );
  assert.equal(
    hasCanonicalPatchDispatch(
      App,
      { ui: { activeTab: 'doors' }, config: { width: 120 } },
      {
        allowRootStorePatch: false,
      }
    ),
    false
  );
});

test('[slice-write-access] hasCanonicalPatchDispatch avoids namespace lookup when the preferred store writer already classifies the route', () => {
  let runtimeReads = 0;
  const actions = {} as AnyRecord;
  Object.defineProperty(actions, 'runtime', {
    configurable: true,
    enumerable: true,
    get() {
      runtimeReads += 1;
      return {
        patch() {
          return undefined;
        },
      };
    },
  });

  const App = {
    actions,
    store: {
      setRuntime() {
        return undefined;
      },
      patch() {
        return undefined;
      },
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(
      App,
      { runtime: { sketchMode: true } },
      {
        sliceOptions: {
          runtime: {
            storeWriter: 'setRuntime',
            preferStoreWriter: true,
          },
        },
      }
    ),
    true
  );
  assert.equal(runtimeReads, 0);
});

test('[slice-write-access] hasCanonicalPatchDispatch resolves write roots once per classification attempt', () => {
  let actionsReads = 0;
  let storeReads = 0;
  const actions = {
    runtime: {
      patch() {
        return undefined;
      },
    },
  } satisfies AnyRecord;
  const store = {
    setRuntime() {
      return undefined;
    },
    patch() {
      return undefined;
    },
  } satisfies AnyRecord;
  const App = {
    get actions() {
      actionsReads += 1;
      return actions;
    },
    get store() {
      storeReads += 1;
      return store;
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(
      App,
      { runtime: { sketchMode: true } },
      {
        storeWriter: 'setRuntime',
        preferStoreWriter: true,
        allowRootStorePatch: true,
      }
    ),
    true
  );
  assert.equal(actionsReads, 1);
  assert.equal(storeReads, 1);
});

test('[slice-write-access] touchMetaCanonical uses store.setMeta before store.patch when meta.touch is absent', () => {
  const calls: AnyRecord[] = [];
  const App = {
    store: {
      setMeta(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setMeta', patch, meta });
        return { via: 'store.setMeta' };
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = touchMetaCanonical(App, { source: 'touch' }, { allowRootStorePatch: true });
  assert.deepEqual(out, { via: 'store.setMeta' });
  assert.deepEqual(calls, [{ op: 'store.setMeta', patch: {}, meta: { source: 'touch' } }]);
});

test('[slice-write-access] touchMetaCanonical ignores stub meta.touch and falls through to store.setMeta', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: ensureMetaActionsNamespace({}),
    },
    store: {
      setMeta(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setMeta', patch, meta });
        return { via: 'store.setMeta' };
      },
    },
  } satisfies AnyRecord;

  const out = touchMetaCanonical(App, { source: 'touch-stub' });
  assert.deepEqual(out, { via: 'store.setMeta' });
  assert.deepEqual(calls, [{ op: 'store.setMeta', patch: {}, meta: { source: 'touch-stub' } }]);
});

test('[slice-write-access] hasCanonicalPatchDispatch fails closed when the only empty-patch seam is a stub meta.touch', () => {
  const App = {
    actions: {
      meta: ensureMetaActionsNamespace({}),
    },
  } satisfies AnyRecord;

  assert.equal(hasCanonicalPatchDispatch(App, {}, { allowRootStorePatch: false }), false);
});

test('[slice-write-access] dispatchCanonicalPatchPayload skips stub meta.touch and falls through to root store patch', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: ensureMetaActionsNamespace({}),
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = dispatchCanonicalPatchPayload(App, {}, { source: 'touch-stub' }, { allowRootStorePatch: true });
  assert.deepEqual(out, { via: 'store.patch' });
  assert.deepEqual(calls, [{ op: 'store.patch', patch: {}, meta: { source: 'touch-stub' } }]);
});

test('[slice-write-access] canonical dispatch treats unknown-only root payloads as true no-ops', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(App, { unknown: { alive: true } }, { allowRootStorePatch: true }),
    false
  );
  assert.equal(
    dispatchCanonicalPatchPayload(
      App,
      { unknown: { alive: true } },
      { source: 'unknown-only' },
      { allowRootActionPatch: true, allowRootStorePatch: true }
    ),
    undefined
  );
  assert.deepEqual(calls, []);
});

test('[slice-write-access] canonical noop routes skip write root resolution entirely', () => {
  let actionsReads = 0;
  let storeReads = 0;
  const App = {
    get actions() {
      actionsReads += 1;
      return {
        patch() {
          throw new Error('actions.patch should not run for canonical no-op routes');
        },
      };
    },
    get store() {
      storeReads += 1;
      return {
        patch() {
          throw new Error('store.patch should not run for canonical no-op routes');
        },
      };
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(App, { unknown: { alive: true } }, { allowRootStorePatch: true }),
    false
  );
  assert.equal(
    dispatchCanonicalPatchPayload(
      App,
      { unknown: { alive: true } },
      { source: 'unknown-only:skip-roots' },
      { allowRootActionPatch: true, allowRootStorePatch: true }
    ),
    undefined
  );
  assert.equal(actionsReads, 0);
  assert.equal(storeReads, 0);
});

test('[slice-write-access] canonical root patch strips empty known slices before dispatching the shared root payload', () => {
  const calls: AnyRecord[] = [];
  const App = {
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = dispatchCanonicalPatchPayload(
    App,
    {
      ui: {},
      runtime: { sketchMode: true },
      unknown: { keep: false },
      config: {},
    },
    { source: 'root:trim-empty' },
    { allowRootStorePatch: true }
  );

  assert.deepEqual(out, { via: 'store.patch' });
  assert.deepEqual(calls, [
    {
      op: 'store.patch',
      patch: { runtime: { sketchMode: true } },
      meta: { source: 'root:trim-empty' },
    },
  ]);
});

test('[slice-write-access] canonical dispatch converges noisy one-slice root payloads onto the slice route instead of synthetic root patch route', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      runtime: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'runtime.patch', patch, meta });
          return { via: 'runtime.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(
      App,
      { runtime: { sketchMode: true }, ui: {}, unknown: { ignored: true } },
      { allowRootActionPatch: true, allowRootStorePatch: true }
    ),
    true
  );

  const out = dispatchCanonicalPatchPayload(
    App,
    { runtime: { sketchMode: true }, ui: {}, unknown: { ignored: true } },
    { source: 'root:noisy-single' },
    { allowRootActionPatch: true, allowRootStorePatch: true }
  );

  assert.deepEqual(out, { via: 'runtime.patch' });
  assert.deepEqual(calls, [
    {
      op: 'runtime.patch',
      patch: { sketchMode: true },
      meta: { source: 'root:noisy-single' },
    },
  ]);
});

test('[slice-write-access] canonical dispatch fails closed on empty single-slice payloads', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      ui: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'ui.patch', patch, meta });
          return { via: 'ui.patch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  assert.equal(
    hasCanonicalPatchDispatch(App, { ui: {} }, { allowRootActionPatch: true, allowRootStorePatch: true }),
    false
  );
  assert.equal(
    dispatchCanonicalPatchPayload(
      App,
      { ui: {} },
      { source: 'root:empty-single' },
      { allowRootActionPatch: true, allowRootStorePatch: true }
    ),
    undefined
  );
  assert.deepEqual(calls, []);
});

test('[slice-write-access] hasDedicatedCanonicalPatchDispatch forwards dedicated meta touch options for empty routes', () => {
  const App = {
    actions: {
      meta: {
        touch() {
          return { via: 'meta.touch' };
        },
      },
    },
  } satisfies AnyRecord;

  assert.equal(hasDedicatedCanonicalPatchDispatch(App, {}), true);
  assert.equal(
    hasDedicatedCanonicalPatchDispatch(App, {}, { metaTouchOptions: { skipNamespaceTouch: true } }),
    false
  );
});

test('[slice-write-access] dispatchDedicatedCanonicalPatchPayload forwards dedicated meta touch options for empty routes', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return { via: 'meta.touch' };
        },
      },
    },
    store: {
      setMeta(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setMeta', patch, meta });
        return { via: 'store.setMeta' };
      },
    },
  } satisfies AnyRecord;

  const out = dispatchDedicatedCanonicalPatchPayload(
    App,
    {},
    { source: 'dedicated:touch' },
    {
      metaTouchOptions: {
        preferStoreWriter: true,
        skipNamespaceTouch: true,
      },
    }
  );

  assert.deepEqual(out, { via: 'store.setMeta' });
  assert.deepEqual(calls, [{ op: 'store.setMeta', patch: {}, meta: { source: 'dedicated:touch' } }]);
});

test('[slice-write-access] getWriteAppLike/getWriteActions/getWriteStore stay aligned on the same resolved roots', () => {
  let actionsReads = 0;
  let storeReads = 0;
  let actionsValue = {
    runtime: {
      patch() {
        return { via: 'runtime.patch' };
      },
    },
  } satisfies AnyRecord;
  let storeValue = {
    patch() {
      return { via: 'store.patch' };
    },
  } satisfies AnyRecord;
  const App = {
    get actions() {
      actionsReads += 1;
      return actionsValue;
    },
    get store() {
      storeReads += 1;
      return storeValue;
    },
  } satisfies AnyRecord;

  const roots = getWriteAppLike(App);
  const writeActions = getWriteActions(App);
  const writeStore = getWriteStore(App);

  assert.equal(actionsReads, 3);
  assert.equal(storeReads, 3);
  assert.equal(roots?.actions, actionsValue);
  assert.equal(roots?.store, storeValue);
  assert.equal(writeActions, actionsValue);
  assert.equal(writeStore, storeValue);

  const nextActions = {
    config: {
      patch() {
        return { via: 'config.patch' };
      },
    },
  } satisfies AnyRecord;
  const nextStore = {
    setConfig() {
      return { via: 'store.setConfig' };
    },
  } satisfies AnyRecord;
  actionsValue = nextActions;
  storeValue = nextStore;

  assert.equal(getWriteActions(App), nextActions);
  assert.equal(getWriteStore(App), nextStore);
  assert.equal(getWriteAppLike(App)?.actions, nextActions);
  assert.equal(getWriteAppLike(App)?.store, nextStore);
});

test('[slice-write-access] touchMetaCanonical reuses the canonical root patch dispatch order when namespace and store-meta seams are skipped', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return { via: 'meta.touch' };
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return undefined;
      },
    },
    store: {
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const out = touchMetaCanonical(
    App,
    { source: 'touch:root-fallback' },
    {
      skipNamespaceTouch: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.deepEqual(out, { via: 'store.patch' });
  assert.deepEqual(calls, [
    { op: 'actions.patch', patch: {}, meta: { source: 'touch:root-fallback' } },
    { op: 'store.patch', patch: {}, meta: { source: 'touch:root-fallback' } },
  ]);
});

test('[slice-write-access] meta-touch and slice dispatch treat dedicated store writers as terminal primary routes', () => {
  const calls: AnyRecord[] = [];
  const App = {
    actions: {
      meta: {
        touch(meta?: AnyRecord) {
          calls.push({ op: 'meta.touch', meta });
          return undefined;
        },
      },
      config: {
        patch(patch: AnyRecord, meta?: AnyRecord) {
          calls.push({ op: 'config.patch', patch, meta });
          return undefined;
        },
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'actions.patch', patch, meta });
        return { via: 'actions.patch' };
      },
    },
    store: {
      setMeta(_patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setMeta', meta });
        return undefined;
      },
      setConfig(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.setConfig', patch, meta });
        return undefined;
      },
      patch(patch: AnyRecord, meta?: AnyRecord) {
        calls.push({ op: 'store.patch', patch, meta });
        return { via: 'store.patch' };
      },
    },
  } satisfies AnyRecord;

  const metaOut = touchMetaCanonical(
    App,
    { source: 'meta:prefer' },
    {
      preferStoreWriter: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );
  const patchOut = patchSliceCanonical(
    App,
    'config',
    { width: 180 },
    { source: 'cfg:prefer' },
    {
      storeWriter: 'setConfig',
      preferStoreWriter: true,
      allowRootActionPatch: true,
      allowRootStorePatch: true,
    }
  );

  assert.equal(metaOut, undefined);
  assert.equal(patchOut, undefined);
  assert.deepEqual(calls, [
    { op: 'store.setMeta', meta: { source: 'meta:prefer' } },
    { op: 'store.setConfig', patch: { width: 180 }, meta: { source: 'cfg:prefer' } },
  ]);
});
