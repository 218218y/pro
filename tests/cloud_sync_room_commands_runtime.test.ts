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
  const urlWrites: Array<string | null> = [];
  const reported: string[] = [];

  const copyResult = await runCloudSyncCopyShareLinkCommand({
    App: {} as any,
    getShareLink: () =>
      buildCloudSyncShareLink(
        { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://site2.test/' },
        'room-42'
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
    link: 'https://site2.test/?room=room-42',
  });
  assert.equal(seen.get('prompt'), 'https://site2.test/?room=room-42');
  assert.deepEqual(reported, ['services/cloud_sync.ts:copyShareLink.clipboard']);

  const modeResult = runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://site2.test/' },
      getCurrentRoom: () => currentRoom,
      getPrivateRoom: () => privateRoom,
      setPrivateRoom: value => {
        privateRoom = value;
      },
      randomRoomId: () => 'generated-room',
      setRoomInUrl: (_app, _param, value) => {
        urlWrites.push(value);
        currentRoom = value || 'public';
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
    shareLink: 'https://site2.test/?room=generated-room',
  });
  assert.equal(privateRoom, 'generated-room');
  assert.deepEqual(urlWrites, ['generated-room']);

  assert.deepEqual(describeCloudSyncRoomStatus(currentRoom, 'public'), {
    room: 'generated-room',
    isPublic: false,
    status: 'מצב: חדר פרטי (generated-room)',
  });

  const publicResult = runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://site2.test/' },
      getCurrentRoom: () => currentRoom,
      getPrivateRoom: () => privateRoom,
      setPrivateRoom: value => {
        privateRoom = value;
      },
      randomRoomId: () => 'generated-room',
      setRoomInUrl: (_app, _param, value) => {
        urlWrites.push(value);
        currentRoom = value || 'public';
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
  assert.deepEqual(urlWrites, ['generated-room', null]);
  assert.deepEqual(describeCloudSyncRoomStatus(currentRoom, 'public'), {
    room: 'public',
    isPublic: true,
    status: 'מצב: ציבורי (כולם רואים)',
  });
});

test('cloud sync room mode preserves thrown error messages', () => {
  const result = runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://site2.test/' },
      getCurrentRoom: () => 'public',
      getPrivateRoom: () => '',
      setPrivateRoom: () => {},
      randomRoomId: () => 'generated-room',
      setRoomInUrl: () => {
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
    shareLink: 'https://site2.test/?room=generated-room',
    reason: 'error',
    message: 'room switch exploded',
  });
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
  const roomResult = runCloudSyncRoomModeCommand(
    {
      App: {} as any,
      cfg: { publicRoom: 'public', roomParam: 'room', shareBaseUrl: 'https://site2.test/' },
      getCurrentRoom: () => 'public',
      getPrivateRoom: () => '',
      setPrivateRoom: () => {},
      randomRoomId: () => 'generated-room',
      setRoomInUrl: () => {
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
    shareLink: 'https://site2.test/?room=generated-room',
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
