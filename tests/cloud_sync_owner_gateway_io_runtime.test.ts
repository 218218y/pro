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
  let credential = {
    room: 'room_a',
    token: 'signed.room.token',
    expiresAt: '2099-01-01T00:00:00.000Z',
  };
  return {
    room: 'room_a',
    currentRoom: () => 'room_a',
    currentRoomCredential: () => credential,
    getPrivateRoomCredential: () => credential,
    setPrivateRoomCredential: (next: typeof credential) => {
      credential = next;
      return true;
    },
    getGateBaseRoom: () => 'room_a',
    getSketchRoom: () => 'room_a::sketch',
    getSite2TabsRoom: () => 'room_a::tabsGate',
    getFloatingSyncRoom: () => 'room_a::syncPin',
  };
}

function createRuntimeStatus() {
  return {
    room: 'room_a',
    clientId: 'client-local',
    instanceId: 'instance-local',
    realtime: { enabled: false, mode: 'broadcast', state: 'disabled', channel: '' },
    polling: { active: false, intervalMs: 5000, reason: '' },
    lastPullSuccessAt: 0,
    lastPullAttemptAt: 0,
    lastPullSuccessAt: 0,
    lastPullFailureAt: 0,
    lastPushAt: 0,
    lastRealtimeEventAt: 0,
    lastError: '',
  } as const;
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
    runtimeStatus: createRuntimeStatus() as any,
    publishStatus: () => {},
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
  const runtimeStatus = createRuntimeStatus() as any;
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'https://example.supabase.co/functions/v1/wp-cloud-sync-room',
    rooms: createRooms(),
    clientId: 'client-local',
    runtimeStatus,
    publishStatus: () => {},
  });
  assert.ok(io);

  await io.getRow('gateway', 'anon-key', 'room_a');
  const result = await io.upsertRow('gateway', 'anon-key', 'room_a', { sketchHash: 'local' });

  assert.deepEqual(result.conflictKeys, ['sketchHash']);
  assert.equal(result.ok, false);
  assert.equal(result.conflict, true);
  assert.equal(writeCount, 1);
  assert.deepEqual(runtimeStatus.conflict, {
    room: 'room_a',
    keys: ['sketchHash'],
    remoteRevision: 5,
    detectedAt: runtimeStatus.conflict.detectedAt,
    state: 'awaiting-resolution',
    base: { sketchHash: 'base' },
    local: { sketchHash: 'local' },
    remote: { sketchHash: 'remote' },
  });
  assert.equal(runtimeStatus.lastError, 'conflict:sketchHash');

  const repeated = await io.upsertRow('gateway', 'anon-key', 'room_a', { sketchHash: 'local' });
  assert.deepEqual(repeated.conflictKeys, ['sketchHash']);
  assert.equal(writeCount, 1, 'an unresolved conflict must block automatic retry writes');
});

test('owner gateway keep-local resolution closes conflict only after the server confirms the write', async () => {
  let readCount = 0;
  let writeCount = 0;
  const writes: RequestBody[] = [];
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    if (body.action === 'read') {
      readCount += 1;
      return response(200, {
        ok: true,
        row: {
          room: 'room_a',
          payload: { sketchHash: readCount === 1 ? 'base' : 'remote' },
          revision: readCount === 1 ? 1 : 2,
          updated_at: `2026-07-13T08:00:0${readCount}.000Z`,
          updated_by: 'client-b',
        },
      });
    }
    writeCount += 1;
    writes.push(body);
    if (writeCount === 1) {
      return response(409, {
        ok: false,
        code: 'revision_conflict',
        row: {
          room: 'room_a',
          payload: { sketchHash: 'remote' },
          revision: 2,
          updated_at: '2026-07-13T08:00:02.000Z',
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
        updated_at: '2026-07-13T08:00:03.000Z',
        updated_by: 'client-local',
      },
    });
  };
  const runtimeStatus = createRuntimeStatus() as any;
  const states: string[] = [];
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'gateway',
    rooms: createRooms(),
    clientId: 'client-local',
    runtimeStatus,
    publishStatus: () => states.push(runtimeStatus.conflict?.state || 'cleared'),
  });
  assert.ok(io);

  await io.getRow('gateway', 'anon', 'room_a');
  await io.upsertRow('gateway', 'anon', 'room_a', { sketchHash: 'local' });
  const result = await io.resolveConflict('room_a', 'keep-local');

  assert.equal(result.ok, true);
  assert.equal(writes[1]?.expectedRevision, 2);
  assert.deepEqual(writes[1]?.payload, { sketchHash: 'local' });
  assert.equal(runtimeStatus.conflict, undefined);
  assert.deepEqual(states.slice(-3), ['resolving', 'resolved', 'cleared']);
});

test('owner gateway use-remote resolution clears conflict only after local adoption succeeds', async () => {
  let readCount = 0;
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    if (body.action === 'read') {
      readCount += 1;
      return response(200, {
        ok: true,
        row: {
          room: 'room_a',
          payload: { sketchHash: readCount === 1 ? 'base' : 'remote-latest' },
          revision: readCount === 1 ? 1 : 3,
          updated_at: '2026-07-13T08:00:03.000Z',
          updated_by: 'client-b',
        },
      });
    }
    return response(409, {
      ok: false,
      code: 'revision_conflict',
      row: {
        room: 'room_a',
        payload: { sketchHash: 'remote' },
        revision: 2,
        updated_at: '2026-07-13T08:00:02.000Z',
        updated_by: 'client-b',
      },
    });
  };
  const runtimeStatus = createRuntimeStatus() as any;
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'gateway',
    rooms: createRooms(),
    clientId: 'client-local',
    runtimeStatus,
    publishStatus: () => {},
  });
  assert.ok(io);

  await io.getRow('gateway', 'anon', 'room_a');
  await io.upsertRow('gateway', 'anon', 'room_a', { sketchHash: 'local' });
  const failed = await io.resolveConflict('room_a', 'use-remote', () => false);
  assert.equal(failed.ok, false);
  assert.equal(runtimeStatus.conflict?.state, 'awaiting-resolution');

  const adopted: unknown[] = [];
  const resolved = await io.resolveConflict('room_a', 'use-remote', row => {
    adopted.push(row.payload);
    return true;
  });
  assert.equal(resolved.ok, true);
  assert.deepEqual(adopted, [{ sketchHash: 'remote-latest' }]);
  assert.equal(runtimeStatus.conflict, undefined);
});

test('owner gateway renews an expiring private credential once for concurrent callers', async () => {
  const rooms = createRooms();
  rooms.setPrivateRoomCredential({
    room: 'room_a',
    token: 'expiring.token.value',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  });
  let renewCount = 0;
  const actions: string[] = [];
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    actions.push(String(body.action || ''));
    if (body.action === 'renew-room') {
      renewCount += 1;
      await new Promise(resolve => setTimeout(resolve, 5));
      return response(200, {
        ok: true,
        credential: {
          room: 'room_a',
          token: 'renewed.token.value',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
    }
    return response(200, { ok: true, row: null });
  };
  const io = createCloudSyncOwnerGatewayIo({
    App: { deps: { browser: { fetch } } } as any,
    cfg,
    gatewayUrl: 'gateway',
    rooms,
    clientId: 'client-local',
    runtimeStatus: createRuntimeStatus() as any,
    publishStatus: () => {},
  });
  await Promise.all([io?.getRow('gateway', 'anon', 'room_a'), io?.getRow('gateway', 'anon', 'room_a')]);
  assert.equal(renewCount, 1);
  assert.deepEqual(actions, ['renew-room', 'read', 'read']);
  assert.equal(rooms.getPrivateRoomCredential().token, 'renewed.token.value');
});

test('owner gateway blocks an expired private credential before network access', async () => {
  const rooms = createRooms();
  rooms.setPrivateRoomCredential({
    room: 'room_a',
    token: 'expired.token.value',
    expiresAt: '2020-01-01T00:00:00.000Z',
  });
  let fetchCount = 0;
  const runtimeStatus = createRuntimeStatus() as any;
  const io = createCloudSyncOwnerGatewayIo({
    App: {
      deps: {
        browser: {
          fetch: async () => {
            fetchCount += 1;
            return response(500, {});
          },
        },
      },
    } as any,
    cfg,
    gatewayUrl: 'gateway',
    rooms,
    clientId: 'client-local',
    runtimeStatus,
    publishStatus: () => {},
  });
  assert.deepEqual(await io?.getRow('gateway', 'anon', 'room_a'), {
    ok: false,
    failure: { kind: 'auth-expired', status: 403, code: 'room_token_expired' },
  });
  assert.equal(fetchCount, 0);
  assert.equal(runtimeStatus.credential.state, 'expired');
  assert.equal(runtimeStatus.credential.failureKind, 'auth-expired');
});

test('a second tab reuses the credential renewed by the first tab', async () => {
  let sharedCredential = {
    room: 'room_a',
    token: 'expiring.shared.token',
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
  };
  const createSharedRooms = () => ({
    room: 'room_a',
    currentRoom: () => 'room_a',
    currentRoomCredential: () => sharedCredential,
    getPrivateRoomCredential: () => sharedCredential,
    setPrivateRoomCredential: (credential: typeof sharedCredential) => {
      sharedCredential = credential;
      return true;
    },
    getGateBaseRoom: () => 'room_a',
    getSketchRoom: () => 'room_a::sketch',
    getSite2TabsRoom: () => 'room_a::tabsGate',
    getFloatingSyncRoom: () => 'room_a::syncPin',
  });
  let renewCount = 0;
  const fetch = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as RequestBody;
    if (body.action === 'renew-room') {
      renewCount += 1;
      return response(200, {
        ok: true,
        credential: {
          room: 'room_a',
          token: 'renewed.shared.token',
          expiresAt: '2099-01-01T00:00:00.000Z',
        },
      });
    }
    return response(200, { ok: true, row: null });
  };
  const createTabIo = () =>
    createCloudSyncOwnerGatewayIo({
      App: { deps: { browser: { fetch } } } as any,
      cfg,
      gatewayUrl: 'gateway',
      rooms: createSharedRooms(),
      clientId: 'client-local',
      runtimeStatus: createRuntimeStatus() as any,
      publishStatus: () => {},
    });
  const firstTab = createTabIo();
  const secondTab = createTabIo();
  await firstTab?.getRow('gateway', 'anon', 'room_a');
  await secondTab?.getRow('gateway', 'anon', 'room_a');
  assert.equal(renewCount, 1);
  assert.equal(sharedCredential.token, 'renewed.shared.token');
});

for (const scenario of [
  {
    name: 'authorization failure',
    fetch: async () => response(403, { ok: false, code: 'room_token_invalid' }),
    expected: { kind: 'auth-invalid', status: 403, code: 'room_token_invalid' },
  },
  {
    name: 'rate limit',
    fetch: async () => response(429, { ok: false, code: 'rate_limit', retryAfterSeconds: 60 }),
    expected: { kind: 'rate-limit', status: 429, code: 'rate_limit', retryAfterMs: 60_000 },
  },
  {
    name: 'network failure',
    fetch: async () => {
      throw new Error('offline');
    },
    expected: { kind: 'network', message: 'offline' },
  },
] as const) {
  test(`owner gateway preserves typed ${scenario.name} read results`, async () => {
    const io = createCloudSyncOwnerGatewayIo({
      App: { deps: { browser: { fetch: scenario.fetch } } } as any,
      cfg,
      gatewayUrl: 'gateway',
      rooms: createRooms(),
      clientId: 'client-local',
      runtimeStatus: createRuntimeStatus() as any,
      publishStatus: () => {},
    });

    assert.deepEqual(await io?.getRow('gateway', 'anon', 'room_a'), {
      ok: false,
      failure: scenario.expected,
    });
  });
}

test('owner gateway blocks repeated reads until the rate-limit retry deadline', async () => {
  let fetchCount = 0;
  const runtimeStatus = createRuntimeStatus() as any;
  const io = createCloudSyncOwnerGatewayIo({
    App: {
      deps: {
        browser: {
          fetch: async () => {
            fetchCount += 1;
            return response(429, { ok: false, code: 'rate_limit', retryAfterSeconds: 60 });
          },
        },
      },
    } as any,
    cfg,
    gatewayUrl: 'gateway',
    rooms: createRooms(),
    clientId: 'client-local',
    runtimeStatus,
    publishStatus: () => {},
  });

  const first = await io?.getRow('gateway', 'anon', 'room_a');
  const second = await io?.getRow('gateway', 'anon', 'room_a');

  assert.equal(first?.ok, false);
  assert.equal(second?.ok, false);
  assert.equal(fetchCount, 1);
  assert.equal(runtimeStatus.credential.state, 'rate-limited');
  assert.equal(runtimeStatus.credential.retryAt > Date.now(), true);
});
