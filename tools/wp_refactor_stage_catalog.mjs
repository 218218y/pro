export const REFACTOR_COMPLETED_STAGE_LABELS = Object.freeze(
  Array.from({ length: 47 }, (_, index) => `Stage ${index}`)
);

export const REFACTOR_STAGE_PROGRESS_MARKER = Object.freeze({
  file: 'docs/REFACTOR_WORKMAP_PROGRESS.md',
  verifyEntryPoint: 'verify:refactor-modernization',
});

export const REFACTOR_INTEGRATION_ANCHORS = Object.freeze([
  {
    file: 'tests/refactor_stage19_project_migration_selector_hardening_runtime.test.js',
    needle: 'stage 33 to 35 project config migration replace-owned branches are anchored',
    message: 'stage 33-35 project config replace-owned branch guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage19_project_migration_selector_hardening_runtime.test.js',
    needle: 'stage 36 to 38 deterministic project config replace-key closeout is anchored',
    message: 'stage 36-38 deterministic project config closeout guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage10_refactor_integration_runtime.test.js',
    needle: 'stage 39 to 41 refactor control-plane stage catalog is anchored',
    message: 'stage 39-41 refactor control-plane catalog guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage42_legacy_fallback_inventory_guard.test.js',
    needle: 'stage 42 legacy fallback inventory closeout is anchored',
    message: 'stage 42 legacy fallback inventory closeout guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage43_perf_runtime_surface_ownership_guard.test.js',
    needle: 'stage 43 perf runtime ownership split is anchored',
    message: 'stage 43 perf runtime ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage44_scheduler_debug_stats_ownership_guard.test.js',
    needle: 'stage 44 scheduler debug stats ownership split is anchored',
    message: 'stage 44 scheduler debug stats ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage45_corner_connector_special_ownership_guard.test.js',
    needle: 'stage 45 corner connector special interior ownership split is anchored',
    message: 'stage 45 corner connector special interior ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage46_domain_api_shared_ownership_guard.test.js',
    needle: 'stage 46 domain API shared ownership split is anchored',
    message: 'stage 46 domain API shared ownership split guard must stay anchored',
  },
  {
    file: 'tests/project_config_migration_replace_keys_runtime.test.ts',
    needle: 'materializes every replace-owned branch',
    message: 'project config migration must prove replace-owned branch materialization',
  },
  {
    file: 'tests/project_config_migration_replace_keys_runtime.test.ts',
    needle: 'deterministic and type-narrowed',
    message: 'project config migration must prove deterministic replace-key order and type narrowing',
  },
  {
    file: 'esm/native/io/project_migrations/config_snapshot_migration.ts',
    needle: 'PROJECT_CONFIG_SNAPSHOT_REPLACE_KEY_ORDER',
    message: 'project config migration owner must expose deterministic replace-key order',
  },
  {
    file: 'esm/native/io/project_migrations/config_snapshot_migration.ts',
    needle: 'isProjectConfigSnapshotReplaceKey',
    message: 'project config migration owner must expose the replace-key type guard',
  },
  {
    file: 'tools/wp_project_migration_boundary_audit.mjs',
    needle: 'required-key contract must not depend on object-key enumeration order',
    message: 'project migration boundary audit must reject object-key enumeration drift',
  },
  {
    file: 'tools/wp_refactor_integration_audit.mjs',
    needle: 'REFACTOR_COMPLETED_STAGE_LABELS',
    message: 'refactor integration audit must consume the shared stage catalog',
  },
]);

export function assertRefactorStageCatalogIsWellFormed() {
  const labels = REFACTOR_COMPLETED_STAGE_LABELS;
  const unique = new Set(labels);
  if (unique.size !== labels.length) {
    throw new Error('refactor stage catalog contains duplicate labels');
  }

  labels.forEach((label, index) => {
    if (label !== `Stage ${index}`) {
      throw new Error(`refactor stage catalog out of order at index ${index}: ${label}`);
    }
  });

  return true;
}
