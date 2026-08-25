import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPrivateRoomCredential,
  getGatewayRow,
  issuePublicRoomCredential,
  publishGatewaySketchRow,
  renewPrivateRoomCredential,
  writeGatewayRow,
} from '../esm/native/services/cloud_sync_gateway.ts';

const gateway = {
  gatewayUrl: 'https://example.test/functions/v1/wp-cloud-sync-room',
  anonKey: 'publishable-key',
  storeId: 'bargig',
};

test('cloud sync gateway reads only through a signed room request and normalizes the row contract', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const result = await getGatewayRow({
    ...gateway,
    room: 'room_a::sketch',
    roomToken: 'signed.token.value',
    fetchFn: async (url, init) => {
      requests.push({ url, init });
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          row: {
            room: 'room_a::sketch',
            revision: 7,
            updated_at: '2026-07-13T08:00:00.000Z',
            updated_by: 'client-a',
            payload: {
              sketchRev: 123,
              sketchHash: 'hash-1',
              sketchBy: 'client-a',
              sketch: { foo: 'bar' },
            },
          },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.row?.room, 'room_a::sketch');
  assert.equal(result.ok && result.row?.revision, 7);
  assert.equal(result.ok && result.row?.updated_by, 'client-a');
  assert.equal(result.ok && (result.row?.payload as Record<string, unknown>).sketchHash, 'hash-1');
  assert.equal(requests[0]?.url, gateway.gatewayUrl);
  assert.equal(requests[0]?.init?.method, 'POST');
  const body = JSON.parse(String(requests[0]?.init?.body || '{}'));
  assert.deepEqual(body, {
    action: 'read',
    storeId: 'bargig',
    room: 'room_a::sketch',
    roomToken: 'signed.token.value',
  });
  assert.doesNotMatch(requests[0]?.url || '', /rest\/v1|select=|room=eq/u);
});

test('cloud sync gateway returns null for a missing room without exposing a table query', async () => {
  const result = await getGatewayRow({
    ...gateway,
    room: 'room_missing',
    roomToken: 'signed.token.value',
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, row: null }),
    }),
  });
  assert.deepEqual(result, { ok: true, row: null });
});

test('cloud sync gateway writes with an expected revision and parses the committed revision', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const result = await writeGatewayRow({
    ...gateway,
    room: 'room_a::tabsGate',
    roomToken: 'signed.token.value',
    payload: { tabsGateOpen: true },
    expectedRevision: 4,
    clientId: 'client-b',
    fetchFn: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          row: {
            room: 'room_a::tabsGate',
            revision: 5,
            updated_at: '2026-07-13T08:00:01.000Z',
            updated_by: 'client-b',
            payload: { tabsGateOpen: true },
          },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.row?.revision, 5);
  assert.equal(requestBody?.action, 'write');
  assert.equal(requestBody?.expectedRevision, 4);
  assert.equal(requestBody?.clientId, 'client-b');
});

test('cloud sync gateway publishes a sketch authoritatively in one request and preserves the changed flag', async () => {
  let requestBody: Record<string, unknown> | null = null;
  const result = await publishGatewaySketchRow({
    ...gateway,
    room: 'room_a::sketch::toSite2',
    roomToken: 'signed.token.value',
    payload: {
      sketch: { settings: { width: 88 } },
      sketchHash: 'hash-88',
      sketchRev: 123,
      sketchBy: 'client-sketch',
    },
    clientId: 'client-sketch',
    fetchFn: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          changed: false,
          row: {
            room: 'room_a::sketch::toSite2',
            revision: 4,
            updated_at: '2026-08-25T09:00:00.000Z',
            updated_by: 'client-sketch',
            payload: requestBody?.payload,
          },
        }),
      };
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.ok && result.changed, false);
  assert.equal(requestBody?.action, 'publish-sketch');
  assert.equal(requestBody?.expectedRevision, undefined);
  assert.equal(requestBody?.room, 'room_a::sketch::toSite2');
});

test('cloud sync gateway exposes a stale-write conflict as data for a bounded merge retry', async () => {
  const result = await writeGatewayRow({
    ...gateway,
    room: 'room_a',
    roomToken: 'signed.token.value',
    payload: { savedColors: [] },
    expectedRevision: 2,
    clientId: 'client-c',
    fetchFn: async () => ({
      ok: false,
      status: 409,
      json: async () => ({
        ok: false,
        code: 'revision_conflict',
        row: {
          room: 'room_a',
          revision: 3,
          updated_at: '2026-07-13T08:00:02.000Z',
          updated_by: 'client-d',
          payload: { savedColors: [{ id: 'remote', value: '#fff' }] },
        },
      }),
    }),
  });

  assert.deepEqual(result, {
    ok: false,
    conflict: true,
    row: {
      room: 'room_a',
      revision: 3,
      updated_at: '2026-07-13T08:00:02.000Z',
      updated_by: 'client-d',
      payload: { savedColors: [{ id: 'remote', value: '#fff' }] },
    },
  });
});

test('cloud sync gateway issues public and private signed credentials without accepting client room ids', async () => {
  const actions: string[] = [];
  const fetchFn = async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body || '{}')) as { action?: string };
    actions.push(String(body.action || ''));
    const room = body.action === 'issue-public' ? 'public' : 'room_server_generated';
    return {
      ok: true,
      status: body.action === 'issue-public' ? 200 : 201,
      json: async () => ({
        ok: true,
        credential: {
          room,
          token: 'signed.token.value',
          expiresAt: '2026-07-20T08:00:00.000Z',
        },
      }),
    };
  };

  const publicCredential = await issuePublicRoomCredential({ ...gateway, fetchFn });
  const privateCredential = await createPrivateRoomCredential({ ...gateway, fetchFn });

  assert.equal(publicCredential.ok && publicCredential.credential.room, 'public');
  assert.equal(privateCredential.ok && privateCredential.credential.room, 'room_server_generated');
  assert.deepEqual(actions, ['issue-public', 'create-room']);
});

test('cloud sync gateway preserves auth expiry, rate-limit, and network failures', async () => {
  const expired = await getGatewayRow({
    ...gateway,
    room: 'room_a',
    roomToken: 'expired.token.value',
    fetchFn: async () => ({
      ok: false,
      status: 403,
      json: async () => ({ ok: false, code: 'room_token_expired' }),
    }),
  });
  assert.deepEqual(expired, {
    ok: false,
    failure: { kind: 'auth-expired', status: 403, code: 'room_token_expired' },
  });

  const deletedRoom = await getGatewayRow({
    ...gateway,
    room: 'room_deleted',
    roomToken: 'still.cryptographically.valid',
    fetchFn: async () => ({
      ok: false,
      status: 410,
      json: async () => ({ ok: false, code: 'room_expired' }),
    }),
  });
  assert.deepEqual(deletedRoom, {
    ok: false,
    failure: { kind: 'room-expired', status: 410, code: 'room_expired' },
  });

  const limited = await writeGatewayRow({
    ...gateway,
    room: 'room_a',
    roomToken: 'signed.token.value',
    payload: {},
    expectedRevision: 1,
    clientId: 'client-a',
    fetchFn: async () => ({
      ok: false,
      status: 429,
      headers: { get: name => (name === 'Retry-After' ? '12' : null) },
      json: async () => ({ ok: false, code: 'rate_limit', retryAfterSeconds: 60 }),
    }),
  });
  assert.deepEqual(limited, {
    ok: false,
    failure: { kind: 'rate-limit', status: 429, code: 'rate_limit', retryAfterMs: 12_000 },
  });

  const offline = await getGatewayRow({
    ...gateway,
    room: 'room_a',
    roomToken: 'signed.token.value',
    fetchFn: async () => {
      throw new Error('offline');
    },
  });
  assert.deepEqual(offline, {
    ok: false,
    failure: { kind: 'network', message: 'offline' },
  });
});

test('cloud sync gateway renews a private room without allowing a room change', async () => {
  let requestBody: Record<string, unknown> = {};
  const result = await renewPrivateRoomCredential({
    ...gateway,
    room: 'room_a',
    roomToken: 'old.signed.token',
    fetchFn: async (_url, init) => {
      requestBody = JSON.parse(String(init?.body || '{}')) as Record<string, unknown>;
      return {
        ok: true,
        status: 200,
        json: async () => ({
          ok: true,
          credential: {
            room: 'room_a',
            token: 'new.signed.token',
            expiresAt: '2026-07-20T08:00:00.000Z',
          },
        }),
      };
    },
  });
  assert.equal(result.ok && result.credential.token, 'new.signed.token');
  assert.deepEqual(requestBody, {
    action: 'renew-room',
    storeId: 'bargig',
    room: 'room_a',
    roomToken: 'old.signed.token',
  });
});
