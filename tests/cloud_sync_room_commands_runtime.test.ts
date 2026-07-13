import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCloudSyncShareLink,
  describeCloudSyncRoomStatus,
  runCloudSyncCopyShareLinkCommand,
  runCloudSyncRoomModeCommand,
} from '../esm/native/services/cloud_sync_room_commands.ts';

const cfg = {
  storeId: 'bargig',
  publicRoom: 'public',
  roomParam: 'room',
  roomTokenParam: 'roomToken',
  shareBaseUrl: 'https://site2.test/',
};

test('cloud sync room commands use fragment links and persist complete private credentials', async () => {
  const seen = new Map<string, string>();
  const reported: string[] = [];
  let currentRoom = 'public';
  let currentCredential: { room: string; token: string; expiresAt: string } | null = null;
  let privateCredential: typeof currentCredential = null;
  const urlWrites: Array<{ room: string | null; roomToken: string | null }> = [];

  const copyResult = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () => buildCloudSyncShareLink(cfg, 'room-42', 'signed.token.value'),
    readClipboard: () => ({
      writeText: async () => {
        throw new Error('clipboard failed');
      },
    }),
    readPromptSink: () => ({
      prompt: (_message?: string, value?: string) => {
        seen.set('prompt', String(value || ''));
        return value || '';
      },
    }),
    reportNonFatal: (_app, op) => reported.push(op),
  });
  const expectedLink = 'https://site2.test/#room=room-42&roomToken=signed.token.value';
  assert.deepEqual(copyResult, { ok: true, prompted: true, link: expectedLink });
  assert.equal(seen.get('prompt'), expectedLink);
  assert.deepEqual(reported, ['services/cloud_sync.ts:copyShareLink.clipboard']);

  const privateResult = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg,
      getCurrentRoom: () => currentRoom,
      getCurrentRoomCredential: () => currentCredential,
      getPrivateRoomCredential: () => privateCredential,
      setPrivateRoomCredential: credential => {
        privateCredential = credential;
        return true;
      },
      issuePrivateRoom: async () => ({
        room: 'generated-room',
        token: 'signed.token.value',
        expiresAt: '2099-01-01T00:00:00.000Z',
      }),
      setRoomCredentialInUrl: (_app, value) => {
        urlWrites.push({ room: value.room, roomToken: value.roomToken });
        currentRoom = value.room || 'public';
        currentCredential = value.room
          ? {
              room: value.room,
              token: value.roomToken || '',
              expiresAt: '2099-01-01T00:00:00.000Z',
            }
          : null;
        return true;
      },
      reportNonFatal: () => {},
    },
    'private'
  );
  assert.deepEqual(privateResult, {
    ok: true,
    changed: true,
    mode: 'private',
    room: 'generated-room',
    shareLink: 'https://site2.test/#room=generated-room&roomToken=signed.token.value',
  });
  assert.deepEqual(privateCredential, {
    room: 'generated-room',
    token: 'signed.token.value',
    expiresAt: '2099-01-01T00:00:00.000Z',
  });

  const privateStatus = describeCloudSyncRoomStatus(currentRoom, 'public', {
    state: 'active',
    expiresAt: '2099-01-01T00:00:00.000Z',
    retryAt: 0,
    failureKind: '',
  });
  assert.equal(privateStatus.credentialState, 'active');
  assert.match(privateStatus.status, /הרשאה פעילה/u);

  const publicResult = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg,
      getCurrentRoom: () => currentRoom,
      getCurrentRoomCredential: () => currentCredential,
      getPrivateRoomCredential: () => privateCredential,
      setPrivateRoomCredential: () => true,
      issuePrivateRoom: async () => null,
      setRoomCredentialInUrl: (_app, value) => {
        urlWrites.push({ room: value.room, roomToken: value.roomToken });
        currentRoom = value.room || 'public';
        currentCredential = null;
        return true;
      },
      reportNonFatal: () => {},
    },
    'public'
  );
  assert.deepEqual(publicResult, {
    ok: true,
    changed: true,
    mode: 'public',
    room: 'public',
    shareLink: 'https://site2.test/',
  });
  assert.deepEqual(urlWrites, [
    { room: 'generated-room', roomToken: 'signed.token.value' },
    { room: null, roomToken: null },
  ]);
  assert.equal(describeCloudSyncRoomStatus(currentRoom, 'public').credentialState, 'public');
});

test('cloud sync room status exposes expiry, rate-limit, and offline states', () => {
  const expired = describeCloudSyncRoomStatus('room-a', 'public', {
    state: 'expired',
    expiresAt: '2026-07-01T00:00:00.000Z',
    retryAt: 0,
    failureKind: 'auth-expired',
  });
  assert.equal(expired.credentialState, 'expired');
  assert.equal(expired.failureKind, 'auth-expired');
  assert.match(expired.status, /ההרשאה פגה/u);

  const limited = describeCloudSyncRoomStatus('room-a', 'public', {
    state: 'rate-limited',
    expiresAt: '2099-01-01T00:00:00.000Z',
    retryAt: 1234,
    failureKind: 'rate-limit',
  });
  assert.equal(limited.retryAt, 1234);
  assert.match(limited.status, /הוגבל זמנית/u);

  const offline = describeCloudSyncRoomStatus('room-a', 'public', {
    state: 'offline',
    expiresAt: '2099-01-01T00:00:00.000Z',
    retryAt: 0,
    failureKind: 'network',
  });
  assert.match(offline.status, /לא מקוון/u);
});

test('cloud sync room mode preserves navigation failures and normalized thrown messages', async () => {
  const baseDeps = {
    App: {} as any,
    cfg,
    getCurrentRoom: () => 'public',
    getCurrentRoomCredential: () => null,
    getPrivateRoomCredential: () => null,
    setPrivateRoomCredential: () => true,
    issuePrivateRoom: async () => ({
      room: 'generated-room',
      token: 'signed.token.value',
      expiresAt: '2099-01-01T00:00:00.000Z',
    }),
    reportNonFatal: () => {},
  };
  const thrown = await runCloudSyncRoomModeCommand(
    {
      ...baseDeps,
      setRoomCredentialInUrl: () => {
        throw 'string room failure';
      },
    },
    'private'
  );
  assert.equal(thrown.ok, false);
  assert.equal(thrown.ok === false && thrown.reason, 'error');
  assert.equal(thrown.ok === false && thrown.message, 'string room failure');

  const reported: string[] = [];
  const notCommitted = await runCloudSyncRoomModeCommand(
    {
      ...baseDeps,
      getCurrentRoom: () => 'private-room',
      setRoomCredentialInUrl: () => false,
      reportNonFatal: (_app, op) => reported.push(op),
    },
    'public'
  );
  assert.equal(notCommitted.ok, false);
  assert.equal(
    notCommitted.ok === false && notCommitted.message,
    'Cloud Sync room navigation was not committed'
  );
  assert.deepEqual(reported, ['services/cloud_sync.ts:roomMode']);
});

test('cloud sync share-link copy preserves clipboard and prompt errors', async () => {
  const result = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () => 'https://site2.test/#room=room-99',
    readClipboard: () => ({
      writeText: async () => {
        throw new Error('clipboard exploded');
      },
    }),
    readPromptSink: () => ({
      prompt: () => {
        throw { message: 'prompt exploded' };
      },
    }),
    reportNonFatal: () => {},
  });
  assert.deepEqual(result, {
    ok: false,
    reason: 'prompt',
    link: 'https://site2.test/#room=room-99',
    message: 'prompt exploded',
  });
});
