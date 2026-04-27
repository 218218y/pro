import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncTabsGateRemoteOps } from '../esm/native/services/cloud_sync_tabs_gate_remote.ts';
import { createCloudSyncFloatingSketchSyncOps } from '../esm/native/services/cloud_sync_sketch_ops_floating.ts';

function createStorage() {
  const strings = new Map<string, string>();
  return {
    getString(key: unknown) {
      return strings.get(String(key)) ?? null;
    },
    setString(key: unknown, value: unknown) {
      strings.set(String(key), String(value));
      return true;
    },
  };
}

test('cloud sync floating remote push single-flights duplicate targets and returns busy for conflicting targets', async () => {
  const storage = createStorage();
  let upsertCalls = 0;
  let resolveUpsert: ((value: { ok: true; row: { updated_at: string } }) => void) | null = null;

  const ops = createCloudSyncFloatingSketchSyncOps({
    App: {} as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public-room',
      site2SketchInitialAutoLoad: false,
      site2SketchInitialMaxAgeHours: 12,
    },
    storage: storage as any,
    restUrl: 'https://example.test/rest',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async (_rest, _anon, room, payload) => {
      upsertCalls += 1;
      assert.equal(room, 'public-room::syncPin');
      assert.equal(Boolean((payload as any).syncPinEnabled), true);
      return await new Promise(resolve => {
        resolveUpsert = resolve as typeof resolveUpsert;
      });
    },
    emitRealtimeHint: () => undefined,
    diag: () => undefined,
  });

  const enableA = ops.pushFloatingSketchSyncPinnedNow(true);
  const enableB = ops.pushFloatingSketchSyncPinnedNow(true);
  const disable = ops.pushFloatingSketchSyncPinnedNow(false);

  await Promise.resolve();
  assert.equal(enableA, enableB);
  assert.equal(upsertCalls, 1);
  assert.deepEqual(await disable, { ok: false, reason: 'busy' });

  resolveUpsert?.({ ok: true, row: { updated_at: '2026-04-04T18:00:00.000Z' } });
  assert.deepEqual(await enableA, { ok: true, changed: true, enabled: true });
});

test('cloud sync tabs-gate remote push single-flights duplicate targets and returns busy for conflicting targets', async () => {
  let upsertCalls = 0;
  let resolveUpsert: ((value: { ok: true; row: { updated_at: string } }) => void) | null = null;

  const ops = createCloudSyncTabsGateRemoteOps({
    App: {} as any,
    cfg: {
      anonKey: 'anon',
      roomParam: 'room',
      publicRoom: 'public-room',
    },
    restUrl: 'https://example.test/rest',
    clientId: 'client-1',
    getRow: async () => null,
    upsertRow: async (_rest, _anon, room, payload) => {
      upsertCalls += 1;
      assert.equal(room, 'public-room::tabsGate');
      assert.equal(Boolean((payload as any).tabsGateOpen), true);
      return await new Promise(resolve => {
        resolveUpsert = resolve as typeof resolveUpsert;
      });
    },
    emitRealtimeHint: () => undefined,
    isTabsGateController: true,
    getSite2TabsRoom: () => 'public-room::tabsGate',
    writeSite2TabsGateLocal: () => undefined,
    patchSite2TabsGateUi: () => undefined,
  });

  const openA = ops.pushTabsGateNow(true, 65_000);
  const openB = ops.pushTabsGateNow(true, 65_000);
  const close = ops.pushTabsGateNow(false, 0);

  await Promise.resolve();
  assert.equal(openA, openB);
  assert.equal(upsertCalls, 1);
  assert.deepEqual(await close, { ok: false, reason: 'busy' });

  resolveUpsert?.({ ok: true, row: { updated_at: '2026-04-04T18:01:00.000Z' } });
  const result = await openA;
  assert.equal(result.ok, true);
  assert.equal(result.changed, true);
  assert.equal(result.open, true);
  assert.ok(typeof result.until === 'number' && result.until > 0);
});
