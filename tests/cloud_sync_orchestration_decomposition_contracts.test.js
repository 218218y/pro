import test from 'node:test';
import assert from 'node:assert/strict';

import { readSource, assertMatchesAll, assertLacksAll } from './_source_bundle.js';

const panelFacade = readSource('../esm/native/services/cloud_sync_panel_api_install.ts', import.meta.url);
const panelSharedFacade = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_shared.ts',
  import.meta.url
);
const panelContextOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_context_runtime.ts',
  import.meta.url
);
const panelContractsOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_contracts.ts',
  import.meta.url
);
const panelPublicSnapshotsOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_public_snapshots.ts',
  import.meta.url
);
const panelBridgeOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_bridges.ts',
  import.meta.url
);
const panelSurfaceFacade = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface.ts',
  import.meta.url
);
const panelSurfaceReadOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_reads.ts',
  import.meta.url
);
const panelSurfaceMutationOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_mutations.ts',
  import.meta.url
);
const panelSurfaceRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_panel_api_install_surface_runtime.ts',
  import.meta.url
);

const lifecycleFacade = readSource('../esm/native/services/cloud_sync_lifecycle_support.ts', import.meta.url);
const lifecycleSharedFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_shared.ts',
  import.meta.url
);
const lifecycleBindingsOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_bindings.ts',
  import.meta.url
);
const lifecycleRefreshOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_refresh.ts',
  import.meta.url
);
const lifecycleRealtimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_realtime.ts',
  import.meta.url
);
const lifecyclePollingFacade = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling.ts',
  import.meta.url
);
const lifecyclePollingSharedOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_shared.ts',
  import.meta.url
);
const lifecyclePollingRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_runtime.ts',
  import.meta.url
);
const lifecyclePollingStartRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_start_runtime.ts',
  import.meta.url
);
const lifecyclePollingStatusRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_status_runtime.ts',
  import.meta.url
);
const lifecyclePollingTickRuntimeOwner = readSource(
  '../esm/native/services/cloud_sync_lifecycle_support_polling_tick_runtime.ts',
  import.meta.url
);

test('[cloud-sync-orchestration] panel api install and lifecycle support stay thin while dedicated owners hold bridge, surface, and polling logic', () => {
  assertMatchesAll(
    assert,
    panelFacade,
    [
      /cloud_sync_panel_api_install_shared\.js/,
      /cloud_sync_panel_api_install_surface\.js/,
      /export \{\s*installCloudSyncPanelApiRefs,\s*deactivateCloudSyncPanelApiSurface,\s*installCloudSyncPanelApiSurface,?/,
    ],
    'panelFacade'
  );
  assertLacksAll(
    assert,
    panelFacade,
    [
      /const cloudSyncPanelApiBridges = new WeakMap/,
      /function installCloudSyncPanelApiRefs\(/,
      /function relayCloudSyncBridgeValue\(/,
      /function createCloudSyncPanelApiInstallContext\(/,
    ],
    'panelFacade'
  );

  assertMatchesAll(
    assert,
    panelSharedFacade,
    [
      /cloud_sync_panel_api_install_context_runtime\.js/,
      /cloud_sync_panel_api_install_surface_contracts\.js/,
      /cloud_sync_panel_api_install_public_snapshots\.js/,
      /readCloudSyncPanelApiSite2TabsGateSnapshot/,
    ],
    'panelSharedFacade'
  );
  assertLacksAll(
    assert,
    panelSharedFacade,
    [
      /const cloudSyncPanelApiInstallContexts = new WeakMap/,
      /export const CLOUD_SYNC_PANEL_API_STABLE_METHOD_SPECS = \[/,
      /function clearLegacyInstalledCloudSyncPanelApiDrift\(/,
      /function invokeCloudSyncPanelApi</,
    ],
    'panelSharedFacade'
  );
  assertMatchesAll(
    assert,
    panelContextOwner,
    [
      /const cloudSyncPanelApiInstallContexts = new WeakMap/,
      /export function createCloudSyncPanelApiInstallContext\(/,
      /export function resolveCloudSyncPanelApiInstallContext\(/,
      /export function invokeCloudSyncPanelApi</,
    ],
    'panelContextOwner'
  );
  assertMatchesAll(
    assert,
    panelContractsOwner,
    [
      /export const CLOUD_SYNC_PANEL_API_STABLE_METHOD_SPECS = \[/,
      /export function clearLegacyInstalledCloudSyncPanelApiDrift\(/,
      /__wpCloudSyncGetCurrentRoom/,
      /__wpCloudSyncToggleSite2TabsGateOpen/,
    ],
    'panelContractsOwner'
  );
  assertMatchesAll(
    assert,
    panelPublicSnapshotsOwner,
    [
      /export function readCloudSyncPanelApiRuntimeStatus\(/,
      /export function readCloudSyncPanelApiPanelSnapshot\(/,
      /export function readCloudSyncPanelApiSite2TabsGateSnapshot\(/,
      /cloneCloudSyncPublicRuntimeStatus/,
    ],
    'panelPublicSnapshotsOwner'
  );
  assertMatchesAll(
    assert,
    panelBridgeOwner,
    [
      /const cloudSyncPanelApiBridges = new WeakMap/,
      /export function resolveCloudSyncPanelApiBridges\(/,
      /export function refreshCloudSyncPanelApiBridgeSubscriptions\(/,
      /export function subscribeCloudSyncBridge</,
    ],
    'panelBridgeOwner'
  );
  assertMatchesAll(
    assert,
    panelSurfaceFacade,
    [
      /cloud_sync_panel_api_install_surface_runtime\.js/,
      /export \{\s*installCloudSyncPanelApiRefs,\s*deactivateCloudSyncPanelApiSurface,\s*installCloudSyncPanelApiSurface,?/,
    ],
    'panelSurfaceFacade'
  );
  assertLacksAll(
    assert,
    panelSurfaceFacade,
    [
      /installStableSurfaceMethod/,
      /function installCloudSyncPanelApiRefs\(/,
      /function installCloudSyncPanelApiSurface\(/,
    ],
    'panelSurfaceFacade'
  );
  assertMatchesAll(
    assert,
    panelSurfaceReadOwner,
    [
      /export function installCloudSyncPanelApiReadRefs\(/,
      /installStableSurfaceMethod/,
      /subscribeCloudSyncBridge/,
      /readCloudSyncPanelApiPanelSnapshot/,
    ],
    'panelSurfaceReadOwner'
  );
  assertMatchesAll(
    assert,
    panelSurfaceMutationOwner,
    [
      /export function installCloudSyncPanelApiMutationRefs\(/,
      /installStableSurfaceMethod/,
      /invokeCloudSyncPanelApi\(/,
      /toggleSite2TabsGateOpen/,
    ],
    'panelSurfaceMutationOwner'
  );
  assertMatchesAll(
    assert,
    panelSurfaceRuntimeOwner,
    [
      /export function installCloudSyncPanelApiRefs\(/,
      /installCloudSyncPanelApiReadRefs\(/,
      /installCloudSyncPanelApiMutationRefs\(/,
      /export function installCloudSyncPanelApiSurface\(/,
    ],
    'panelSurfaceRuntimeOwner'
  );

  assertMatchesAll(
    assert,
    lifecycleFacade,
    [
      /cloud_sync_lifecycle_support_bindings\.js/,
      /cloud_sync_lifecycle_support_refresh\.js/,
      /cloud_sync_lifecycle_support_realtime\.js/,
      /cloud_sync_lifecycle_support_polling\.js/,
      /export \{\s*stopCloudSyncPolling,\s*startCloudSyncPolling,\s*markCloudSyncRealtimeEvent,?/,
    ],
    'lifecycleFacade'
  );
  assertLacksAll(
    assert,
    lifecycleFacade,
    [
      /function syncCloudSyncPollingStatusInPlace\(/,
      /function isMutablePollingBranch\(/,
      /export function runCloudSyncPullAllNow\(/,
      /export function addCloudSyncLifecycleListener\(/,
    ],
    'lifecycleFacade'
  );
  assertMatchesAll(
    assert,
    lifecycleSharedFacade,
    [
      /cloud_sync_lifecycle_support_bindings\.js/,
      /cloud_sync_lifecycle_support_refresh\.js/,
      /cloud_sync_lifecycle_support_realtime\.js/,
    ],
    'lifecycleSharedFacade'
  );
  assertLacksAll(
    assert,
    lifecycleSharedFacade,
    [
      /export function addCloudSyncLifecycleListener\(/,
      /export function requestCloudSyncLifecycleRefresh\(/,
      /export function syncCloudSyncRealtimeStatusInPlace\(/,
    ],
    'lifecycleSharedFacade'
  );
  assertMatchesAll(
    assert,
    lifecycleBindingsOwner,
    [
      /export function addCloudSyncLifecycleListener\(/,
      /export function normalizeCloudSyncPullAllNowOptions\(/,
      /export function runCloudSyncPullAllNow\(/,
      /triggerCloudSyncPullAllScopes\(/,
    ],
    'lifecycleBindingsOwner'
  );
  assertMatchesAll(
    assert,
    lifecycleRefreshOwner,
    [
      /export function requestCloudSyncLifecycleRefresh\(/,
      /readCloudSyncLifecycleRefreshBlockReason\(/,
      /normalizeCloudSyncPullAllNowOptions\(/,
    ],
    'lifecycleRefreshOwner'
  );
  assertMatchesAll(
    assert,
    lifecycleRealtimeOwner,
    [
      /export function syncCloudSyncRealtimeStatusInPlace\(/,
      /function isMutableRealtimeBranch\(/,
      /branch\.channel =/,
    ],
    'lifecycleRealtimeOwner'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingFacade,
    [
      /cloud_sync_lifecycle_support_polling_shared\.js/,
      /cloud_sync_lifecycle_support_polling_runtime\.js/,
      /export \{\s*stopCloudSyncPolling,\s*startCloudSyncPolling,\s*markCloudSyncRealtimeEvent,?/,
    ],
    'lifecyclePollingFacade'
  );
  assertLacksAll(
    assert,
    lifecyclePollingFacade,
    [
      /function syncCloudSyncPollingStatusInPlace\(/,
      /function hasCanonicalPollingStatus\(/,
      /function clearCloudSyncPollingTimer\(/,
    ],
    'lifecyclePollingFacade'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingSharedOwner,
    [
      /export function isMutablePollingBranch\(/,
      /export function syncCloudSyncPollingStatusInPlace\(/,
      /export function hasCanonicalPollingStatus\(/,
      /export function clearCloudSyncPollingTimer\(/,
    ],
    'lifecyclePollingSharedOwner'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingRuntimeOwner,
    [
      /cloud_sync_lifecycle_support_polling_start_runtime\.js/,
      /cloud_sync_lifecycle_support_polling_status_runtime\.js/,
      /export \{ startCloudSyncPolling \}/,
      /markCloudSyncRealtimeEvent/,
    ],
    'lifecyclePollingRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingStartRuntimeOwner,
    [
      /export function startCloudSyncPolling\(/,
      /createCloudSyncPollingTick\(/,
      /syncCloudSyncPollingStatusInPlace\(/,
      /stopCloudSyncPolling\(/,
    ],
    'lifecyclePollingStartRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingStatusRuntimeOwner,
    [
      /export function stopCloudSyncPolling\(/,
      /export function markCloudSyncRealtimeEvent\(/,
      /clearCloudSyncPollingTimer\(/,
      /hasCanonicalPollingStatus\(/,
    ],
    'lifecyclePollingStatusRuntimeOwner'
  );
  assertMatchesAll(
    assert,
    lifecyclePollingTickRuntimeOwner,
    [
      /export function createCloudSyncPollingTick\(/,
      /requestCloudSyncLifecycleRefresh\(/,
      /createCloudSyncPollingRefreshProfile\(/,
      /clearCloudSyncPollingTimer\(/,
    ],
    'lifecyclePollingTickRuntimeOwner'
  );
});
