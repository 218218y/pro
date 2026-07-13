import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildCloudSyncShareLink,
  describeCloudSyncRoomStatus,
  runCloudSyncCopyShareLinkCommand,
  runCloudSyncRoomModeCommand,
} from '../esm/native/services/cloud_sync_room_commands.ts';

test('cloud sync room commands derive status, private room targets, and share-link copy fallbacks canonically', async () => {
  const seen = new Map<string, string>();
  let currentRoom = 'public';
  let privateRoom = '';
  let privateRoomToken = '';
  let currentRoomToken = '';
  const urlWrites: Array<{ room: string | null; roomToken: string | null }> = [];
  const reported: string[] = [];

  const copyResult = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () =>
      buildCloudSyncShareLink(
        {
          storeId: 'bargig',
          publicRoom: 'public',
          roomParam: 'room',
          roomTokenParam: 'roomToken',
          shareBaseUrl: 'https://site2.test/',
        },
        'room-42',
        'signed.token.value'
      ),
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
    reportNonFatal: (_app, op) => {
      reported.push(op);
    },
  });

  assert.deepEqual(copyResult, {
    ok: true,
    prompted: true,
    link: 'https://site2.test/?room=room-42&roomToken=signed.token.value',
  });
  assert.equal(seen.get('prompt'), 'https://site2.test/?room=room-42&roomToken=signed.token.value');
  assert.deepEqual(reported, ['services/cloud_sync.ts:copyShareLink.clipboard']);

  const modeResult = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: {
        storeId: 'bargig',
        publicRoom: 'public',
        roomParam: 'room',
        roomTokenParam: 'roomToken',
        shareBaseUrl: 'https://site2.test/',
      },
      getCurrentRoom: () => currentRoom,
      getCurrentRoomToken: () => currentRoomToken,
      getPrivateRoom: () => privateRoom,
      getPrivateRoomToken: () => privateRoomToken,
      setPrivateRoomCredential: (room, token) => {
        privateRoom = room;
        privateRoomToken = token;
      },
      issuePrivateRoom: async () => ({
        room: 'generated-room',
        token: 'signed.token.value',
        expiresAt: '2026-07-20T08:00:00.000Z',
      }),
      setRoomCredentialInUrl: (_app, value) => {
        urlWrites.push({ room: value.room, roomToken: value.roomToken });
        currentRoom = value.room || 'public';
        currentRoomToken = value.roomToken || '';
        return true;
      },
      reportNonFatal: () => {},
    },
    'private'
  );

  assert.deepEqual(modeResult, {
    ok: true,
    changed: true,
    mode: 'private',
    room: 'generated-room',
    shareLink: 'https://site2.test/?room=generated-room&roomToken=signed.token.value',
  });
  assert.equal(privateRoom, 'generated-room');
  assert.equal(privateRoomToken, 'signed.token.value');
  assert.deepEqual(urlWrites, [{ room: 'generated-room', roomToken: 'signed.token.value' }]);

  assert.deepEqual(describeCloudSyncRoomStatus(currentRoom, 'public'), {
    room: 'generated-room',
    isPublic: false,
    status: 'מצב: חדר פרטי (generated-room)',
  });

  const publicResult = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: {
        storeId: 'bargig',
        publicRoom: 'public',
        roomParam: 'room',
        roomTokenParam: 'roomToken',
        shareBaseUrl: 'https://site2.test/',
      },
      getCurrentRoom: () => currentRoom,
      getCurrentRoomToken: () => currentRoomToken,
      getPrivateRoom: () => privateRoom,
      getPrivateRoomToken: () => privateRoomToken,
      setPrivateRoomCredential: () => {},
      issuePrivateRoom: async () => null,
      setRoomCredentialInUrl: (_app, value) => {
        urlWrites.push({ room: value.room, roomToken: value.roomToken });
        currentRoom = value.room || 'public';
        currentRoomToken = value.roomToken || '';
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
  assert.deepEqual(describeCloudSyncRoomStatus(currentRoom, 'public'), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
  });
});

test('cloud sync room mode preserves thrown error messages', async () => {
  const result = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: {
        storeId: 'bargig',
        publicRoom: 'public',
        roomParam: 'room',
        roomTokenParam: 'roomToken',
        shareBaseUrl: 'https://site2.test/',
      },
      getCurrentRoom: () => 'public',
      getCurrentRoomToken: () => '',
      getPrivateRoom: () => '',
      getPrivateRoomToken: () => '',
      setPrivateRoomCredential: () => {},
      issuePrivateRoom: async () => ({
        room: 'generated-room',
        token: 'signed.token.value',
        expiresAt: '2026-07-20T08:00:00.000Z',
      }),
      setRoomCredentialInUrl: () => {
        throw new Error('room switch exploded');
      },
      reportNonFatal: () => {},
    },
    'private'
  );

  assert.deepEqual(result, {
    ok: false,
    changed: true,
    mode: 'private',
    room: 'generated-room',
    shareLink: 'https://site2.test/?room=generated-room&roomToken=signed.token.value',
    reason: 'error',
    message: 'room switch exploded',
  });
});

test('cloud sync room mode fails when browser navigation is not committed', async () => {
  const reported: string[] = [];
  const result = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: {
        storeId: 'bargig',
        publicRoom: 'public',
        roomParam: 'room',
        roomTokenParam: 'roomToken',
        shareBaseUrl: 'https://site2.test/',
      },
      getCurrentRoom: () => 'private-room',
      getCurrentRoomToken: () => 'signed.token.value',
      getPrivateRoom: () => 'private-room',
      getPrivateRoomToken: () => 'signed.token.value',
      setPrivateRoomCredential: () => {},
      issuePrivateRoom: async () => null,
      setRoomCredentialInUrl: () => false,
      reportNonFatal: (_app, op) => {
        reported.push(op);
      },
    },
    'public'
  );

  assert.deepEqual(result, {
    ok: false,
    changed: true,
    mode: 'public',
    room: 'public',
    shareLink: 'https://site2.test/',
    reason: 'error',
    message: 'Cloud Sync room navigation was not committed',
  });
  assert.deepEqual(reported, ['services/cloud_sync.ts:roomMode']);
});

test('cloud sync share-link copy preserves clipboard error messages when prompt fallback is unavailable', async () => {
  const reported: string[] = [];
  const result = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () => 'https://site2.test/?room=room-99',
    readClipboard: () => ({
      writeText: async () => {
        throw new Error('clipboard exploded');
      },
    }),
    readPromptSink: () => null,
    reportNonFatal: (_app, op) => {
      reported.push(op);
    },
  });

  assert.deepEqual(result, {
    ok: false,
    reason: 'error',
    link: 'https://site2.test/?room=room-99',
    message: 'clipboard exploded',
  });
  assert.deepEqual(reported, ['services/cloud_sync.ts:copyShareLink.clipboard']);
});

test('cloud sync room/share-link commands normalize non-Error throwables into stable messages', async () => {
  const roomResult = await runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: {
        storeId: 'bargig',
        publicRoom: 'public',
        roomParam: 'room',
        roomTokenParam: 'roomToken',
        shareBaseUrl: 'https://site2.test/',
      },
      getCurrentRoom: () => 'public',
      getCurrentRoomToken: () => '',
      getPrivateRoom: () => '',
      getPrivateRoomToken: () => '',
      setPrivateRoomCredential: () => {},
      issuePrivateRoom: async () => ({
        room: 'generated-room',
        token: 'signed.token.value',
        expiresAt: '2026-07-20T08:00:00.000Z',
      }),
      setRoomCredentialInUrl: () => {
        throw 'string room failure';
      },
      reportNonFatal: () => {},
    },
    'private'
  );

  assert.deepEqual(roomResult, {
    ok: false,
    changed: true,
    mode: 'private',
    room: 'generated-room',
    shareLink: 'https://site2.test/?room=generated-room&roomToken=signed.token.value',
    reason: 'error',
    message: 'string room failure',
  });

  const shareResult = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () => 'https://site2.test/?room=room-99',
    readClipboard: () => ({
      writeText: async () => {
        throw new Error('clipboard exploded');
      },
    }),
    readPromptSink: () => ({
      prompt() {
        throw { message: 'prompt exploded' };
      },
    }),
    reportNonFatal: () => {},
  });

  assert.deepEqual(shareResult, {
    ok: false,
    reason: 'prompt',
    link: 'https://site2.test/?room=room-99',
    message: 'prompt exploded',
  });
});
