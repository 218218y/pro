import test from 'node:test';
import assert from 'node:assert/strict';

import { readCloudSyncRowWithPullActivity } from '../esm/native/services/cloud_sync_remote_read_support.ts';

function createRuntimeStatus() {
  return {
    realtime: { state: 'idle', enabled: true, mode: 'broadcast', channel: '' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    room: 'room-a',
    clientId: 'client-a',
    instanceId: 'instance-a',
    lastPullSuccessAt: 0,
    lastPullAttemptAt: 0,
    lastPullSuccessAt: 0,
    lastPullFailureAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;
}

test('cloud sync remote read support separates pull attempt from successful settlement', async () => {
  const runtimeStatus = createRuntimeStatus();
  const phases: string[] = [];
  let publishCount = 0;
  let nowMs = 10;
  const realNow = Date.now;
  Date.now = () => ++nowMs;

  try {
    const result = await readCloudSyncRowWithPullActivity({
      gatewayUrl: 'https://example.test/rest',
      anonKey: 'anon',
      room: 'room-a',
      getRow: async () => {
        phases.push(`getRow:lastPullSuccessAt=${runtimeStatus.lastPullSuccessAt}`);
        return {
          ok: true,
          row: { updated_at: '2026-04-13T12:00:00.000Z', payload: {} } as any,
        };
      },
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
        phases.push(`publish:lastPullSuccessAt=${runtimeStatus.lastPullSuccessAt}`);
      },
    });

    assert.equal(result.ok && result.row?.updated_at, '2026-04-13T12:00:00.000Z');
    assert.equal(runtimeStatus.lastPullSuccessAt > 0, true);
    assert.equal(runtimeStatus.lastPullSuccessAt, runtimeStatus.lastPullSuccessAt);
    assert.equal(runtimeStatus.lastPullFailureAt, 0);
    assert.equal(publishCount, 2);
    assert.deepEqual(phases, [
      'publish:lastPullSuccessAt=0',
      'getRow:lastPullSuccessAt=0',
      `publish:lastPullSuccessAt=${runtimeStatus.lastPullSuccessAt}`,
    ]);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync remote read support preserves typed failures instead of collapsing them to a missing row', async () => {
  const runtimeStatus = createRuntimeStatus();
  const result = await readCloudSyncRowWithPullActivity({
    gatewayUrl: 'https://example.test/rest',
    anonKey: 'anon',
    room: 'room-a',
    getRow: async () => ({
      ok: false,
      failure: { kind: 'rate-limit', status: 429, code: 'rate_limit', retryAfterMs: 5000 },
    }),
    runtimeStatus,
  });

  assert.deepEqual(result, {
    ok: false,
    failure: { kind: 'rate-limit', status: 429, code: 'rate_limit', retryAfterMs: 5000 },
  });
  assert.equal(runtimeStatus.lastPullSuccessAt, 0);
  assert.equal(runtimeStatus.lastPullAttemptAt > 0, true);
  assert.equal(runtimeStatus.lastPullFailureAt >= runtimeStatus.lastPullAttemptAt, true);
});

test('cloud sync remote read support records a failed attempt when the row read throws', async () => {
  const runtimeStatus = createRuntimeStatus();
  let publishCount = 0;

  await assert.rejects(
    () =>
      readCloudSyncRowWithPullActivity({
        gatewayUrl: 'https://example.test/rest',
        anonKey: 'anon',
        room: 'room-a',
        getRow: async () => {
          throw new Error('row read exploded');
        },
        runtimeStatus,
        publishStatus: () => {
          publishCount += 1;
        },
      }),
    /row read exploded/
  );

  assert.equal(runtimeStatus.lastPullSuccessAt, 0);
  assert.equal(runtimeStatus.lastPullAttemptAt > 0, true);
  assert.equal(runtimeStatus.lastPullFailureAt > 0, true);
  assert.equal(publishCount, 2);
});

test('cloud sync remote read support delegates conflict preflight to the canonical gateway owner', async () => {
  const runtimeStatus = createRuntimeStatus();
  runtimeStatus.conflict = {
    room: 'room-a',
    keys: ['savedModels:model-1'],
    remoteRevision: 2,
    detectedAt: 1,
    state: 'awaiting-resolution',
  };
  let reads = 0;

  const result = await readCloudSyncRowWithPullActivity({
    gatewayUrl: 'gateway',
    anonKey: 'anon',
    room: 'room-a',
    getRow: async () => {
      reads += 1;
      return {
        ok: false,
        failure: { kind: 'server', status: 409, code: 'conflict_unresolved' },
      };
    },
    runtimeStatus,
  });

  assert.deepEqual(result, {
    ok: false,
    failure: { kind: 'server', status: 409, code: 'conflict_unresolved' },
  });
  assert.equal(reads, 1);
});
