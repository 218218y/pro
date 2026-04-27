import test from 'node:test';
import assert from 'node:assert/strict';

import {
  readSource,
  bundleSources,
  assertMatchesAll,
  assertLacksAll,
  normalizeWhitespace,
} from './_source_bundle.js';

const owner = readSource('../esm/native/services/cloud_sync.ts', import.meta.url);
const ownerContext = bundleSources(
  [
    '../esm/native/services/cloud_sync_owner_context.ts',
    '../esm/native/services/cloud_sync_owner_context_shared.ts',
    '../esm/native/services/cloud_sync_owner_context_create.ts',
    '../esm/native/services/cloud_sync_owner_context_runtime.ts',
    '../esm/native/services/cloud_sync_owner_context_runtime_shared.ts',
    '../esm/native/services/cloud_sync_owner_context_runtime_access.ts',
    '../esm/native/services/cloud_sync_owner_context_runtime_client.ts',
    '../esm/native/services/cloud_sync_owner_context_rooms.ts',
    '../esm/native/services/cloud_sync_owner_context_diag.ts',
    '../esm/native/services/cloud_sync_owner_context_diag_runtime.ts',
    '../esm/native/services/cloud_sync_owner_context_status_publication_runtime.ts',
  ],
  import.meta.url
);
const ownerBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync.ts',
    '../esm/native/services/cloud_sync_service_install_runtime.ts',
    '../esm/native/services/cloud_sync_service_install_error.ts',
    '../esm/native/services/cloud_sync_install_runtime.ts',
    '../esm/native/services/cloud_sync_install_runtime_shared.ts',
    '../esm/native/services/cloud_sync_install_runtime_ops.ts',
    '../esm/native/services/cloud_sync_delete_temp.ts',
    '../esm/native/services/cloud_sync_delete_temp_shared.ts',
    '../esm/native/services/cloud_sync_delete_temp_write.ts',
    '../esm/native/services/cloud_sync_delete_temp_runtime.ts',
    '../esm/native/services/cloud_sync_install_runtime_panel.ts',
    '../esm/native/services/cloud_sync_install_runtime_create.ts',
    '../esm/native/services/cloud_sync_install_lifecycle.ts',
    '../esm/native/services/cloud_sync_install_lifecycle_shared.ts',
    '../esm/native/services/cloud_sync_install_lifecycle_setup.ts',
    '../esm/native/services/cloud_sync_install_lifecycle_runtime.ts',
    '../esm/native/services/cloud_sync_install_lifecycle_runtime_setup.ts',
    '../esm/native/services/cloud_sync_install_support.ts',
    '../esm/native/services/cloud_sync_install_support_shared.ts',
    '../esm/native/services/cloud_sync_install_support_publication.ts',
    '../esm/native/services/cloud_sync_install_support_publication_shared.ts',
    '../esm/native/services/cloud_sync_install_support_publication_cleanup_shared.ts',
    '../esm/native/services/cloud_sync_install_support_publication_preservation_shared.ts',
    '../esm/native/services/cloud_sync_install_support_publication_runtime.ts',
    '../esm/native/services/cloud_sync_install_support_coalescer.ts',
    '../esm/native/services/cloud_sync_coalescer.ts',
    '../esm/native/services/cloud_sync_coalescer_shared.ts',
    '../esm/native/services/cloud_sync_coalescer_policy.ts',
    '../esm/native/services/cloud_sync_coalescer_diag.ts',
    '../esm/native/services/cloud_sync_coalescer_runtime.ts',
    '../esm/native/services/cloud_sync_coalescer_runtime_shared.ts',
    '../esm/native/services/cloud_sync_coalescer_controls_runtime.ts',
    '../esm/native/services/cloud_sync_coalescer_queue_runtime.ts',
    '../esm/native/services/cloud_sync_main_row.ts',
    '../esm/native/services/cloud_sync_main_row_shared.ts',
    '../esm/native/services/cloud_sync_main_row_pull.ts',
    '../esm/native/services/cloud_sync_main_row_pull_shared.ts',
    '../esm/native/services/cloud_sync_main_row_pull_runtime.ts',
    '../esm/native/services/cloud_sync_main_row_push.ts',
    '../esm/native/services/cloud_sync_main_row_push_shared.ts',
    '../esm/native/services/cloud_sync_main_row_push_runtime.ts',
    '../esm/native/services/cloud_sync_main_row_remote.ts',
    '../esm/native/services/cloud_sync_main_row_remote_shared.ts',
    '../esm/native/services/cloud_sync_main_row_remote_push.ts',
    '../esm/native/services/cloud_sync_main_row_remote_pull.ts',
    '../esm/native/services/cloud_sync_main_row_remote_runtime.ts',
    '../esm/native/services/cloud_sync_panel_api_install.ts',
    '../esm/native/services/cloud_sync_panel_api_install_shared.ts',
    '../esm/native/services/cloud_sync_panel_api_install_context_runtime.ts',
    '../esm/native/services/cloud_sync_panel_api_install_surface_contracts.ts',
    '../esm/native/services/cloud_sync_panel_api_install_public_snapshots.ts',
    '../esm/native/services/cloud_sync_panel_api_install_bridges.ts',
    '../esm/native/services/cloud_sync_panel_api_install_surface.ts',
    '../esm/native/services/cloud_sync_panel_api_install_surface_reads.ts',
    '../esm/native/services/cloud_sync_panel_api_install_surface_mutations.ts',
    '../esm/native/services/cloud_sync_panel_api_install_surface_runtime.ts',
    '../esm/native/services/cloud_sync_status_install.ts',
    '../esm/native/services/cloud_sync_status_install_shared.ts',
    '../esm/native/services/cloud_sync_status_install_sync_runtime.ts',
    '../esm/native/services/cloud_sync_status_install_freshness_runtime.ts',
    '../esm/native/services/cloud_sync_status_install_runtime.ts',
    '../esm/native/services/cloud_sync_owner_support.ts',
    '../esm/native/services/cloud_sync_owner_support_shared.ts',
    '../esm/native/services/cloud_sync_owner_support_cleanup.ts',
    '../esm/native/services/cloud_sync_owner_support_pulls.ts',
    '../esm/native/services/cloud_sync_owner_support_panel_api.ts',
    '../esm/native/services/cloud_sync_owner_context.ts',
    '../esm/native/services/cloud_sync_owner_context_shared.ts',
    '../esm/native/services/cloud_sync_owner_context_create.ts',
    '../esm/native/services/cloud_sync_owner_context_rooms.ts',
    '../esm/native/services/cloud_sync_pull_scopes.ts',
    '../esm/native/services/cloud_sync_pull_scopes_shared.ts',
    '../esm/native/services/cloud_sync_pull_scopes_pull.ts',
    '../esm/native/services/cloud_sync_pull_scopes_realtime.ts',
    '../esm/native/services/cloud_sync_config.ts',
    '../esm/native/services/cloud_sync_config_shared.ts',
    '../esm/native/services/cloud_sync_config_sources.ts',
    '../esm/native/services/cloud_sync_config_browser.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const lifecycle = readSource('../esm/native/services/cloud_sync_lifecycle.ts', import.meta.url);
const lifecycleBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_lifecycle.ts',
    '../esm/native/services/cloud_sync_lifecycle_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_state.ts',
    '../esm/native/services/cloud_sync_lifecycle_bindings.ts',
    '../esm/native/services/cloud_sync_lifecycle_polling.ts',
    '../esm/native/services/cloud_sync_lifecycle_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_runtime_setup.ts',
    '../esm/native/services/cloud_sync_lifecycle_runtime_start.ts',
    '../esm/native/services/cloud_sync_lifecycle_runtime_dispose.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention_diag.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention_pulls.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention_pulls_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_attention_pulls_handlers.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const realtimeLifecycle = readSource(
  '../esm/native/services/cloud_sync_lifecycle_realtime.ts',
  import.meta.url
);
const realtimeBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_lifecycle_realtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_state.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_start.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_runtime_dispose.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport_cleanup.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport_status.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_transport_controls.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_bindings.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_status.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_subscribe_status_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_channel_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_payload.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_send_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_broadcast_route_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_status_shared.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_transition_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_subscription_runtime.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_status.ts',
    '../esm/native/services/cloud_sync_lifecycle_realtime_support_cleanup.ts',
    '../esm/native/services/cloud_sync_realtime.ts',
    '../esm/native/services/cloud_sync_realtime_shared.ts',
    '../esm/native/services/cloud_sync_realtime_module.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const configOwner = readSource('../esm/native/services/cloud_sync_config.ts', import.meta.url);
const configBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_config.ts',
    '../esm/native/services/cloud_sync_config_shared.ts',
    '../esm/native/services/cloud_sync_config_sources.ts',
    '../esm/native/services/cloud_sync_config_browser.ts',
  ],
  import.meta.url
);
const tabsGateBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_tabs_gate.ts',
    '../esm/native/services/cloud_sync_tabs_gate_shared.ts',
    '../esm/native/services/cloud_sync_tabs_gate_local.ts',
    '../esm/native/services/cloud_sync_tabs_gate_local_shared.ts',
    '../esm/native/services/cloud_sync_tabs_gate_local_timers.ts',
    '../esm/native/services/cloud_sync_tabs_gate_local_runtime.ts',
    '../esm/native/services/cloud_sync_tabs_gate_support.ts',
    '../esm/native/services/cloud_sync_tabs_gate_snapshot.ts',
    '../esm/native/services/cloud_sync_tabs_gate_snapshot_shared.ts',
    '../esm/native/services/cloud_sync_tabs_gate_snapshot_runtime.ts',
    '../esm/native/services/cloud_sync_tabs_gate_remote.ts',
    '../esm/native/services/cloud_sync_tabs_gate_remote_shared.ts',
    '../esm/native/services/cloud_sync_tabs_gate_remote_pull.ts',
    '../esm/native/services/cloud_sync_tabs_gate_remote_push.ts',
    '../esm/native/services/cloud_sync_tabs_gate_remote_runtime.ts',
    '../esm/native/services/cloud_sync_tabs_gate_command.ts',
    '../esm/native/services/cloud_sync_tabs_gate_command_shared.ts',
    '../esm/native/services/cloud_sync_tabs_gate_command_runtime.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const sketchBundle = bundleSources(
  [
    '../esm/native/services/cloud_sync_sketch_ops.ts',
    '../esm/native/services/cloud_sync_sketch_ops_shared.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating_shared.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating_state.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating_pull.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating_push.ts',
    '../esm/native/services/cloud_sync_sketch_ops_floating_runtime.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_shared.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_state.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_load.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_pull.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_push.ts',
    '../esm/native/services/cloud_sync_sketch_ops_sketch_runtime.ts',
    '../esm/native/services/cloud_sync_sketch_pull_load.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);
const siteVariant = readSource('../esm/native/services/site_variant.ts', import.meta.url);
const bootController = bundleSources(
  ['../esm/native/ui/ui_boot_controller_runtime.ts', '../esm/native/ui/ui_boot_controller_viewport.ts'],
  import.meta.url,
  { stripNoise: true }
);
const cloudSupportBundle = [
  readSource('../esm/native/services/cloud_sync_support.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_shared.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_shared_core.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_payload.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_runtime_status.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_serialize.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_storage.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_storage_shared.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_storage_read.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_storage_write.ts', import.meta.url),
  readSource('../esm/native/services/cloud_sync_support_capture.ts', import.meta.url),
].join('\n');
const cloudSketchPullLoadSrc = readSource(
  '../esm/native/services/cloud_sync_sketch_pull_load.ts',
  import.meta.url
);
const kernelSrc = readSource('../esm/native/kernel/kernel.ts', import.meta.url);
const panelBundle = normalizeWhitespace(
  [
    readSource('../esm/native/services/cloud_sync_panel_api.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_singleflight.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_runtime.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_runtime_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_runtime_room.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_runtime_mutations.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_controls.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_controls_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_controls_reads.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_commands_controls_mutations.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_runtime_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_publish_runtime.ts', import.meta.url),
    readSource(
      '../esm/native/services/cloud_sync_panel_api_snapshots_subscription_runtime.ts',
      import.meta.url
    ),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_sources.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_runtime.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_snapshots_reads.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_support.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_support_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_support_snapshots.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_room_commands.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_room_commands_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_room_commands_mode.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_room_commands_copy.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_public_support.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_public_support_shared.ts', import.meta.url),
    readSource('../esm/native/services/cloud_sync_panel_api_public_support_runtime.ts', import.meta.url),
  ].join('\n')
);
const cloudSyncAccess = readSource('../esm/native/runtime/cloud_sync_access.ts', import.meta.url);
const cloudTypes = readSource('../types/cloud_sync.ts', import.meta.url);
const runtimeTypes = readSource('../types/runtime.ts', import.meta.url);
const typesIndex = readSource('../types/index.ts', import.meta.url);
const appTypes = readSource('../types/app.ts', import.meta.url);
const buildTypes = readSource('../types/build_runtime.ts', import.meta.url);
const reactBundle = bundleSources(
  [
    '../esm/native/ui/react/cloud_sync_ui_action_controller_runtime.ts',
    '../esm/native/ui/react/cloud_sync_ui_action_controller_shared.ts',
    '../esm/native/ui/react/cloud_sync_ui_action_controller_commands.ts',
    '../esm/native/ui/react/cloud_sync_ui_action_controller_room.ts',
    '../esm/native/ui/react/cloud_sync_ui_action_controller_mutations.ts',
    '../esm/native/ui/react/actions/cloud_sync_actions.ts',
    '../esm/native/ui/react/panels/cloud_sync_panel_actions.ts',
    '../esm/native/ui/react/overlay_quick_actions_dock.tsx',
    '../esm/native/ui/react/sidebar_header_actions.ts',
  ],
  import.meta.url,
  { stripNoise: true }
);

test('cloud sync family keeps one thin owner over canonical install/config/realtime seams', () => {
  assert.match(runtimeTypes, /realtimeMode\?: 'broadcast';/);
  assert.match(cloudTypes, /mode: 'broadcast';/);
  assert.doesNotMatch(runtimeTypes, /postgres_changes/);
  assert.doesNotMatch(cloudTypes, /postgres_changes/);
  assert.match(configBundle, /function normalizeRealtimeMode\(v: unknown\): 'broadcast' \{/);
  assertMatchesAll(
    assert,
    realtimeBundle,
    [
      /private: false/,
      /broadcast: \{ self: false, ack: false \}/,
      /bindCloudSyncRealtimeBroadcastListener\(/,
    ],
    'cloud sync realtime bundle'
  );
  assertMatchesAll(
    assert,
    lifecycle,
    [/cloud_sync_lifecycle_shared\.js/, /cloud_sync_lifecycle_runtime\.js/, /createCloudSyncLifecycleOps/],
    'cloud sync lifecycle facade'
  );
  assertMatchesAll(
    assert,
    lifecycleBundle,
    [
      /createCloudSyncRealtimeLifecycle/,
      /createCloudSyncLifecycleMutableState/,
      /createCloudSyncLifecyclePollingTransitions/,
      /bindCloudSyncAttentionPulls/,
      /bindCloudSyncDiagStorageListener/,
    ],
    'cloud sync lifecycle bundle'
  );
  assert.doesNotMatch(realtimeLifecycle, /postgres_changes/);

  assertMatchesAll(
    assert,
    owner,
    [/cloud_sync_service_install_runtime\.js/, /installCloudSyncService/],
    'cloud sync owner'
  );

  assertMatchesAll(
    assert,
    ownerBundle,
    [
      /\bcreateCloudSyncPullCoalescerFactory\b/,
      /\bcreateCloudSyncInstallPullRunnerMap\b/,
      /\bcreateCloudSyncPullCoalescerMap\b/,
      /\bcreateCloudSyncRealtimePullScopeHandlerMap\b/,
      /\bcreateCloudSyncRealtimeScopedHandlerMap\b/,
      /\bcreateCloudSyncRealtimeScopedHandlerMapFromTriggers\b/,
      /\bforEachCloudSyncRealtimeScopedHandlerScope\b/,
      /\btriggerCloudSyncPullScopes\b/,
      /\binstallCloudSyncOwnerLifecycle\b/,
      /\bcreateCloudSyncOwnerContext\b/,
      /\breadCfg\b/,
      /\bcreateCloudSyncInstallRuntime\b/,
      /\bcreateCloudSyncInstallRuntimeOps\b/,
      /\bcreateCloudSyncDeleteTempOps\b/,
      /\bresolveDeleteTempPayload\b/,
      /\bwriteDeleteTempPayloadAndApplyLocally\b/,
      /\binstallCloudSyncInstallRuntimePanelApi\b/,
      /\bcreateCloudSyncMainRowOps\b/,
      /\bcreateCloudSyncMainRowMutableState\b/,
      /\bcreateCloudSyncMainRowPullFlow\b/,
      /\bcreateCloudSyncMainRowPushFlow\b/,
      /\binstallCloudSyncPanelApiSurface\b/,
      /\binstallCloudSyncStatusSurface\b/,
      /\bcanInvokeCloudSyncPublishedDispose\b/,
      /\bclearCloudSyncPublishedState\b/,
      /getRoomFromUrl\(/,
      /setRoomInUrl\(/,
    ],
    'cloud sync owner bundle'
  );
});

test('cloud sync family keeps config, site routing, and catchup decisions on shared seams', () => {
  assertMatchesAll(
    assert,
    configOwner,
    [
      /from '\.\/cloud_sync_config_shared\.js';/,
      /from '\.\/cloud_sync_config_sources\.js';/,
      /from '\.\/cloud_sync_config_browser\.js';/,
      /export \{ readCfgFromDepsConfig, readCfgFromImportMetaEnv, readCfg \}/,
      /export \{ getRoomFromUrl, setRoomInUrl, isExplicitSite2Bundle \}/,
    ],
    'cloud sync config owner'
  );

  assertMatchesAll(
    assert,
    ownerContext,
    [
      /const CLOUD_SYNC_CLIENT_KEY = 'wp_cloud_sync_client_id';/,
      /sessionStorage/,
      /function createCloudSyncOwnerRooms\(/,
      /const getGateBaseRoom = \(\): string => \{/,
      /cfg\.privateRoom/,
      /cfg\.publicRoom/,
    ],
    'cloud sync owner context'
  );
  assert.doesNotMatch(ownerContext, /storage\.getString\(CLOUD_SYNC_CLIENT_KEY\)/);
  assert.doesNotMatch(ownerContext, /storage\.setString\(CLOUD_SYNC_CLIENT_KEY,/);

  assertMatchesAll(
    assert,
    tabsGateBundle,
    [
      /getGateBaseRoom\?: \(\) => string;/,
      /const explicit = String\(getGateBaseRoom\(\) \|\| ''\)\.trim\(\);/,
      /patchSite2TabsGateUi\(/,
      /resolveCloudSyncTabsGateBaseRoom\(/,
    ],
    'cloud sync tabs gate bundle'
  );

  assertMatchesAll(
    assert,
    sketchBundle,
    [
      /getGateBaseRoom\?: \(\) => string;/,
      /resolveCloudSyncGateBaseRoom\(/,
      /resolveInitialCloudSketchCatchupDecision\(/,
      /resolveCloudSketchPayloadFingerprint\(/,
      /loadCloudSketchProjectData\(App, remoteSketch\)/,
      /resolveFloatingSketchSyncRoom\(/,
    ],
    'cloud sync sketch bundle'
  );

  assertMatchesAll(
    assert,
    siteVariant,
    [
      /meta\[name="wp-site-variant"\]/,
      /function readVariantFromPath\(App: AppContainer\): SiteVariant \| null \{/,
      /index_site2\(\?:\\\.html\)\?\$/,
    ],
    'site variant seam'
  );
  assert.match(bootController, /resetCameraPreset\(App\)/);
  assert.doesNotMatch(bootController, /camera\.position\.set\(0, 1\.6, 2\.6\)/);
});

test('cloud sync family keeps project/browser/panel seams canonical without direct legacy reach-through', () => {
  assertMatchesAll(
    assert,
    cloudSupportBundle,
    [
      /exportProjectResultViaService\(\s*App,\s*\{ source: 'cloudSketch\.capture' \}/,
      /captureProjectSnapshotMaybe\(App, 'persist'\)/,
    ],
    'cloud sync support'
  );
  assertLacksAll(
    assert,
    cloudSupportBundle,
    [/App\.services[\s\S]{0,120}projectIO/, /function getProjectIoService\(/],
    'cloud sync support'
  );

  assertMatchesAll(
    assert,
    cloudSketchPullLoadSrc,
    [
      /from '\.\.\/runtime\/project_io_access\.js';/,
      /loadProjectDataResultViaService\([\s\S]*'cloudSketch\.pull'[\s\S]*'cloud-sketch-load'/,
    ],
    'cloud sync sketch pull load'
  );
  assertLacksAll(
    assert,
    cloudSketchPullLoadSrc,
    [/from '\.\.\/io\/project_io\.js';/, /loadProjectData\(App, sketch/],
    'cloud sync sketch pull load'
  );

  assertMatchesAll(
    assert,
    kernelSrc,
    [
      /getProjectCaptureServiceMaybe\(App\)/,
      /getProjectIoServiceMaybe\(App\)/,
      /loadProjectData(?:ResultViaServiceOrThrow|ViaService)\(\s*App,\s*(?:rec|record),\s*\{/,
    ],
    'kernel project access'
  );
  assertLacksAll(
    assert,
    kernelSrc,
    [/App\?\.services\?\.projectIO/, /getServicesRecord\(App\)\?\.projectIO/],
    'kernel project access'
  );

  assertMatchesAll(
    assert,
    panelBundle,
    [
      /function getCloudSyncDiagStorageMaybe\(read: \(\) => CloudSyncStorageValueStoreLike \| null\): CloudSyncStorageValueStoreLike \| null/,
      /function getCloudSyncClipboardMaybe\(read: \(\) => CloudSyncClipboardLike \| null\): CloudSyncClipboardLike \| null/,
      /function getCloudSyncPromptSinkMaybe\(read: \(\) => CloudSyncPromptSinkLike \| null\): CloudSyncPromptSinkLike \| null/,
      /export interface CloudSyncPanelSnapshotController \{/,
      /createCloudSyncPanelSnapshotController\(/,
      /subscribePanelSnapshot: (?:\(fn\)|fn) => \{/,
    ],
    'cloud sync panel bundle'
  );
});

test('cloud sync family keeps typed runtime/react control surfaces canonical while deleting structural ballast', () => {
  assertMatchesAll(
    assert,
    cloudTypes,
    [
      /export interface CloudSyncPayload extends (AnyRecord|UnknownRecord)/,
      /export interface CloudSyncRuntimeStatus extends (AnyRecord|UnknownRecord)/,
      /export interface CloudSyncServiceLike extends (AnyRecord|UnknownRecord)/,
      /export type CloudSyncSketchCommandResult =/,
      /export type CloudSyncTabsGateCommandResult =/,
      /export type CloudSyncSyncPinCommandResult =/,
      /export type CloudSyncShareLinkCommandResult =/,
      /export interface CloudSyncPanelSnapshot extends CloudSyncRoomStatusSnapshot/,
    ],
    'cloud sync types'
  );
  assert.match(typesIndex, /export \* from '\.\/cloud_sync';/);
  assert.doesNotMatch(appTypes, /cloudSync\?: Namespace & CloudSyncServiceLike;/);
  assert.match(buildTypes, /cloudSync\?: CloudSyncServiceStateLike;/);

  assertMatchesAll(
    assert,
    cloudSyncAccess,
    [
      /export function ensureCloudSyncServiceState\(App: unknown\): CloudSyncServiceStateLike \| null/,
      /export function getCloudSyncTestHooksMaybe\(App: unknown\): CloudSyncTestHooksLike \| null/,
      /ensureServiceSlot(?:<[^>]+>)?\(App, 'cloudSync'\)/,
    ],
    'cloud sync access'
  );

  assertMatchesAll(
    assert,
    reactBundle,
    [
      /createCloudSyncUiActionController\(\{ app, fb \}\)/,
      /runCloudSyncUiToggleRoomMode\(\{ app, fb, commands, isPublic \}\)/,
      /runCloudSyncUiSyncSketch\(\{ app, fb, commands \}\)/,
      /runCloudSyncUiToggleFloatingSyncEnabled\(\{ app, fb, commands \}\)/,
      /runCloudSyncUiToggleSite2TabsGate\(\{ app, fb, commands, nextOpen, meta \}\)/,
      /function readCloudSyncService\(app: AppContainer\): CloudSyncServiceLike \| null \{/,
      /getCloudSyncServiceMaybe\(app\)/,
      /runCloudSyncAsyncCommand\(app, CLOUD_SYNC_ASYNC_COMMANDS\.syncSketchNow\)/,
      /cloudSyncUiController\.toggleRoomMode\(isPublic\)/,
      /cloudSyncUiController\.toggleFloatingSyncEnabled\(\)/,
      /cloudSyncUiController\.toggleSite2TabsGate\([\s\S]*meta\.uiOnlyImmediate\(/,
    ],
    'cloud sync react bundle'
  );
  assertLacksAll(
    assert,
    reactBundle,
    [
      /syncSketchNowCommand\(app\)/,
      /toggleFloatingSketchSyncEnabled\(app\)/,
      /toggleSite2TabsGate\(app, !site2GateOpen/,
      /sidebar_shared\.js/,
      /type CloudSyncApi = \{/,
      /\bbridge\./,
    ],
    'cloud sync react bundle'
  );
});
