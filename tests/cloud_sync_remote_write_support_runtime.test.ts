import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveCloudSyncSettledRowAfterWrite } from '../esm/native/services/cloud_sync_remote_write_support.ts';

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

test('cloud sync settled-write fallback reads stay quiet by default and only stamp pull activity when explicitly requested', async () => {
  const runtimeStatus = createRuntimeStatus();
  let publishCount = 0;
  let rowReads = 0;
  let settledAt = '';
  let nowMs = 100;
  const realNow = Date.now;
  Date.now = () => ++nowMs;

  try {
    const quietSettled = await resolveCloudSyncSettledRowAfterWrite({
      returnedRow: null,
      reader: {
        restUrl: 'https://example.test/rest',
        anonKey: 'anon',
        room: 'room-a',
        getRow: async () => {
          rowReads += 1;
          return { updated_at: '2026-04-15T12:00:00.000Z', payload: {} } as any;
        },
      },
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
      },
      onSettledUpdatedAt: value => {
        settledAt = value;
      },
    });

    assert.equal(quietSettled?.updated_at, '2026-04-15T12:00:00.000Z');
    assert.equal(rowReads, 1);
    assert.equal(settledAt, '2026-04-15T12:00:00.000Z');
    assert.equal(runtimeStatus.lastPullAt, 0);
    assert.equal(publishCount, 0);

    const countedSettled = await resolveCloudSyncSettledRowAfterWrite({
      returnedRow: null,
      reader: {
        restUrl: 'https://example.test/rest',
        anonKey: 'anon',
        room: 'room-a',
        getRow: async () => ({ updated_at: '2026-04-15T12:01:00.000Z', payload: {} }) as any,
      },
      runtimeStatus,
      publishStatus: () => {
        publishCount += 1;
      },
      countSettleReadAsPull: true,
    });

    assert.equal(countedSettled?.updated_at, '2026-04-15T12:01:00.000Z');
    assert.equal(runtimeStatus.lastPullAt > 0, true);
    assert.equal(publishCount, 1);
  } finally {
    Date.now = realNow;
  }
});
