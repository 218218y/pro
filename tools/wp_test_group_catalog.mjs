// Canonical ownership for named test groups that are too large for package.json.
// Keep group membership and execution metadata here so runners, audits, reports,
// and architecture guards read one source of truth.

const TEST_FILE_RE = /^tests\/.+\.(?:test|spec)\.(?:js|cjs|mjs|ts|tsx)$/u;
const TEST_GROUP_RUNNERS = new Set(['node-test', 'tsx-test', 'serial-tsx']);
const TEST_GROUP_ENVIRONMENTS = new Set(['node', 'tsx']);
const TEST_GROUP_PORTFOLIO_ROLES = new Set(['primary', 'focused', 'architecture']);

function freezeSerialPolicy(policy) {
  if (!policy) return undefined;
  return Object.freeze({ ...policy });
}

function defineTestGroup(definition) {
  return Object.freeze({
    ...definition,
    owners: Object.freeze([...definition.owners]),
    files: Object.freeze([...definition.files]),
    ...(definition.serialPolicy ? { serialPolicy: freezeSerialPolicy(definition.serialPolicy) } : null),
  });
}

export const TEST_GROUP_CATALOG = Object.freeze({
  'refactor-stage-guards': defineTestGroup({
    script: 'test:refactor-stage-guards',
    description: 'Completed refactor-stage architecture and closeout guards.',
    kind: 'architecture-guard',
    owners: ['architecture/control-plane'],
    environment: 'node',
    runner: 'node-test',
    portfolioRole: 'architecture',
    files: [
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
    ],
  }),
  'mirror-runtime': defineTestGroup({
    script: 'test:mirror-runtime',
    description: 'Mirror scheduling, planar rendering, recovery, and performance contracts.',
    kind: 'runtime-integration',
    owners: ['platform/render-loop', 'runtime/planar-reflector'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/render_loop_mirror_driver_runtime.test.ts',
      'tests/planar_reflector_incremental_rebuild_runtime.test.ts',
      'tests/planar_reflector_render_pass_runtime.test.ts',
      'tests/planar_reflector_cube_recovery_runtime.test.ts',
      'tests/planar_reflector_performance_contracts.test.js',
      'tests/planar_reflector_quality_contracts.test.js',
    ],
  }),
  'sketch-box-content-protocol': defineTestGroup({
    script: 'test:sketch-box-content-protocol',
    description: 'Versioned fail-closed preview/commit commands for all sketch-box mutations.',
    kind: 'runtime-integration',
    owners: ['services/canvas-picking', 'features/sketch-box'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/canvas_picking_sketch_box_content_command_runtime.test.ts',
      'tests/canvas_picking_sketch_structural_command_runtime.test.ts',
      'tests/canvas_picking_sketch_box_command_hover_cutover_guard.test.mjs',
      'tests/canvas_picking_sketch_box_content_commit_runtime.test.ts',
      'tests/canvas_picking_sketch_commit_geometry_runtime.test.ts',
      'tests/canvas_picking_sketch_stack_runtime.test.ts',
      'tests/canvas_picking_sketch_free_commit_runtime.test.ts',
      'tests/canvas_picking_manual_layout_free_box_content_runtime.test.ts',
      'tests/sketch_box_divider_hover_runtime.test.ts',
      'tests/canvas_picking_shoe_drawer_base_auto_none_runtime.test.ts',
      'tests/canvas_picking_sketch_box_door_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_hover_apply_box_content_runtime.test.ts',
    ],
  }),
  'order-pdf-overlay-core': defineTestGroup({
    script: 'test:order-pdf-surfaces:overlay-core',
    description: 'Core order-PDF overlay state, commands, interactions, and text behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/order-pdf'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
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
    ],
  }),
  'cloud-sync-lifecycle': defineTestGroup({
    script: 'test:cloud-sync-surfaces:lifecycle',
    description: 'Cloud Sync lifecycle, recovery, configuration, and action contracts.',
    kind: 'service-runtime-integration',
    owners: ['services/cloud-sync/lifecycle'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: {
      batchSize: 3,
      heartbeatMs: 10000,
      timeoutMs: 120000,
      failedFilesPath: '.artifacts/cloud-sync-surfaces.lifecycle.failed.txt',
      timingsPath: '.artifacts/cloud-sync-surfaces.lifecycle.timings.json',
    },
    files: [
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
      'tests/cloud_sync_offline_reconnect_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_start_recovery_runtime.test.ts',
      'tests/cloud_sync_lifecycle_owner_realtime_start_runtime.test.ts',
      'tests/cloud_sync_lifecycle_start_idempotent_runtime.test.ts',
      'tests/cloud_sync_lifecycle_realtime_support_runtime.test.ts',
    ],
  }),
  'cloud-sync-main-row': defineTestGroup({
    script: 'test:cloud-sync-surfaces:main-row',
    description: 'Cloud Sync main-row writes, mutation commands, status, and owner context.',
    kind: 'service-runtime-integration',
    owners: ['services/cloud-sync/main-row'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: {
      batchSize: 3,
      heartbeatMs: 10000,
      timeoutMs: 120000,
      failedFilesPath: '.artifacts/cloud-sync-surfaces.main-row.failed.txt',
      timingsPath: '.artifacts/cloud-sync-surfaces.main-row.timings.json',
    },
    files: [
      'tests/cloud_sync_main_row_payload_dedupe_runtime.test.ts',
      'tests/cloud_sync_main_row_runtime.test.ts',
      'tests/cloud_sync_main_write_singleflight_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_runtime.test.ts',
      'tests/cloud_sync_mutation_commands_singleflight_runtime.test.ts',
      'tests/cloud_sync_owner_context_runtime.test.ts',
      'tests/cloud_sync_status_install_runtime.test.ts',
    ],
  }),
  'cloud-sync-panel-install': defineTestGroup({
    script: 'test:cloud-sync-surfaces:panel-install',
    description: 'Cloud Sync panel API installation and surface healing contracts.',
    kind: 'ui-runtime-integration',
    owners: ['ui/cloud-sync-panel'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/cloud_sync_panel_api_install_healing_runtime.test.ts',
      'tests/cloud_sync_panel_api_surface_runtime.test.ts',
    ],
  }),
  'cloud-sync-panel-controller': defineTestGroup({
    script: 'test:cloud-sync-surfaces:panel-controller',
    description: 'Cloud Sync panel controller failure and fallback contracts.',
    kind: 'ui-runtime-integration',
    owners: ['ui/cloud-sync-panel'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/cloud_sync_panel_api_controller_fallback_runtime.test.ts',
      'tests/cloud_sync_panel_api_failures_runtime.test.ts',
    ],
  }),
  'cloud-sync-panel-subscriptions': defineTestGroup({
    script: 'test:cloud-sync-surfaces:panel-subscriptions',
    description: 'Cloud Sync panel subscription and singleflight contracts.',
    kind: 'ui-runtime-integration',
    owners: ['ui/cloud-sync-panel'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/cloud_sync_panel_api_singleflight_runtime.test.ts',
      'tests/cloud_sync_panel_api_subscriptions_runtime.test.ts',
      'tests/cloud_sync_panel_api_support_singleflight_runtime.test.ts',
    ],
  }),
  'cloud-sync-panel-snapshots': defineTestGroup({
    script: 'test:cloud-sync-surfaces:panel-snapshots',
    description: 'Cloud Sync panel snapshot controller, dedupe, and fallback contracts.',
    kind: 'ui-runtime-integration',
    owners: ['ui/cloud-sync-panel'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/cloud_sync_panel_snapshot_controller_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_dedupe_runtime.test.ts',
      'tests/cloud_sync_panel_snapshot_fallback_runtime.test.ts',
    ],
  }),
  'cloud-sync-sync-ops': defineTestGroup({
    script: 'test:cloud-sync-surfaces:sync-ops',
    description: 'Cloud Sync pull, push, REST, room, sketch, and support operations.',
    kind: 'service-runtime-integration',
    owners: ['services/cloud-sync/sync-ops'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: {
      batchSize: 3,
      heartbeatMs: 10000,
      timeoutMs: 120000,
      failedFilesPath: '.artifacts/cloud-sync-surfaces.sync-ops.failed.txt',
      timingsPath: '.artifacts/cloud-sync-surfaces.sync-ops.timings.json',
    },
    files: [
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
  }),
  'cloud-sync-tabs-ui': defineTestGroup({
    script: 'test:cloud-sync-surfaces:tabs-ui',
    description: 'Cloud Sync tab gates, pin commands, timers, and UI action controllers.',
    kind: 'ui-runtime-integration',
    owners: ['ui/cloud-sync-tabs'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/cloud_sync_sync_pin_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_command_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_runtime.test.ts',
      'tests/cloud_sync_tabs_gate_timer_dedupe_runtime.test.ts',
      'tests/cloud_sync_ui_action_controller_runtime.test.js',
    ],
  }),
  'sketch-manual-hover': defineTestGroup({
    script: 'test:sketch-surfaces:manual-hover',
    description: 'Sketch manual-layout host, hover intent, matching, routing, and preview contracts.',
    kind: 'service-runtime-integration',
    owners: ['services/canvas-picking/manual-layout'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/sketch_manual_tool_host_runtime.test.ts',
      'tests/canvas_picking_layout_edit_flow_manual_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_intent_runtime.test.ts',
      'tests/canvas_picking_sketch_hover_matching_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_context_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_tools_runtime.test.ts',
    ],
  }),
  'sketch-box-hover': defineTestGroup({
    script: 'test:sketch-surfaces:box-hover',
    description: 'Sketch box hover, doors, overlap, click, and visual contracts.',
    kind: 'service-runtime-integration',
    owners: ['services/canvas-picking/sketch-box'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/canvas_picking_sketch_box_runtime_runtime.test.ts',
      'tests/canvas_picking_sketch_box_door_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_box_doors_runtime.test.ts',
      'tests/canvas_picking_sketch_box_overlap_runtime.test.ts',
      'tests/sketch_box_hover_click_runtime.test.ts',
      'tests/sketch_box_door_visuals_runtime.test.ts',
    ],
  }),
  'sketch-free-boxes': defineTestGroup({
    script: 'test:sketch-surfaces:free-boxes',
    description: 'Sketch free-box preview, commit, attachment, removal, and room-floor contracts.',
    kind: 'service-runtime-integration',
    owners: ['services/canvas-picking/sketch-free-boxes'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_commit_runtime.test.ts',
      'tests/canvas_picking_manual_layout_free_box_content_runtime.test.ts',
      'tests/sketch_free_boxes_attach_runtime.test.ts',
      'tests/sketch_free_boxes_hover_plane_attach_runtime.test.ts',
      'tests/sketch_free_boxes_outside_attach_runtime.test.ts',
      'tests/sketch_free_boxes_remove_and_sidewall_runtime.test.ts',
      'tests/sketch_free_boxes_room_floor_runtime.test.ts',
    ],
  }),
  'sketch-render-visuals': defineTestGroup({
    script: 'test:sketch-surfaces:render-visuals',
    description: 'Sketch render input, visuals, fronts, layout geometry, support, and visual state.',
    kind: 'builder-runtime-integration',
    owners: ['builder/render-sketch'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/render_interior_sketch_input_contract_runtime.test.ts',
      'tests/render_interior_sketch_visuals_runtime.test.ts',
      'tests/render_interior_sketch_fronts_runtime.test.ts',
      'tests/render_interior_sketch_layout_dimensions_runtime.test.ts',
      'tests/render_interior_sketch_layout_geometry_runtime.test.ts',
      'tests/render_interior_sketch_support_runtime.test.ts',
      'tests/sketch_front_visual_state_runtime.test.ts',
    ],
  }),
  'tab-surfaces': defineTestGroup({
    script: 'test:tab-surfaces',
    description: 'Structure, design, visual settings, and interior tab runtime surfaces.',
    kind: 'ui-runtime-portfolio',
    owners: ['ui/structure-tab', 'ui/design-tab', 'ui/settings-visual', 'ui/interior-tab'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'primary',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/structure_tab_actions_controller_runtime.test.js',
      'tests/structure_tab_aux_sections_runtime.test.ts',
      'tests/structure_tab_body_section_runtime.test.ts',
      'tests/structure_tab_dimension_field_shared_runtime.test.ts',
      'tests/structure_tab_saved_models_action_feedback_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_confirm_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_save_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_surface_runtime.test.ts',
      'tests/structure_tab_saved_models_controller_runtime.test.ts',
      'tests/structure_tab_saved_models_controller_singleflight_runtime.test.ts',
      'tests/structure_tab_saved_models_dnd_controller_runtime.test.ts',
      'tests/structure_tab_saved_models_dnd_events_controller_runtime.test.js',
      'tests/structure_tab_saved_models_list_row_runtime.test.ts',
      'tests/structure_tab_shared_runtime.test.ts',
      'tests/structure_tab_structural_controller_runtime.test.js',
      'tests/structure_tab_view_state_runtime.test.js',
      'tests/structure_tab_workflows_controller_runtime.test.ts',
      'tests/design_tab_color_action_family_singleflight_runtime.test.ts',
      'tests/design_tab_color_action_feedback_runtime.test.ts',
      'tests/design_tab_color_action_result_runtime.test.ts',
      'tests/design_tab_color_command_flows_runtime.test.ts',
      'tests/design_tab_color_manager_shared_runtime.test.ts',
      'tests/design_tab_controller_runtime.test.js',
      'tests/design_tab_custom_color_workflow_singleflight_runtime.test.js',
      'tests/design_tab_custom_color_workflow_surface_runtime.test.ts',
      'tests/design_tab_custom_color_workflow_texture_save_runtime.test.ts',
      'tests/design_tab_edit_modes_controller_runtime.test.js',
      'tests/design_tab_multicolor_controller_runtime.test.js',
      'tests/design_tab_multicolor_panel_state_runtime.test.ts',
      'tests/design_tab_saved_swatches_controller_runtime.test.ts',
      'tests/design_tab_saved_swatches_dnd_controller_runtime.test.js',
      'tests/design_tab_saved_swatches_singleflight_runtime.test.js',
      'tests/design_tab_sections_runtime.test.tsx',
      'tests/design_tab_shared_runtime.test.ts',
      'tests/design_tab_view_state_runtime.test.js',
      'tests/settings_visual_display_controller_runtime.test.js',
      'tests/settings_visual_lighting_controller_runtime.test.js',
      'tests/settings_visual_room_design_controller_runtime.test.js',
      'tests/settings_visual_sections_shared_runtime.test.ts',
      'tests/settings_visual_sections_runtime.test.js',
      'tests/settings_visual_view_state_runtime.test.js',
      'tests/interior_tab_local_state_runtime.test.js',
      'tests/interior_tab_sections_runtime.test.js',
      'tests/interior_tab_view_state_bindings_runtime.test.js',
      'tests/interior_tab_view_state_core_runtime.test.js',
      'tests/interior_tab_view_state_noop_runtime.test.js',
      'tests/interior_tab_view_state_runtime.test.js',
      'tests/interior_tab_view_state_surface_runtime.test.js',
      'tests/interior_tab_view_state_sync_runtime.test.js',
      'tests/interior_tab_workflows_bootstrap_trim_runtime.test.js',
      'tests/interior_tab_workflows_surface_runtime.test.js',
    ],
  }),
  'canvas-surfaces': defineTestGroup({
    script: 'test:canvas-surfaces',
    description: 'Canvas hover, preview, routing, and sketch module interaction surfaces.',
    kind: 'runtime-portfolio',
    owners: ['services/canvas-picking'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'primary',
    files: [
      'tests/canvas_picking_hover_preview_modes_runtime.test.ts',
      'tests/canvas_picking_hover_flow_runtime.test.ts',
      'tests/canvas_picking_hover_flow_nonsplit_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_routing_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_module_preview_runtime.test.ts',
      'tests/canvas_picking_manual_layout_sketch_hover_surface_runtime.test.ts',
      'tests/canvas_picking_sketch_module_box_workflow_runtime.test.ts',
      'tests/canvas_picking_sketch_module_surface_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_module_surface_preview_shelf_runtime.test.ts',
      'tests/canvas_picking_sketch_module_surface_preview_rod_runtime.test.ts',
      'tests/canvas_picking_sketch_module_vertical_content_runtime.test.ts',
      'tests/canvas_picking_sketch_module_surface_commit_runtime.test.ts',
      'tests/canvas_picking_sketch_free_surface_preview_runtime.test.ts',
      'tests/canvas_picking_sketch_free_box_content_preview_runtime.test.ts',
    ],
  }),
  'structure-tab-family-core': defineTestGroup({
    script: 'test:structure-tab-family-core',
    description: 'Focused structure/interior tab family contracts and saved-model workflows.',
    kind: 'ui-runtime-integration',
    owners: ['ui/structure-tab', 'ui/interior-tab'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/structure_tab_family_contracts.test.js',
      'tests/structure_tab_actions_controller_runtime.test.js',
      'tests/structure_tab_structural_controller_runtime.test.js',
      'tests/structure_tab_view_state_runtime.test.js',
      'tests/interior_tab_local_state_runtime.test.js',
      'tests/interior_tab_view_state_bindings_runtime.test.js',
      'tests/interior_tab_view_state_core_runtime.test.js',
      'tests/interior_tab_view_state_noop_runtime.test.js',
      'tests/interior_tab_view_state_runtime.test.js',
      'tests/interior_tab_view_state_surface_runtime.test.js',
      'tests/interior_tab_view_state_sync_runtime.test.js',
      'tests/interior_tab_workflows_bootstrap_trim_runtime.test.js',
      'tests/interior_tab_workflows_surface_runtime.test.js',
      'tests/structure_tab_saved_models_action_feedback_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_confirm_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_save_runtime.test.ts',
      'tests/structure_tab_saved_models_command_flows_surface_runtime.test.ts',
      'tests/structure_tab_saved_models_controller_runtime.test.ts',
      'tests/structure_tab_saved_models_controller_singleflight_runtime.test.ts',
      'tests/structure_tab_saved_models_dnd_controller_runtime.test.ts',
      'tests/structure_tab_saved_models_dnd_events_controller_runtime.test.js',
      'tests/structure_tab_workflows_controller_runtime.test.ts',
    ],
  }),
  'project-surfaces': defineTestGroup({
    script: 'test:project-surfaces',
    description: 'Project actions, schema, ingress, persistence, and canonical snapshot surfaces.',
    kind: 'runtime-portfolio',
    owners: ['io/project', 'ui/project-session'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'primary',
    files: [
      'tests/project_actions_runtime.test.ts',
      'tests/project_session_commands_runtime.test.ts',
      'tests/project_reset_default_runtime.test.ts',
      'tests/project_io_access_runtime.test.ts',
      'tests/project_io_export_runtime.test.ts',
      'tests/project_io_fail_fast_runtime.test.ts',
      'tests/project_io_load_helpers_runtime.test.ts',
      'tests/project_io_load_ops_runtime.test.ts',
      'tests/project_io_load_result_runtime.test.ts',
      'tests/project_io_orchestrator_shared_runtime.test.ts',
      'tests/project_file_ingress_service_runtime.test.ts',
      'tests/project_config_lists_canonical_runtime.test.ts',
      'tests/project_config_persisted_snapshot_runtime.test.ts',
      'tests/project_payload_runtime_hardening.test.ts',
      'tests/project_schema_runtime_surface.test.ts',
      'tests/project_schema_runtime_extended.test.ts',
      'tests/project_schema_current_runtime.test.ts',
      'tests/project_import_fixtures_runtime.test.ts',
      'tests/project_io_owner_rejection_visibility_runtime.test.ts',
    ],
  }),
  'verification-control-plane': defineTestGroup({
    script: 'test:verification-control-plane',
    description: 'Verification manifest, closeout state, and generated-report contracts.',
    kind: 'control-plane-contract',
    owners: ['toolchain/verification'],
    environment: 'node',
    runner: 'node-test',
    portfolioRole: 'focused',
    files: [
      'tests/wp_verification_manifest_runtime.test.cjs',
      'tests/wp_verify_closeout_support_runtime.test.cjs',
      'tests/wp_generated_report_contract_runtime.test.js',
      'tests/wp_verification_summary_contract_runtime.test.js',
    ],
  }),
  'toolchain-surfaces': defineTestGroup({
    script: 'test:toolchain-surfaces',
    description: 'Build, release, lint, test, typecheck, and verification toolchain contracts.',
    kind: 'toolchain-portfolio',
    owners: ['toolchain'],
    environment: 'node',
    runner: 'node-test',
    portfolioRole: 'primary',
    files: [
      'tests/wp_toolchain_family_contracts.test.js',
      'tests/wp_build_dist_runtime.test.js',
      'tests/wp_bundle_runtime.test.js',
      'tests/wp_check_runtime.test.js',
      'tests/wp_refactor_closeout_audit_runtime.test.js',
      'tests/wp_release_runtime.test.js',
      'tests/wp_release_clean_audit_runtime.test.js',
      'tests/wp_release_parity_runtime.test.js',
      'tests/wp_serial_tests_runtime.test.js',
      'tests/wp_test_runtime.test.js',
      'tests/wp_typecheck_runtime.test.js',
      'tests/wp_verify_runtime.test.js',
      'tests/wp_verify_lane_runtime.test.js',
      'tests/wp_verify_parallel_runtime.test.js',
      'tests/ts_runtime_module_loader_runtime.test.js',
      'tests/actions_root_patch_type_contract.test.js',
      'tests/wp_ast_adapter_runtime.test.js',
      'tests/package_lock_registry_runtime.test.js',
      'tests/wp_lint_rule_matrix_runtime.test.js',
      'tests/wp_lint_parity_runtime.test.js',
      'tests/wp_lint_architecture_contracts_runtime.test.js',
      'tests/wp_lint_modern_readiness_runtime.test.js',
      'tests/wp_lint_js_only_runtime.test.js',
      'tests/wp_lint_typescript_eslint_absence_runtime.test.js',
      'tests/wp_toolchain_version_policy_runtime.test.js',
      'tests/wp_test_group_runtime.test.js',
      'tests/wp_test_group_catalog_report_runtime.test.js',
    ],
  }),
  'public-surfaces': defineTestGroup({
    script: 'test:public-surfaces',
    description: 'Stable public service, browser, model, project, and backup surfaces.',
    kind: 'runtime-portfolio',
    owners: ['public-api', 'platform/browser', 'services/models'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'primary',
    files: [
      'tests/public_service_surface_runtime.test.ts',
      'tests/boot_entry_access_runtime.test.ts',
      'tests/browser_cache_runtime_hardening.test.ts',
      'tests/browser_env_adapter_runtime_healing.test.ts',
      'tests/browser_dom_runtime.test.ts',
      'tests/browser_dom_css_healing_runtime.test.ts',
      'tests/models_service_runtime.test.ts',
      'tests/notes_access_runtime.test.ts',
      'tests/kernel_project_capture_runtime.test.ts',
      'tests/settings_backup_export_surface_runtime.test.ts',
      'tests/settings_backup_roundtrip_runtime.test.ts',
      'tests/boot_surface_stable_healing_runtime.test.ts',
      'tests/stable_surface_methods_runtime.test.ts',
      'tests/stable_surface_slots_runtime.test.ts',
      'tests/models_service_owner_rejection_visibility_runtime.test.ts',
      'tests/browser_clipboard_runtime.test.ts',
      'tests/browser_file_download_runtime.test.ts',
      'tests/browser_file_read_runtime.test.ts',
      'tests/project_file_load_result_runtime.test.ts',
      'tests/settings_backup_file_read_diagnostics_runtime.test.ts',
    ],
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
    ...(group.serialPolicy ? { serialPolicy: { ...group.serialPolicy } } : null),
  };
}

export function readTestGroupFiles(name) {
  const group = readTestGroup(name);
  return group ? group.files : null;
}

export function listTestGroupScriptBindings() {
  return Object.entries(TEST_GROUP_CATALOG)
    .map(([groupName, definition]) => ({ groupName, script: definition.script }))
    .sort((left, right) => left.script.localeCompare(right.script));
}

export function validateTestGroupCatalog(catalog = TEST_GROUP_CATALOG) {
  const issues = [];
  const scripts = new Map();
  const primaryOwners = new Map();

  for (const [groupName, definition] of Object.entries(catalog)) {
    const add = (code, message, extra = {}) => issues.push({ code, group: groupName, message, ...extra });
    if (!groupName.trim()) add('invalid-group-name', 'group name must be non-empty');
    if (typeof definition?.script !== 'string' || !definition.script.startsWith('test:')) {
      add('invalid-script', 'script must be a test:* package script name');
    } else if (scripts.has(definition.script)) {
      add('duplicate-script-binding', `script is already owned by ${scripts.get(definition.script)}`);
    } else {
      scripts.set(definition.script, groupName);
    }
    if (typeof definition?.description !== 'string' || !definition.description.trim()) {
      add('missing-description', 'description must be non-empty');
    }
    if (typeof definition?.kind !== 'string' || !definition.kind.trim()) {
      add('missing-kind', 'kind must be non-empty');
    }
    if (!Array.isArray(definition?.owners) || definition.owners.length === 0) {
      add('missing-owners', 'owners must contain at least one owner');
    }
    if (!TEST_GROUP_RUNNERS.has(definition?.runner)) {
      add('invalid-runner', `unsupported runner: ${definition?.runner}`);
    }
    if (!TEST_GROUP_ENVIRONMENTS.has(definition?.environment)) {
      add('invalid-environment', `unsupported environment: ${definition?.environment}`);
    }
    if (!TEST_GROUP_PORTFOLIO_ROLES.has(definition?.portfolioRole)) {
      add('invalid-portfolio-role', `unsupported portfolio role: ${definition?.portfolioRole}`);
    }
    if (definition?.runner === 'node-test' && definition?.environment !== 'node') {
      add('runner-environment-mismatch', 'node-test requires environment=node');
    }
    if (
      (definition?.runner === 'tsx-test' || definition?.runner === 'serial-tsx') &&
      definition?.environment !== 'tsx'
    ) {
      add('runner-environment-mismatch', `${definition.runner} requires environment=tsx`);
    }
    if (!Array.isArray(definition?.files) || definition.files.length === 0) {
      add('missing-files', 'files must contain at least one test file');
      continue;
    }

    const seen = new Set();
    for (const file of definition.files) {
      if (seen.has(file)) add('duplicate-file', 'file is listed more than once in the group', { file });
      seen.add(file);
      if (!TEST_FILE_RE.test(file))
        add('invalid-test-file', 'file is not a canonical test/spec path', { file });
      if (definition.portfolioRole === 'primary') {
        const previousGroup = primaryOwners.get(file);
        if (previousGroup && previousGroup !== groupName) {
          add('primary-portfolio-overlap', `file is already primary-owned by ${previousGroup}`, { file });
        } else {
          primaryOwners.set(file, groupName);
        }
      }
    }

    if (definition.runner === 'serial-tsx') {
      const policy = definition.serialPolicy;
      if (!policy || !Number.isInteger(policy.batchSize) || policy.batchSize < 1) {
        add('invalid-serial-policy', 'serial-tsx requires serialPolicy.batchSize >= 1');
      }
      for (const key of ['heartbeatMs', 'timeoutMs']) {
        if (!Number.isInteger(policy?.[key]) || policy[key] < 0) {
          add('invalid-serial-policy', `serialPolicy.${key} must be an integer >= 0`);
        }
      }
    } else if (definition.serialPolicy) {
      add('unexpected-serial-policy', 'serialPolicy is only valid for serial-tsx groups');
    }
  }

  return issues;
}
