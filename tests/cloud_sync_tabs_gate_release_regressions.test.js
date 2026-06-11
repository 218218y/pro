import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const repoRoot = process.cwd();
const distModuleUrl = pathToFileURL(
  path.join(repoRoot, 'dist/esm/native/services/cloud_sync_tabs_gate.js')
).href;
const { createCloudSyncTabsGateOps } = await import(distModuleUrl);

test('cloud sync tabs gate subscribers get an immediate snapshot and isolated listener clones', () => {
  const now = Date.now();
  const timers = [];
  let nextTimerId = 1;

  const ops = createCloudSyncTabsGateOps({
    App: {},
    cfg: { anonKey: 'anon', roomParam: 'room', publicRoom: 'public' },
    storage: {
      getString: () => null,
      setString: () => true,
    },
    restUrl: 'https://example.test/rest',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async () => ({ ok: true, row: null }),
    setTimeoutFn: (handler, ms) => {
      const id = nextTimerId++;
      timers.push({ id, handler, ms });
      return id;
    },
    clearTimeoutFn: id => {
      const index = timers.findIndex(timer => timer.id === id);
      if (index >= 0) timers.splice(index, 1);
    },
    emitRealtimeHint: () => {},
  });

  ops.patchSite2TabsGateUi(true, now + 120_000, 'tester');

  const receivedA = [];
  const receivedB = [];

  const unsubscribeA = ops.subscribeSnapshot(snapshot => {
    receivedA.push({ ...snapshot });
    snapshot.minutesLeft = 999;
    snapshot.open = false;
  });
  const unsubscribeB = ops.subscribeSnapshot(snapshot => {
    receivedB.push({ ...snapshot });
  });

  assert.deepEqual(receivedA[0], { open: true, until: now + 120_000, minutesLeft: 2 });
  assert.deepEqual(receivedB[0], { open: true, until: now + 120_000, minutesLeft: 2 });

  ops.patchSite2TabsGateUi(true, now + 180_000, 'tester-2');

  assert.deepEqual(receivedA.at(-1), { open: true, until: now + 180_000, minutesLeft: 3 });
  assert.deepEqual(receivedB.at(-1), { open: true, until: now + 180_000, minutesLeft: 3 });

  unsubscribeA();
  unsubscribeB();
  ops.dispose();
});
