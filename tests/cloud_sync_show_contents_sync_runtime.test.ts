import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncShowContentsOps } from '../esm/native/services/cloud_sync_show_contents_ops.ts';

function createStorage(initial?: Record<string, string>) {
  const strings = new Map<string, string>(Object.entries(initial || {}));
  return {
    KEYS: { SAVED_MODELS: 'wp_store_1:wardrobeSavedModels' },
    getString(key: unknown) {
      return strings.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown) {
      strings.set(String(key), String(value));
      return true;
    },
    dump() {
      return new Map(strings);
    },
  };
}

function createApp(showContents = false) {
  let state: any = {
    config: {},
    runtime: {},
    ui: { showContents, showHanger: !showContents },
  };
  const subscribers = new Set<any>();
  const store = {
    getState: () => state,
    setUi(patch: Record<string, unknown>, meta?: unknown) {
      const prevState = state;
      state = { ...state, ui: { ...state.ui, ...patch } };
      for (const entry of Array.from(subscribers)) {
        const next = entry.selector(state);
        if (Object.is(entry.value, next)) continue;
        const prev = entry.value;
        entry.value = next;
        entry.listener(next, prev, meta);
      }
      return prevState;
    },
    subscribeSelector(selector: (state: any) => unknown, listener: any) {
      const entry = { selector, listener, value: selector(state) };
      subscribers.add(entry);
      return () => subscribers.delete(entry);
    },
  };
  const actions = {
    ui: {
      patch(patch: Record<string, unknown>, meta?: unknown) {
        return store.setUi(patch, meta);
      },
    },
  };
  return { store, actions } as any;
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

test('show contents cloud sync pushes user UI changes to a store-scoped control row', async () => {
  const App = createApp(false);
  const storage = createStorage();
  const writes: Array<{ room: string; payload: any }> = [];
  const hints: Array<{ scope: string; rowName?: string }> = [];

  const ops = createCloudSyncShowContentsOps({
    App,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public-room',
      site2SketchInitialAutoLoad: false,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage,
    restUrl: 'https://example.invalid/rest',
    clientId: 'client-contents',
    getRow: async () => null,
    upsertRow: async (_rest, _anon, room, payload) => {
      writes.push({ room, payload });
      return { ok: true, row: { updated_at: '2026-05-30T19:00:00.000Z', payload } } as any;
    },
    emitRealtimeHint: (scope, rowName) => hints.push({ scope, rowName }),
    diag: () => undefined,
  });

  App.store.setUi({ showContents: true, showHanger: false }, { source: 'test:user-toggle' });
  await flushMicrotasks();

  assert.equal(writes.length, 1);
  assert.equal(writes[0].room, 'public-room::showContents');
  assert.equal(writes[0].payload.showContentsEnabled, true);
  assert.equal(writes[0].payload.showContentsBy, 'client-contents');
  assert.deepEqual(hints, [{ scope: 'floatingSync', rowName: 'public-room::showContents' }]);
  assert.equal(storage.dump().get('wp_store_1:wp_show_contents_sync_state'), '1');

  ops.dispose();
});

test('show contents cloud sync pull applies the remote state without echo-pushing it back', async () => {
  const App = createApp(false);
  const storage = createStorage();
  let writes = 0;

  const ops = createCloudSyncShowContentsOps({
    App,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public-room',
      site2SketchInitialAutoLoad: false,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage,
    restUrl: 'https://example.invalid/rest',
    clientId: 'client-contents',
    getRow: async (_rest, _anon, room) => ({
      room,
      updated_at: '2026-05-30T19:02:00.000Z',
      payload: {
        showContentsEnabled: true,
        showContentsRev: 5,
        showContentsBy: 'other-client',
      },
    }),
    upsertRow: async () => {
      writes += 1;
      return { ok: true } as any;
    },
    emitRealtimeHint: () => undefined,
    diag: () => undefined,
  });

  await ops.pullShowContentsSyncedOnce(true);
  await flushMicrotasks();

  assert.equal(App.store.getState().ui.showContents, true);
  assert.equal(App.store.getState().ui.showHanger, false);
  assert.equal(storage.dump().get('wp_store_1:wp_show_contents_sync_state'), '1');
  assert.equal(writes, 0);

  ops.dispose();
});
