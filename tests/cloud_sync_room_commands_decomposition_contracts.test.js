import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_room_commands.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_room_commands_shared.ts', import.meta.url);
const mode = readSource('../esm/native/services/cloud_sync_room_commands_mode.ts', import.meta.url);
const copy = readSource('../esm/native/services/cloud_sync_room_commands_copy.ts', import.meta.url);
const runtimeShared = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_runtime_shared.ts',
  import.meta.url
);

test('cloud sync room commands keep a thin facade over shared/mode/copy seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_room_commands_shared\.js/,
    /cloud_sync_room_commands_mode\.js/,
    /cloud_sync_room_commands_copy\.js/,
    /runCloudSyncRoomModeCommand/,
    /runCloudSyncCopyShareLinkCommand/,
  ]);

  assertLacksAll(assert, facade, [
    /function readRoomString\(/,
    /function buildPrivateRoomValue\(/,
    /function runCloudSyncRoomModeCommand\(/,
    /function runCloudSyncCopyShareLinkCommand\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type CloudSyncRoomMode = 'public' \| 'private'/,
    /export type CloudSyncRoomCommandDeps = \{/,
    /export type CloudSyncCopyShareLinkCommandDeps = \{/,
    /export function readRoomString\(/,
    /export function buildCloudSyncShareLink\(/,
    /export function describeCloudSyncRoomStatus\(/,
  ]);

  assertMatchesAll(assert, mode, [
    /normalizeUnknownError\(/,
    /buildPrivateRoomValue\(/,
    /buildCloudSyncShareLink\(/,
    /export function runCloudSyncRoomModeCommand\(/,
  ]);

  assertMatchesAll(assert, copy, [
    /writeClipboardTextResultViaBrowser\(/,
    /normalizeUnknownError\(/,
    /promptSink\.prompt\(/,
    /export async function runCloudSyncCopyShareLinkCommand\(/,
  ]);

  assertMatchesAll(assert, runtimeShared, [
    /import \{ buildCloudSyncShareLink \} from '\.\/cloud_sync_room_commands\.js';/,
    /computeShareLink: \(\): string => buildCloudSyncShareLink\(cfg, getCurrentRoom\(\)\)/,
  ]);
  assertLacksAll(assert, runtimeShared, [/export function buildCloudSyncShareLink\(/]);
});
