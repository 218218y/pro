import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CLOUD_SYNC_ALLOWED_ROOM_PATHS,
  isCloudSyncRoomAuthorized,
} from '../supabase/functions/wp-cloud-sync-room/room_scope.ts';
import {
  SKETCH_ROOM_SUFFIX,
  SKETCH_TO_MAIN_SUFFIX,
  SKETCH_TO_SITE2_SUFFIX,
} from '../esm/native/services/cloud_sync_sketch_rooms.ts';
import {
  FLOATING_SYNC_ROOM_SUFFIX,
  SHOW_CONTENTS_SYNC_ROOM_SUFFIX,
} from '../esm/native/services/cloud_sync_sketch_ops_shared.ts';
import { SITE2_TABS_ROOM_SUFFIX } from '../esm/native/services/cloud_sync_tabs_gate_shared.ts';

const CLAIMS = { tenantId: 'bargig', storeId: 'bargig', room: 'room_private' } as const;

test('Cloud Sync room scope covers exactly the client-owned row namespace', () => {
  const clientPaths = [
    '',
    SKETCH_ROOM_SUFFIX,
    `${SKETCH_ROOM_SUFFIX}${SKETCH_TO_MAIN_SUFFIX}`,
    `${SKETCH_ROOM_SUFFIX}${SKETCH_TO_SITE2_SUFFIX}`,
    SITE2_TABS_ROOM_SUFFIX,
    FLOATING_SYNC_ROOM_SUFFIX,
    SHOW_CONTENTS_SYNC_ROOM_SUFFIX,
  ];

  assert.deepEqual(CLOUD_SYNC_ALLOWED_ROOM_PATHS, clientPaths);
  for (const path of clientPaths) {
    assert.equal(
      isCloudSyncRoomAuthorized(CLAIMS, `${CLAIMS.room}${path}`, CLAIMS.storeId, CLAIMS.tenantId),
      true,
      path || '<base>'
    );
  }
});

test('Cloud Sync room scope rejects arbitrary, nested, and cross-owner rows', () => {
  for (const room of [
    `${CLAIMS.room}::unknown`,
    `${CLAIMS.room}::sketch::unknown`,
    `${CLAIMS.room}::sketch::toMain::extra`,
    `${CLAIMS.room}::${'x'.repeat(64)}`,
    'room_other::sketch',
  ]) {
    assert.equal(isCloudSyncRoomAuthorized(CLAIMS, room, CLAIMS.storeId, CLAIMS.tenantId), false, room);
  }

  assert.equal(isCloudSyncRoomAuthorized(CLAIMS, CLAIMS.room, 'store-other', CLAIMS.tenantId), false);
  assert.equal(isCloudSyncRoomAuthorized(CLAIMS, CLAIMS.room, CLAIMS.storeId, 'tenant-other'), false);
});
