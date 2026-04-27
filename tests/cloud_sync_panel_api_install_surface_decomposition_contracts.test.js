import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const facade = readSource('../esm/native/services/cloud_sync_panel_api_install_surface.ts', import.meta.url);
const reads = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_reads.ts',
  import.meta.url
);
const mutations = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_mutations.ts',
  import.meta.url
);
const runtime = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_runtime.ts',
  import.meta.url
);

test('[cloud-sync-panel-install-surface] facade stays thin while dedicated owners hold stable read, mutation, and runtime install flows', () => {
  assertMatchesAll(
    assert,
    facade,
    [
      /cloud_sync_panel_api_install_surface_runtime\.js/,
      /export \{\s*installCloudSyncPanelApiRefs,\s*deactivateCloudSyncPanelApiSurface,\s*installCloudSyncPanelApiSurface,?/,
    ],
    'facade'
  );
  assertLacksAll(
    assert,
    facade,
    [/installStableSurfaceMethod/, /function installCloudSyncPanelApiRefs\(/],
    'facade'
  );

  assertMatchesAll(
    assert,
    reads,
    [
      /export function installCloudSyncPanelApiReadRefs\(/,
      /installStableSurfaceMethod/,
      /subscribeCloudSyncBridge/,
      /getSite2TabsGateUntil/,
    ],
    'reads'
  );

  assertMatchesAll(
    assert,
    mutations,
    [
      /export function installCloudSyncPanelApiMutationRefs\(/,
      /installStableSurfaceMethod/,
      /copyShareLink/,
      /toggleSite2TabsGateOpen/,
    ],
    'mutations'
  );

  assertMatchesAll(
    assert,
    runtime,
    [
      /export function installCloudSyncPanelApiRefs\(/,
      /installCloudSyncPanelApiReadRefs\(/,
      /installCloudSyncPanelApiMutationRefs\(/,
      /refreshCloudSyncPanelApiBridgeSubscriptions\(/,
    ],
    'runtime'
  );
});
