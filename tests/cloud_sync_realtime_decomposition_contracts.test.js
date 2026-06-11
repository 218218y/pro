import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_realtime.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_realtime_shared.ts', import.meta.url);
const mod = readSource('../esm/native/services/cloud_sync_realtime_module.ts', import.meta.url);

test('cloud sync realtime keeps a thin facade over shared/module seams', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_realtime_shared\.js/,
      /cloud_sync_realtime_module\.js/,
      /export type \{ CloudSyncRealtimeFactory \}/,
      /export \{[\s\S]*getRealtimeChannel[\s\S]*resolveRealtimeCreateClient[\s\S]*\}/,
    ],
    'cloud sync realtime facade'
  );

  assertLacksAll(
    assert,
    facade,
    [
      /function getRealtimeChannel\(/,
      /function removeRealtimeChannel\(/,
      /function disconnectRealtimeClient\(/,
      /async function resolveRealtimeCreateClient\(/,
    ],
    'cloud sync realtime facade'
  );

  assertMatchesAll(
    assert,
    shared,
    [
      /export type CloudSyncRealtimeFactory = \(/,
      /export function hasLiveRealtimeSubscriptionStatus\(/,
      /export function getRealtimeChannel\(/,
      /export function removeRealtimeChannel\(/,
      /export function disconnectRealtimeClient\(/,
      /export function getRealtimeCreateClientHook\(/,
    ],
    'cloud sync realtime shared'
  );

  assertMatchesAll(
    assert,
    mod,
    [
      /function isRealtimeClientLike\(/,
      /function asRealtimeCreateClient\(/,
      /function asRealtimeModule\(/,
      /export async function resolveRealtimeCreateClient\(/,
      /getRealtimeCreateClientHook\(/,
    ],
    'cloud sync realtime module'
  );
});
