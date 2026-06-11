import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_panel_api_commands_runtime.ts', import.meta.url);
const shared = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_runtime_shared.ts',
  import.meta.url
);
const room = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_runtime_room.ts',
  import.meta.url
);
const mutations = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_runtime_mutations.ts',
  import.meta.url
);

test('cloud sync panel api runtime commands keep a thin facade over shared/room/mutation seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_panel_api_commands_runtime_shared\.js/,
    /cloud_sync_panel_api_commands_runtime_room\.js/,
    /cloud_sync_panel_api_commands_runtime_mutations\.js/,
    /export type \{ CloudSyncPanelApiRuntimeCommands \}/,
    /createCloudSyncPanelApiRuntimeCommands\(/,
  ]);

  assertLacksAll(assert, facade, [
    /runCloudSyncRoomModeCommand\(/,
    /runCloudSyncCopyShareLinkCommand\(/,
    /runFloatingSketchSyncPinCommand\(/,
    /deleteTemporaryModelsInCloud\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type CloudSyncPanelApiRuntimeCommands = Required</,
    /createCloudSyncPanelApiRuntimeShared\(/,
    /buildCloudSyncPanelApiOp\(/,
    /getCloudSyncDiagStorageMaybe\(/,
    /readDeleteTempFailure:/,
    /readSyncPinFailure:/,
  ]);

  assertMatchesAll(assert, room, [
    /createCloudSyncPanelApiRoomCommands\(/,
    /runCloudSyncRoomModeCommand\(/,
    /runCloudSyncCopyShareLinkCommand\(/,
    /cloneCloudSyncRuntimeStatus\(/,
    /snapshots\.publishPanelSnapshot\(/,
  ]);

  assertMatchesAll(assert, mutations, [
    /createCloudSyncPanelApiMutationCommands\(/,
    /runFloatingSketchSyncPinCommand\(/,
    /toggleFloatingSketchSyncPinCommand\(/,
    /subscribeFloatingSketchSyncEnabledState\(/,
    /deleteTemporaryModelsInCloud\(/,
    /deleteTemporaryColorsInCloud\(/,
  ]);
});
