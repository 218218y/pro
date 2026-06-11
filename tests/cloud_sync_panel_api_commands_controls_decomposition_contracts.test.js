import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_controls.ts',
  import.meta.url
);
const shared = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_controls_shared.ts',
  import.meta.url
);
const reads = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_controls_reads.ts',
  import.meta.url
);
const mutations = readSource(
  '../esm/native/services/cloud_sync_panel_api_commands_controls_mutations.ts',
  import.meta.url
);

test('cloud sync panel api control commands keep a thin facade over shared/read/mutation seams', () => {
  assertMatchesAll(assert, facade, [
    /cloud_sync_panel_api_commands_controls_reads\.js/,
    /cloud_sync_panel_api_commands_controls_mutations\.js/,
    /export type \{ CloudSyncPanelApiControlCommands \}/,
    /createCloudSyncPanelApiControlCommands\(/,
  ]);

  assertLacksAll(assert, facade, [
    /buildCloudSyncPanelApiOp\(/,
    /runSite2TabsGateCommand\(/,
    /toggleSite2TabsGateCommand\(/,
    /publishSite2TabsGateSnapshot\(/,
  ]);

  assertMatchesAll(assert, shared, [
    /export type CloudSyncPanelApiControlCommands = Required</,
    /buildCloudSyncPanelApiControlOp\(/,
    /buildSite2TabsGateCommandDeps\(/,
    /readSite2TabsGateCommandFailure\(/,
    /buildCloudSyncPanelApiOp\(/,
    /readCloudSyncErrorMessage\(/,
  ]);

  assertMatchesAll(assert, reads, [
    /createCloudSyncPanelApiControlReadCommands\(/,
    /isSite2TabsGateEnabled:/,
    /getSite2TabsGateSnapshot: snapshots\.getSite2TabsGateSnapshot/,
    /getSite2TabsGateOpen:/,
    /getSite2TabsGateUntil:/,
  ]);

  assertMatchesAll(assert, mutations, [
    /createCloudSyncPanelApiControlMutationCommands\(/,
    /buildSite2TabsGateCommandDeps\(/,
    /runSite2TabsGateCommand\(/,
    /toggleSite2TabsGateCommand\(/,
    /publishSite2TabsGateSnapshot\(/,
  ]);
});
