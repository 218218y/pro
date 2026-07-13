import test from 'node:test';
import assert from 'node:assert/strict';

import { createCloudSyncOwnerGatewayIo } from '../esm/native/services/cloud_sync_owner_context_runtime_access.ts';

type RequestBody = Record<string, unknown>;

const cfg = {
  url: 'https://example.supabase.co',
  anonKey: 'anon-key',
  storeId: 'bargig',
  gatewayFunction: 'wp-cloud-sync-room',
  publicRoom: 'public',
  roomParam: 'room',
  roomTokenParam: 'roomToken',
  pollMs: 5000,
  shareBaseUrl: 'https://example.test/',
  realtime: false,
  realtimeMode: 'broadcast' as const,
  realtimeChannelPrefix: 'wp_cloud_sync',
  site2SketchInitialAutoLoad: false,
  site2SketchInitialMaxAgeHours: 24,
  diagnostics: false,
};

function createRooms() {
  return {
    room: 'room_a',
    currentRoom: () => 'room_a',
    currentRoomToken: () => 'signed.room.token',
    getPrivateRoom: () => 'room_a',
    getPrivateRoomToken: () => 'signed.room.token',
    setPrivateRoomCredential: () => undefined,
    getGateBaseRoom: () => 'room_a',
    getSketchRoom: () => 'room_a::sketch',
    getSite2TabsRoom: () => 'room_a::tabsGate',
    getFloatingSyncRoom: () => 'room_a::syncPin',
  };
}

function response(status: number, body: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

test('owner gateway retries one stale write after a safe three-way merge', async () => {
  const requests: RequestBody[] = [];
  const basePayload = {
    savedModels: [{ id: 'model-1', name: 'Before' }],
    savedColors: [{ id: 'color-1', value: '#111111' }],
  };
  const remotePayload = {
    savedModels: [{ id: 'model-1', name: 'Before' }],
    savedColors: [{ id: 'color-1', value: '#222222' }],
  };
  let writeCount = 0;
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    requests.push(body);
    if (body.action === 'read') {
      return response(200, {
        ok: true,
        row: {
          room: 'room_a',
          payload: basePayload,
          revision: 1,
          updated_at: '2026-07-13T08:00:00.000Z',
          updated_by: 'client-a',
        },
      });
    }
    writeCount += 1;
    if (writeCount === 1) {
      return response(409, {
        ok: false,
        code: 'revision_conflict',
        row: {
          room: 'room_a',
          payload: remotePayload,
          revision: 2,
          updated_at: '2026-07-13T08:00:01.000Z',
          updated_by: 'client-b',
        },
      });
    }
    return response(200, {
      ok: true,
      row: {
        room: 'room_a',
        payload: body.payload,
        revision: 3,
        updated_at: '2026-07-13T08:00:02.000Z',
        updated_by: 'client-local',
      },
    });
  };
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'https://example.supabase.co/functions/v1/wp-cloud-sync-room',
    rooms: createRooms(),
    clientId: 'client-local',
  });
  assert.ok(io);

  await io.getRow('gateway', 'anon-key', 'room_a');
  const result = await io.upsertRow('gateway', 'anon-key', 'room_a', {
    savedModels: [{ id: 'model-1', name: 'Local' }],
    savedColors: [{ id: 'color-1', value: '#111111' }],
  });

  assert.equal(result.ok, true);
  assert.equal(result.row?.revision, 3);
  assert.equal(writeCount, 2);
  assert.equal(requests[1]?.expectedRevision, 1);
  assert.equal(requests[2]?.expectedRevision, 2);
  assert.deepEqual(requests[2]?.payload, {
    savedModels: [{ id: 'model-1', name: 'Local' }],
    savedColors: [{ id: 'color-1', value: '#222222' }],
  });
});

test('owner gateway rejects competing edits without a blind retry', async () => {
  let writeCount = 0;
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    if (body.action === 'read') {
      return response(200, {
        ok: true,
        row: {
          room: 'room_a',
          payload: { sketchHash: 'base' },
          revision: 4,
          updated_at: '2026-07-13T08:00:00.000Z',
          updated_by: 'client-a',
        },
      });
    }
    writeCount += 1;
    return response(409, {
      ok: false,
      code: 'revision_conflict',
      row: {
        room: 'room_a',
        payload: { sketchHash: 'remote' },
        revision: 5,
        updated_at: '2026-07-13T08:00:01.000Z',
        updated_by: 'client-b',
      },
    });
  };
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'https://example.supabase.co/functions/v1/wp-cloud-sync-room',
    rooms: createRooms(),
    clientId: 'client-local',
  });
  assert.ok(io);

  await io.getRow('gateway', 'anon-key', 'room_a');
  const result = await io.upsertRow('gateway', 'anon-key', 'room_a', { sketchHash: 'local' });

  assert.deepEqual(result.conflictKeys, ['sketchHash']);
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.equal(writeCount, 1);

  const repeated = await io.upsertRow('gateway', 'anon-key', 'room_a', { sketchHash: 'local' });
  assert.deepEqual(repeated.conflictKeys, ['sketchHash']);
  assert.equal(writeCount, 2, 'an unresolved conflict must not advance the cached base revision');
});
