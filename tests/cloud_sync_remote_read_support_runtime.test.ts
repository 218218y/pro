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
    lastPullAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
    diagEnabled: false,
  } as any;
}

test('cloud sync remote read support marks pull activity only after a row read resolves', async () => {
  const runtimeStatus = createRuntimeStatus();
  const phases: string[] = [];
  let publishCount = 0;
  let nowMs = 10;
  const realNow = Date.now;
  Date.now = () => ++nowMs;

  try {
    const row = await readCloudSyncRowWithPullActivity({
      restUrl: 'https://example.test/rest',
      anonKey: 'anon',
      room: 'room-a',
      getRow: async () => {
        phases.push(`getRow:lastPullAt=${runtimeStatus.lastPullAt}`);
        return { updated_at: '2026-04-13T12:00:00.000Z', payload: {} } as any;
      },
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
        phases.push(`publish:lastPullAt=${runtimeStatus.lastPullAt}`);
      },
    });

    assert.equal(row?.updated_at, '2026-04-13T12:00:00.000Z');
    assert.equal(runtimeStatus.lastPullAt > 0, true);
    assert.equal(publishCount, 1);
    assert.deepEqual(phases, ['getRow:lastPullAt=0', `publish:lastPullAt=${runtimeStatus.lastPullAt}`]);
  } finally {
    Date.now = realNow;
  }
});

test('cloud sync remote read support does not mark pull activity when the row read throws', async () => {
  const runtimeStatus = createRuntimeStatus();
  let publishCount = 0;

  await assert.rejects(
    () =>
      readCloudSyncRowWithPullActivity({
        restUrl: 'https://example.test/rest',
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

  assert.equal(runtimeStatus.lastPullAt, 0);
  assert.equal(publishCount, 0);
});
