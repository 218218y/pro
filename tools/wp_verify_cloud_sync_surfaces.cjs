'use strict';

const { spawnSync } = require('node:child_process');

const GROUPS = [
  {
    id: 'lifecycle',
    command: process.execPath,
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.lifecycle.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.lifecycle.timings.json',
      'tests/cloud_sync_panel_actions_runtime.test.js',
      'tests/cloud_sync_action_feedback_runtime.test.ts',
      'tests/cloud_sync_access_runtime.test.ts',
      'tests/cloud_sync_install_support_runtime.test.ts',
      'tests/cloud_sync_lifecycle_install_cleanup_runtime.test.js',
      'tests/cloud_sync_actions_runtime.test.ts',
      'tests/cloud_sync_async_singleflight_owner_runtime.test.ts',
      'tests/cloud_sync_config_runtime.test.ts',
      'tests/cloud_sync_delete_temp_runtime.test.ts',
      'tests/cloud_sync_lifecycle_attention_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_runtime.test.ts',
      'tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts',
    ],
  },
  {
    id: 'main-row',
    command: process.execPath,
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.main-row.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.main-row.timings.json',
      'tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts',
      'tests/cloud_sync_main_row_runtime.test.ts',
      'tests/cloud_sync_main_write_singleflight_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_singleflight_runtime.test.ts',
      'tests/cloud_sync_owner_context_runtime.test.ts',
      'tests/cloud_sync_status_install_runtime.test.ts',
    ],
  },
  {
    id: 'panel-install',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_install_healing_runtime.test.ts',
      'tests/cloud_sync_panel_api_surface_runtime.test.ts',
    ],
  },
  {
    id: 'panel-controller',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts',
      'tests/cloud_sync_panel_api_failures_runtime.test.ts',
    ],
  },
  {
    id: 'panel-subscriptions',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_api_singleflight_runtime.test.ts',
      'tests/cloud_sync_panel_api_subscriptions_runtime.test.ts',
      'tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts',
    ],
  },
  {
    id: 'panel-snapshots',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_panel_snapshot_controller_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts',
    ],
  },
  {
    id: 'sync-ops',
    command: process.execPath,
    args: [
      'tools/wp_serial_tests.mjs',
      '--batch-size',
      '3',
      '--heartbeat-ms',
      '10000',
      '--timeout-ms',
      '120000',
      '--failed-files-path',
      '.artifacts/cloud-sync-surfaces.sync-ops.failed.txt',
      '--timings-path',
      '.artifacts/cloud-sync-surfaces.sync-ops.timings.json',
      'tests/cloud_sync_pull_coalescer_runtime.test.ts',
      'tests/cloud_sync_realtime_support_runtime.test.ts',
      'tests/cloud_sync_remote_push_singleflight_runtime.test.ts',
      'tests/cloud_sync_rest_runtime.test.ts',
      'tests/cloud_sync_room_commands_runtime.test.ts',
      'tests/cloud_sync_site2_sketch_behavior_runtime.test.ts',
      'tests/cloud_sync_sketch_ops_runtime.test.ts',
      'tests/cloud_sync_sketch_pull_load_runtime.test.ts',
      'tests/cloud_sync_support_runtime.test.ts',
    ],
  },
  {
    id: 'tabs-ui',
    command: process.execPath,
    args: [
      'tools/wp_run_tsx_tests.mjs',
      'tests/cloud_sync_sync_pin_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts',
      'tests/cloud_sync_ui_action_controller_runtime.test.js',
    ],
  },
];

for (const group of GROUPS) {
  console.log(`\n[cloud-sync-surfaces] running ${group.id}`);
  const res = spawnSync(group.command, group.args, { stdio: 'inherit', env: process.env });
  if ((res.status ?? 1) !== 0) {
    console.error(`[cloud-sync-surfaces] ${group.id} failed with exit ${res.status ?? 1}`);
    process.exit(res.status ?? 1);
  }
}
console.log('[cloud-sync-surfaces] all groups passed');
