import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_panel_api_commands.ts', import.meta.url);
const shared = readSource('../esm/native/services/cloud_sync_panel_api_commands_shared.ts', import.meta.url);
const singleflight = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_singleflight.ts',
  import.meta.url
);

test('cloud sync panel api commands keep a thin facade over static and single-flight seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_panel_api_commands_runtime\.js/,
    /cloud_sync_panel_api_commands_controls\.js/,
    /cloud_sync_panel_api_commands_shared\.js/,
    /cloud_sync_panel_api_commands_singleflight\.js/,
    /createCloudSyncPanelApiCommands\(/,
    /createCloudSyncPanelApiStaticCommands\(/,
    /createCloudSyncPanelApiSingleFlightCommands\(/,
  ]);

  assertLacksAll(assert, facade, [
    /runCloudSyncOwnedAsyncFamilySingleFlight\(/,
    /cloudSyncPanelApiCopyShareLinkFlights/,
    /cloudSyncPanelApiDeleteTempFlights/,
    /cloudSyncPanelApiFloatingSyncFlights/,
    /cloudSyncPanelApiSite2TabsGateFlights/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type CloudSyncPanelApiDeleteTempKey = 'models' \| 'colors';/,
    /cloudSyncPanelApiCopyShareLinkFlights/,
    /cloudSyncPanelApiSyncSketchFlights/,
    /cloudSyncPanelApiDeleteTempFlights/,
    /cloudSyncPanelApiFloatingSyncFlights/,
    /cloudSyncPanelApiSite2TabsGateFlights/,
    /createCloudSyncPanelApiStaticCommands\(/,
    /getPanelSnapshot: snapshots\.getPanelSnapshot/,
    /getShareLink: runtime\.getShareLink/,
    /getSite2TabsGateSnapshot: controls\.getSite2TabsGateSnapshot/,
  ]);

  assertMatchesAll(assert, singleflight, [
    /createCloudSyncPanelApiSingleFlightCommands\(/,
    /runCloudSyncPanelApiSingleFlight\(/,
    /runCloudSyncOwnedAsyncFamilySingleFlight\(/,
    /copyShareLink:/,
    /syncSketchNow:/,
    /setFloatingSketchSyncEnabled:/,
    /deleteTemporaryModels:/,
    /setSite2TabsGateOpen:/,
  ]);
});
