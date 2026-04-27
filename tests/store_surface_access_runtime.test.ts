import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getStorePatchSurfaceMaybe,
  getStorePatcher,
  getStoreSelectorSubscriber,
  getStoreStateReader,
  getStoreSubscriber,
  getStoreSurfaceMaybe,
  hasStorePatchSurface,
  hasStoreSelectorSubscriber,
  installStoreSurface,
  readStoreStateMaybe,
  requireStorePatchSurface,
  requireStoreSelectorSurface,
  requireStoreSurface,
} from '../esm/native/runtime/store_surface_access.ts';

test('[store-surface] reads and binds the canonical App.store surface', () => {
  const calls: string[] = [];
  const store = {
    value: { runtime: { systemReady: true } },
    getState() {
      calls.push('getState');
      return this.value;
    },
    subscribe(fn: (state: unknown) => void) {
      calls.push('subscribe');
      fn(this.value);
      return () => calls.push('unsubscribe');
    },
    patch(payload: unknown) {
      calls.push('patch');
      this.value = payload as any;
      return this.value;
    },
    subscribeSelector(selector: (state: unknown) => unknown, fn: (value: unknown, prev: unknown) => void) {
      calls.push('subscribeSelector');
      const selected = selector(this.value);
      fn(selected, selected);
      return () => calls.push('selector:unsubscribe');
    },
  };
  const App = { store };

  assert.equal(getStoreSurfaceMaybe(App), store);
  assert.equal(getStorePatchSurfaceMaybe(App), store);
  assert.equal(requireStoreSurface(App), store);
  assert.equal(requireStorePatchSurface(App), store);
  assert.equal(requireStoreSelectorSurface(App), store);
  assert.deepEqual(readStoreStateMaybe(App), store.value);
  assert.equal(getStoreStateReader(App)?.(), store.value);
  assert.equal(hasStorePatchSurface(App), true);
  assert.equal(hasStoreSelectorSubscriber(App), true);

  getStorePatcher(App)?.({ runtime: { systemReady: false } });
  const unsub = getStoreSubscriber(App)?.(() => {});
  const selectorUnsub = getStoreSelectorSubscriber(App)?.(
    (state: any) => state.runtime,
    () => {}
  );
  unsub?.();
  selectorUnsub?.();

  assert.deepEqual(calls, [
    'getState',
    'getState',
    'patch',
    'subscribe',
    'subscribeSelector',
    'unsubscribe',
    'selector:unsubscribe',
  ]);
});

test('[store-surface] fails clearly when App.store is missing', () => {
  assert.equal(getStoreSurfaceMaybe({}), null);
  assert.equal(getStorePatchSurfaceMaybe({}), null);
  assert.equal(getStoreSubscriber({}), null);
  assert.equal(getStoreSelectorSubscriber({}), null);
  assert.equal(getStorePatcher({}), null);
  assert.equal(readStoreStateMaybe({}), null);
  assert.equal(hasStorePatchSurface({}), false);
  assert.equal(hasStoreSelectorSubscriber({}), false);
  assert.throws(() => requireStoreSurface({}, 'tests/store_surface_access'), /Store surface missing/);
  assert.throws(
    () => requireStorePatchSurface({}, 'tests/store_surface_access'),
    /Store patch surface missing/
  );
  assert.throws(
    () => requireStoreSelectorSurface({}, 'tests/store_surface_access'),
    /Store selector surface missing/
  );
});

test('[store-surface] installs the canonical store surface once and reuses it', () => {
  let created = 0;
  const App: Record<string, unknown> = {};
  const first = installStoreSurface(App, () => {
    created += 1;
    return {
      getState: () => ({ ok: true }),
      subscribe: () => () => {},
      patch: () => {},
    };
  });
  const second = installStoreSurface(App, () => {
    created += 1;
    return {
      getState: () => ({ ok: false }),
      subscribe: () => () => {},
      patch: () => {},
    };
  });

  assert.equal(created, 1);
  assert.equal(first, second);
  assert.equal(getStoreSurfaceMaybe(App), first);
});
