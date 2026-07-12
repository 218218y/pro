// Canonical ownership for named test groups that are too large for package.json.
// Keep group membership here so runners, audits, and architecture guards read one source of truth.

export const TEST_GROUP_CATALOG = Object.freeze({
  'refactor-stage-guards': Object.freeze({
    description: 'Completed refactor-stage architecture and closeout guards.',
    kind: 'architecture-guard',
    owners: Object.freeze(['architecture/control-plane']),
    runner: 'node-test',
    files: Object.freeze([
      'tests/refactor_stage3_guardrails_runtime.test.js',
      'tests/refactor_stage4_public_api_and_type_hardening_runtime.test.js',
      'tests/refactor_stage5_ui_option_buttons_runtime.test.js',
      'tests/refactor_stage6_ui_effect_cleanup_runtime.test.js',
      'tests/refactor_stage7_canvas_hit_identity_runtime.test.js',
      'tests/refactor_stage8_cloud_sync_and_perf_runtime.test.js',
      'tests/refactor_stage9_test_portfolio_runtime.test.js',
      'tests/refactor_stage10_refactor_integration_runtime.test.js',
      'tests/refactor_stage11_canvas_hit_parity_runtime.test.js',
      'tests/refactor_stage12_cloud_sync_race_runtime.test.js',
      'tests/refactor_stage13_cloud_sync_push_race_runtime.test.js',
      'tests/refactor_stage14_ui_design_system_runtime.test.js',
      'tests/refactor_stage15_design_swatch_system_runtime.test.js',
      'tests/refactor_stage16_builder_pipeline_runtime.test.js',
      'tests/refactor_stage17_builder_deps_resolver_runtime.test.js',
      'tests/refactor_stage18_canvas_hit_parity_runtime.test.js',
      'tests/refactor_stage19_project_migration_selector_hardening_runtime.test.js',
      'tests/refactor_stage20_cloud_sync_polling_recovery_runtime.test.js',
      'tests/refactor_stage21_cloud_sync_realtime_start_recovery_runtime.test.js',
      'tests/refactor_stage22_cloud_sync_lifecycle_owner_recovery_runtime.test.js',
      'tests/refactor_stage42_legacy_fallback_inventory_guard.test.js',
      'tests/refactor_stage43_perf_runtime_surface_ownership_guard.test.js',
      'tests/refactor_stage44_scheduler_debug_stats_ownership_guard.test.js',
      'tests/refactor_stage45_corner_connector_special_ownership_guard.test.js',
      'tests/refactor_stage46_domain_api_shared_ownership_guard.test.js',
      'tests/refactor_stage47_models_service_surface_ownership_guard.test.js',
      'tests/refactor_stage48_preset_models_data_ownership_guard.test.js',
      'tests/refactor_stage49_slice_write_dispatch_ownership_guard.test.js',
      'tests/refactor_stage50_order_pdf_export_actions_ownership_guard.test.js',
      'tests/refactor_stage51_scheduler_shared_ownership_guard.test.js',
      'tests/refactor_stage52_interior_tab_helpers_ownership_guard.test.js',
      'tests/refactor_stage53_room_ownership_guard.test.js',
      'tests/refactor_stage54_render_preview_measurements_ownership_guard.test.js',
      'tests/refactor_stage55_order_pdf_sketch_toolbar_ownership_guard.test.js',
      'tests/refactor_stage56_order_pdf_text_layer_session_ownership_guard.test.js',
      'tests/refactor_stage57_order_pdf_text_box_runtime_ownership_guard.test.js',
      'tests/refactor_stage58_order_pdf_sketch_preview_controller_ownership_guard.test.js',
      'tests/refactor_stage59_order_pdf_sketch_canvas_runtime_ownership_guard.test.js',
      'tests/refactor_stage60_order_pdf_sketch_panel_controller_ownership_guard.test.js',
      'tests/refactor_stage61_order_pdf_card_text_layer_ownership_guard.test.js',
      'tests/refactor_stage62_order_pdf_sketch_preview_runtime_ownership_guard.test.js',
      'tests/refactor_stage63_order_pdf_sketch_panel_measurement_hooks_ownership_guard.test.js',
      'tests/refactor_stage64_order_pdf_sketch_panel_view_ownership_guard.test.js',
      'tests/refactor_stage65_render_carcass_cornice_ownership_guard.test.js',
      'tests/refactor_stage66_render_interior_sketch_shared_ownership_guard.test.js',
      'tests/refactor_stage67_render_preview_marker_ownership_guard.test.js',
      'tests/refactor_stage68_render_preview_sketch_ops_ownership_guard.test.js',
      'tests/refactor_stage69_render_interior_sketch_external_drawers_ownership_guard.test.js',
      'tests/refactor_stage70_render_interior_sketch_ops_ownership_guard.test.js',
      'tests/refactor_stage71_render_interior_sketch_boxes_shell_ownership_guard.test.js',
      'tests/refactor_stage72_render_interior_sketch_boxes_fronts_drawers_ownership_guard.test.js',
      'tests/refactor_stage73_render_interior_sketch_boxes_contents_parts_ownership_guard.test.js',
      'tests/refactor_stage74_refactor_next_stage_plan_guard.test.js',
      'tests/refactor_stage75_sketch_box_door_visual_ownership_guard.test.js',
      'tests/refactor_stage76_drawer_shared_contract_ownership_guard.test.js',
      'tests/refactor_stage77_sketch_box_controls_runtime_ownership_guard.test.js',
      'tests/refactor_stage78_runtime_access_surfaces_ownership_guard.test.js',
      'tests/refactor_stage79_order_pdf_export_commands_ownership_guard.test.js',
      'tests/refactor_stage80_measurement_perf_closeout_guard.test.js',
      'tests/refactor_stage81_runtime_pipeline_ownership_guard.test.js',
      'tests/refactor_stage82_browser_security_headers_guard.test.js',
    ]),
  }),
  'mirror-runtime': Object.freeze({
    description: 'Mirror scheduling, planar rendering, recovery, and performance contracts.',
    kind: 'runtime-integration',
    owners: Object.freeze(['platform/render-loop', 'runtime/planar-reflector']),
    runner: 'tsx-test',
    files: Object.freeze([
      'tests/render_loop_mirror_driver_runtime.test.ts',
      'tests/planar_reflector_incremental_rebuild_runtime.test.ts',
      'tests/planar_reflector_render_pass_runtime.test.ts',
      'tests/planar_reflector_cube_recovery_runtime.test.ts',
      'tests/planar_reflector_performance_contracts.test.js',
      'tests/planar_reflector_quality_contracts.test.js',
    ]),
  }),
  'order-pdf-overlay-core': Object.freeze({
    description: 'Core order-PDF overlay state, commands, interactions, and text behavior.',
    kind: 'ui-runtime-integration',
    owners: Object.freeze(['ui/order-pdf']),
    runner: 'tsx-test',
    files: Object.freeze([
      'tests/order_pdf_overlay_controller_actions_runtime.test.ts',
      'tests/order_pdf_overlay_draft_action_feedback_runtime.test.ts',
      'tests/order_pdf_overlay_draft_commands_runtime.test.ts',
      'tests/order_pdf_overlay_draft_effects_runtime.test.ts',
      'tests/order_pdf_overlay_editor_mode_state_runtime.test.ts',
      'tests/order_pdf_overlay_interactions_runtime.test.ts',
      'tests/order_pdf_overlay_runtime_export_runtime.test.ts',
      'tests/order_pdf_overlay_text_details_lines_runtime.test.ts',
      'tests/order_pdf_overlay_text_runtime.test.ts',
      'tests/order_pdf_text_details_merge_support_runtime.test.ts',
    ]),
  }),
});

export function listTestGroupNames() {
  return Object.keys(TEST_GROUP_CATALOG).sort();
}

export function readTestGroup(name) {
  const normalized = typeof name === 'string' ? name.trim() : '';
  const group = TEST_GROUP_CATALOG[normalized];
  if (!group) return null;
  return {
    ...group,
    owners: Array.from(group.owners),
    files: Array.from(group.files),
  };
}

export function readTestGroupFiles(name) {
  const group = readTestGroup(name);
  return group ? group.files : null;
}
