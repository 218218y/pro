import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parseFloatingSyncPayload,
  parseSketchPayload,
  resolveCloudSyncTabsGateState,
} from '../esm/native/services/cloud_sync_payload_state.ts';

test('cloud sync payload state parsers normalize sync-pin and sketch payloads through one canonical seam', () => {
  assert.deepEqual(parseFloatingSyncPayload(null), { enabled: false, rev: 0, by: '' });
  assert.deepEqual(
    parseFloatingSyncPayload({ syncPinEnabled: 'yes', syncPinRev: 4, syncPinBy: '  owner  ' }),
    { enabled: true, rev: 4, by: 'owner' }
  );
  assert.deepEqual(
    parseSketchPayload({ sketchRev: 7, sketchHash: '  abc  ', sketchBy: '  me  ', sketch: { ok: true } }),
    { rev: 7, hash: 'abc', by: 'me', sketch: { ok: true } }
  );

  assert.deepEqual(
    parseFloatingSyncPayload({ syncPinEnabled: true, syncPinRev: '4', syncPinBy: ' owner ' }),
    {
      enabled: true,
      rev: 0,
      by: 'owner',
    }
  );
  assert.deepEqual(parseSketchPayload({ sketchRev: 'oops', sketchHash: 12, sketchBy: false }), {
    rev: 0,
    hash: '',
    by: '',
    sketch: undefined,
  });
});

test('cloud sync payload state resolves tabs-gate ttl fallback only for live open rows', () => {
  const updatedAt = '2026-04-11T20:00:00.000Z';
  const ttlMs = 5 * 60_000;
  const now = Date.parse('2026-04-11T20:03:00.000Z');
  assert.deepEqual(
    resolveCloudSyncTabsGateState(
      { tabsGateOpen: '1', tabsGateRev: 3, tabsGateBy: '  admin  ' },
      updatedAt,
      ttlMs,
      now
    ),
    {
      open: true,
      until: Date.parse(updatedAt) + ttlMs,
      rev: 3,
      by: 'admin',
    }
  );
  assert.deepEqual(
    resolveCloudSyncTabsGateState(
      { tabsGateOpen: false, tabsGateRev: 2, tabsGateUntil: null, tabsGateBy: ' user ' },
      updatedAt,
      ttlMs,
      now
    ),
    {
      open: false,
      until: 0,
      rev: 2,
      by: 'user',
    }
  );
  assert.deepEqual(resolveCloudSyncTabsGateState(undefined, updatedAt, ttlMs, now), {
    open: false,
    until: 0,
    rev: 0,
    by: '',
  });
});
