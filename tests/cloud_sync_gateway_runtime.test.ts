import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createPrivateRoomCredential,
  getGatewayRow,
  issuePublicRoomCredential,
  writeGatewayRow,
} from '../esm/native/services/cloud_sync_gateway.ts';

const gateway = {
  gatewayUrl: 'https://example.test/functions/v1/wp-cloud-sync-room',
  anonKey: 'publishable-key',
  storeId: 'bargig',
};

test('cloud sync gateway reads only through a signed room request and normalizes the row contract', async () => {
  const requests: Array<{ url: string; init?: RequestInit }> = [];
  const row = await getGatewayRow({
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

  assert.equal(row?.room, 'room_a::sketch');
  assert.equal(row?.revision, 7);
  assert.equal(row?.updated_by, 'client-a');
  assert.equal((row?.payload as Record<string, unknown>).sketchHash, 'hash-1');
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
  const row = await getGatewayRow({
    ...gateway,
    room: 'room_missing',
    roomToken: 'signed.token.value',
    fetchFn: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, row: null }),
    }),
  });
  assert.equal(row, null);
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

  assert.equal(publicCredential?.room, 'public');
  assert.equal(privateCredential?.room, 'room_server_generated');
  assert.deepEqual(actions, ['issue-public', 'create-room']);
});
