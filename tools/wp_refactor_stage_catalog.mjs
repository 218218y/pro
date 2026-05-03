export const REFACTOR_COMPLETED_STAGE_LABELS = Object.freeze(
  Array.from({ length: 74 }, (_, index) => `Stage ${index}`)
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
    file: 'tests/refactor_stage47_models_service_surface_ownership_guard.test.js',
    needle: 'stage 47 models service surface ownership split is anchored',
    message: 'stage 47 models service surface ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage48_preset_models_data_ownership_guard.test.js',
    needle: 'stage 48 preset models data ownership split is anchored',
    message: 'stage 48 preset models data ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage49_slice_write_dispatch_ownership_guard.test.js',
    needle: 'stage 49 slice write dispatch ownership split is anchored',
    message: 'stage 49 slice write dispatch ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage50_order_pdf_export_actions_ownership_guard.test.js',
    needle: 'stage 50 order pdf export actions ownership split is anchored',
    message: 'stage 50 order pdf export actions ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage51_scheduler_shared_ownership_guard.test.js',
    needle: 'stage 51 scheduler shared ownership split is anchored',
    message: 'stage 51 scheduler shared ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage52_interior_tab_helpers_ownership_guard.test.js',
    needle: 'stage 52 interior tab helpers ownership split is anchored',
    message: 'stage 52 interior tab helpers ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage53_room_ownership_guard.test.js',
    needle: 'stage 53 room ownership split is anchored',
    message: 'stage 53 room ownership split guard must stay anchored',
  },

  {
    file: 'tests/refactor_stage54_render_preview_measurements_ownership_guard.test.js',
    needle: 'stage 54 render preview sketch measurements ownership split is anchored',
    message: 'stage 54 render preview sketch measurements ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage55_order_pdf_sketch_toolbar_ownership_guard.test.js',
    needle: 'stage 55 order pdf sketch toolbar ownership split is anchored',
    message: 'stage 55 order pdf sketch toolbar ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage56_order_pdf_text_layer_session_ownership_guard.test.js',
    needle: 'stage 56 order pdf text layer session ownership split is anchored',
    message: 'stage 56 order pdf text layer session ownership split guard must stay anchored',
  },

  {
    file: 'tests/refactor_stage57_order_pdf_text_box_runtime_ownership_guard.test.js',
    needle: 'stage 57 order pdf text box runtime ownership split is anchored',
    message: 'stage 57 order pdf text box runtime ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage58_order_pdf_sketch_preview_controller_ownership_guard.test.js',
    needle: 'stage 58 order pdf sketch preview controller ownership split is anchored',
    message: 'stage 58 order pdf sketch preview controller ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage59_order_pdf_sketch_canvas_runtime_ownership_guard.test.js',
    needle: 'stage 59 order pdf sketch canvas runtime ownership split is anchored',
    message: 'stage 59 order pdf sketch canvas runtime ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage60_order_pdf_sketch_panel_controller_ownership_guard.test.js',
    needle: 'stage 60 order pdf sketch panel controller ownership split is anchored',
    message: 'stage 60 order pdf sketch panel controller ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage61_order_pdf_card_text_layer_ownership_guard.test.js',
    needle: 'stage 61 order pdf card text layer ownership split is anchored',
    message: 'stage 61 order pdf card text layer ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage62_order_pdf_sketch_preview_runtime_ownership_guard.test.js',
    needle: 'stage 62 order pdf sketch preview runtime ownership split is anchored',
    message: 'stage 62 order pdf sketch preview runtime ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage63_order_pdf_sketch_panel_measurement_hooks_ownership_guard.test.js',
    needle: 'stage 63 order pdf sketch panel measurement hooks ownership split is anchored',
    message: 'stage 63 order pdf sketch panel measurement hooks ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage64_order_pdf_sketch_panel_view_ownership_guard.test.js',
    needle: 'stage 64 order pdf sketch panel view ownership split is anchored',
    message: 'stage 64 order pdf sketch panel view ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage65_render_carcass_cornice_ownership_guard.test.js',
    needle: 'stage 65 render carcass cornice ownership split is anchored',
    message: 'stage 65 render carcass cornice ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage66_render_interior_sketch_shared_ownership_guard.test.js',
    needle: 'stage 66 render interior sketch shared ownership split is anchored',
    message: 'stage 66 render interior sketch shared ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage67_render_preview_marker_ownership_guard.test.js',
    needle: 'stage 67 render preview marker ownership split is anchored',
    message: 'stage 67 render preview marker ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage68_render_preview_sketch_ops_ownership_guard.test.js',
    needle: 'stage 68 render preview sketch placement ops ownership split is anchored',
    message: 'stage 68 render preview sketch placement ops ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage69_render_interior_sketch_external_drawers_ownership_guard.test.js',
    needle: 'stage 69 render interior sketch external drawers ownership split is anchored',
    message: 'stage 69 render interior sketch external drawers ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage70_render_interior_sketch_ops_ownership_guard.test.js',
    needle: 'stage 70 render interior sketch ops ownership split is anchored',
    message: 'stage 70 render interior sketch ops ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage71_render_interior_sketch_boxes_shell_ownership_guard.test.js',
    needle: 'stage 71 render interior sketch box shell ownership split is anchored',
    message: 'stage 71 render interior sketch box shell ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage72_render_interior_sketch_boxes_fronts_drawers_ownership_guard.test.js',
    needle: 'stage 72 render interior sketch box external drawers ownership split is anchored',
    message: 'stage 72 render interior sketch box external drawers ownership split guard must stay anchored',
  },
  {
    file: 'tests/refactor_stage73_render_interior_sketch_boxes_contents_parts_ownership_guard.test.js',
    needle: 'stage 73 render interior sketch box static contents ownership split is anchored',
    message: 'stage 73 render interior sketch box static contents ownership split guard must stay anchored',
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
