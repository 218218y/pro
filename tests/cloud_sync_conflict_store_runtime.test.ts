import test from 'node:test';
import assert from 'node:assert/strict';

import type { CloudSyncConflictRecord } from '../types/index.ts';
import {
  CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES,
  createCloudSyncConflictStore,
} from '../esm/native/services/cloud_sync_conflict_store.ts';

function createStorage() {
  const values = new Map<string, string>();
  return {
    values,
    storage: {
      getString(key: unknown) {
        return values.get(String(key)) ?? null;
      },
      setString(key: unknown, value: unknown) {
        values.set(String(key), String(value));
        return true;
      },
      remove() {
        return false;
      },
    },
  };
}

function createConflict(value: unknown): CloudSyncConflictRecord {
  return {
    conflictId: 'conflict-1',
    generation: 1,
    room: 'room-a',
    keys: ['savedColors'],
    remoteRevision: 9,
    detectedAt: 100,
    state: 'awaiting-resolution',
    canKeepLocal: true,
    canUseRemote: true,
    projectionAvailable: true,
    fields: {
      savedColors: {
        kind: 'field',
        base: { present: true, value },
        local: { present: true, value },
        remote: { present: true, value },
      },
    },
  };
}

test('cloud conflict persistence keeps an oversized conflict blocked with a bounded projection', () => {
  const { values, storage } = createStorage();
  const store = createCloudSyncConflictStore({ storage, storeId: 'store-a' });
  const conflict = createConflict('x'.repeat(CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES));

  assert.equal(store.write(conflict), true);
  const serialized = [...values.values()][0] || '';
  assert.ok(new TextEncoder().encode(serialized).byteLength <= CLOUD_SYNC_CONFLICT_PERSISTENCE_MAX_BYTES);
  const restored = store.read('room-a');
  assert.equal(restored.kind, 'record');
  if (restored.kind !== 'record') return;
  assert.equal(restored.conflict.conflictId, conflict.conflictId);
  assert.equal(restored.conflict.projectionAvailable, false);
  assert.equal(restored.conflict.canKeepLocal, false);
  assert.equal(restored.conflict.canUseRemote, true);
  assert.equal(restored.conflict.limitationReason, 'projection-too-large');
  assert.deepEqual(restored.conflict.fields, {});
});

test('cloud conflict clear replaces a payload projection with a minimal tombstone', () => {
  const { values, storage } = createStorage();
  const store = createCloudSyncConflictStore({ storage, storeId: 'store-a' });
  const conflict = createConflict('small');

  assert.equal(store.write(conflict), true);
  assert.equal(store.clear('room-a', conflict), true);
  const serialized = [...values.values()][0] || '';
  const tombstone = JSON.parse(serialized) as Record<string, unknown>;
  assert.equal(tombstone.state, 'resolved');
  assert.equal(tombstone.conflictId, conflict.conflictId);
  assert.equal('fields' in tombstone, false);
  assert.equal(store.read('room-a').kind, 'missing');
});

test('cloud conflict persistence reports rejected and exceptional storage operations without throwing', () => {
  const failures: Array<{ operation: string; room: string; error: unknown }> = [];
  let readThrows = true;
  let removeThrows = true;
  const storage = {
    getString() {
      if (readThrows) throw new Error('read unavailable');
      return null;
    },
    setString() {
      return false;
    },
    remove() {
      if (removeThrows) throw new Error('remove unavailable');
      return false;
    },
  };
  const store = createCloudSyncConflictStore({
    storage,
    storeId: 'store-a',
    reportFailure: failure => failures.push(failure),
  });
  const conflict = createConflict('small');

  assert.equal(store.read('room-a').kind, 'corrupt');
  readThrows = false;
  assert.equal(store.write(conflict), false);
  assert.equal(store.clear('room-a', conflict), false);

  assert.deepEqual(
    failures.map(failure => [failure.operation, failure.room]),
    [
      ['read', 'room-a'],
      ['write', 'room-a'],
      ['clear-remove', 'room-a'],
      ['clear-tombstone', 'room-a'],
    ]
  );
  removeThrows = false;
});

test('cloud conflict persistence isolates a failing failure reporter', () => {
  const store = createCloudSyncConflictStore({
    storage: {
      getString() {
        throw new Error('read unavailable');
      },
      setString() {
        return false;
      },
    },
    storeId: 'store-a',
    reportFailure() {
      throw new Error('reporter unavailable');
    },
  });

  assert.equal(store.read('room-a').kind, 'corrupt');
  assert.equal(store.write(createConflict('small')), false);
});
