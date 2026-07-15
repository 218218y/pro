import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCloudSyncConflictFields,
  mergeCloudSyncPayloads,
  rebaseCloudSyncKeepLocal,
} from '../esm/native/services/cloud_sync_payload_merge.ts';

test('cloud sync three-way merge preserves unrelated concurrent collection changes', () => {
  const result = mergeCloudSyncPayloads({
    base: {
      savedModels: [{ id: 'model-1', name: 'Before' }],
      savedColors: [{ id: 'color-1', value: '#111111' }],
      presetOrder: ['model-1'],
    },
    local: {
      savedModels: [{ id: 'model-1', name: 'Local model' }],
      savedColors: [{ id: 'color-1', value: '#111111' }],
      presetOrder: ['model-1'],
    },
    remote: {
      savedModels: [{ id: 'model-1', name: 'Before' }],
      savedColors: [{ id: 'color-1', value: '#222222' }],
      presetOrder: ['model-1'],
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.payload.savedModels, [{ id: 'model-1', name: 'Local model' }]);
  assert.deepEqual(result.payload.savedColors, [{ id: 'color-1', value: '#222222' }]);
});

test('cloud sync three-way merge combines disjoint entity edits in the same collection', () => {
  const result = mergeCloudSyncPayloads({
    base: {
      savedModels: [
        { id: 'model-1', name: 'One' },
        { id: 'model-2', name: 'Two' },
      ],
    },
    local: {
      savedModels: [
        { id: 'model-1', name: 'One local' },
        { id: 'model-2', name: 'Two' },
      ],
    },
    remote: {
      savedModels: [
        { id: 'model-1', name: 'One' },
        { id: 'model-2', name: 'Two remote' },
      ],
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.payload.savedModels, [
    { id: 'model-1', name: 'One local' },
    { id: 'model-2', name: 'Two remote' },
  ]);
});

test('cloud sync three-way merge rejects competing edits and delete-versus-update conflicts', () => {
  const competing = mergeCloudSyncPayloads({
    base: { savedColors: [{ id: 'color-1', value: '#111111' }] },
    local: { savedColors: [{ id: 'color-1', value: '#222222' }] },
    remote: { savedColors: [{ id: 'color-1', value: '#333333' }] },
  });
  assert.deepEqual(competing, { ok: false, conflictKeys: ['savedColors'] });

  const deleteVsUpdate = mergeCloudSyncPayloads({
    base: { savedModels: [{ id: 'model-1', name: 'Before' }] },
    local: { savedModels: [] },
    remote: { savedModels: [{ id: 'model-1', name: 'Remote edit' }] },
  });
  assert.deepEqual(deleteVsUpdate, { ok: false, conflictKeys: ['savedModels'] });
});

test('keep-local rebases only conflicting local entity changes onto the latest remote payload', () => {
  const result = rebaseCloudSyncKeepLocal({
    conflict: {
      conflictId: 'conflict-1',
      generation: 1,
      room: 'room-a',
      keys: ['savedColors'],
      remoteRevision: 3,
      detectedAt: 1,
      state: 'awaiting-resolution',
      projectionAvailable: true,
      fields: buildCloudSyncConflictFields({
        conflictKeys: ['savedColors'],
        base: {
          savedColors: [{ id: 'color-1', value: '#111111' }],
          savedModels: [{ id: 'model-1', name: 'Original' }],
        },
        local: {
          savedColors: [{ id: 'color-1', value: '#222222' }],
          savedModels: [{ id: 'model-1', name: 'Local edit' }],
        },
        remote: {
          savedColors: [{ id: 'color-1', value: '#333333' }],
          savedModels: [{ id: 'model-1', name: 'Original' }],
        },
      }),
    },
    currentLocal: {
      savedColors: [{ id: 'color-1', value: '#222222' }],
      savedModels: [{ id: 'model-1', name: 'Local edit' }],
    },
    latestRemote: {
      savedColors: [{ id: 'color-1', value: '#333333' }],
      savedModels: [
        { id: 'model-1', name: 'Original' },
        { id: 'model-2', name: 'Added by a third client' },
      ],
    },
    transientBase: {
      savedColors: [{ id: 'color-1', value: '#111111' }],
      savedModels: [{ id: 'model-1', name: 'Original' }],
    },
  });

  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.deepEqual(result.payload.savedColors, [{ id: 'color-1', value: '#222222' }]);
  assert.deepEqual(result.payload.savedModels, [
    { id: 'model-1', name: 'Local edit' },
    { id: 'model-2', name: 'Added by a third client' },
  ]);
});
