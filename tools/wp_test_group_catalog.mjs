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
  'order-pdf-pdf-render': defineTestGroup({
    script: 'test:order-pdf-surfaces:pdf-render',
    description: 'Order-PDF import, PDF.js rendering, cleanup, and image-PDF text-layout behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/order-pdf/pdf-runtime'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/order_pdf_overlay_pdf_import_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_canvas_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_cleanup_runtime.test.ts',
      'tests/order_pdf_overlay_pdf_render_runtime.test.ts',
      'tests/order_pdf_image_pdf_text_layout_runtime.test.ts',
    ],
  }),
  'order-pdf-sketch': defineTestGroup({
    script: 'test:order-pdf-surfaces:sketch',
    description:
      'Order-PDF sketch editor persistence, placement, panel, preview-session, and shortcut behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/order-pdf/sketch'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/order_pdf_history_shortcuts_runtime.test.ts',
      'tests/order_pdf_sketch_draft_persistence_runtime.test.ts',
      'tests/order_pdf_sketch_palette_placement_runtime.test.ts',
      'tests/order_pdf_sketch_panel_runtime.test.ts',
      'tests/order_pdf_sketch_preview_session_runtime.test.ts',
      'tests/order_pdf_sketch_shortcuts_runtime.test.ts',
    ],
  }),
  'order-pdf-export-overlay': defineTestGroup({
    script: 'test:order-pdf-surfaces:export-overlay',
    description: 'Order-PDF overlay export operations, command routing, and single-flight behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/order-pdf/export-overlay'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/order_pdf_overlay_export_ops_runtime.test.ts',
      'tests/order_pdf_overlay_export_commands_runtime.test.ts',
      'tests/order_pdf_overlay_export_singleflight_runtime.test.ts',
    ],
  }),
  'order-pdf-export-builders': defineTestGroup({
    script: 'test:order-pdf-surfaces:export-builders',
    description: 'Order-PDF export builder composition, draft generation, and sketch-annotation behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/export/order-pdf'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/export_order_pdf_builder_draft_runtime.test.ts',
      'tests/export_order_pdf_builder_runtime.test.ts',
      'tests/export_order_pdf_builder_sketch_annotations_runtime.test.ts',
    ],
  }),
  'order-pdf-export-capture': defineTestGroup({
    script: 'test:order-pdf-surfaces:export-capture',
    description: 'Order-PDF export capture cache, viewport capture, and export operation behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/export/order-pdf'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/export_order_pdf_capture_cache_runtime.test.ts',
      'tests/export_order_pdf_capture_runtime.test.ts',
      'tests/export_order_pdf_ops_runtime.test.ts',
    ],
  }),
  'order-pdf-export-text': defineTestGroup({
    script: 'test:order-pdf-surfaces:export-text',
    description: 'Order-PDF export text derivation and sketch-annotation serialization behavior.',
    kind: 'ui-runtime-integration',
    owners: ['ui/export/order-pdf'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/export_order_pdf_sketch_annotations_runtime.test.ts',
      'tests/export_order_pdf_text_runtime.test.ts',
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
      'tests/cloud_sync_room_transition_runtime.test.ts',
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
    description: 'Cloud Sync pull, push, signed gateway, room, merge, sketch, and support operations.',
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
      'tests/cloud_sync_gateway_runtime.test.ts',
      'tests/cloud_sync_gateway_security_contract.test.js',
      'tests/cloud_sync_room_scope_runtime.test.ts',
      'tests/cloud_sync_owner_gateway_io_runtime.test.ts',
      'tests/cloud_sync_payload_merge_runtime.test.ts',
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
      'tests/canvas_picking_drawer_cross_family_remove_plan_runtime.test.ts',
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
  'builder-support-surfaces': defineTestGroup({
    script: 'test:builder-support-surfaces',
    description:
      'Builder support, materials, maps, library presets, scene view, doors, and corner runtime surfaces.',
    kind: 'builder-runtime-integration',
    owners: ['builder/support', 'services/materials', 'services/scene-view'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/materials_apply_traversal_runtime.test.ts',
      'tests/materials_factory_render_seams_runtime.test.ts',
      'tests/maps_access_known_map_normalization_runtime.test.ts',
      'tests/maps_access_normalizers_runtime.test.ts',
      'tests/maps_access_saved_collections_runtime.test.ts',
      'tests/maps_access_owner_rejection_visibility_runtime.test.ts',
      'tests/maps_api_runtime_hardening.test.ts',
      'tests/library_preset_canonical_materialization_runtime.test.ts',
      'tests/library_preset_flow_runtime.test.ts',
      'tests/library_mode_recompute_preserves_library_defaults_runtime.test.ts',
      'tests/module_layout_pipeline_runtime.test.ts',
      'tests/scene_view_access_runtime.test.ts',
      'tests/scene_view_shared_runtime.test.ts',
      'tests/scene_view_lighting_runtime.test.ts',
      'tests/scene_view_owner_rejection_visibility_runtime.test.ts',
      'tests/scene_view_store_sync_runtime.test.ts',
      'tests/doors_runtime_lifecycle_runtime.test.ts',
      'tests/doors_runtime_support_runtime.test.ts',
      'tests/doors_runtime_visuals_sketch_internal_drawers_runtime.test.ts',
      'tests/corner_configuration_stack_patch_runtime.test.ts',
      'tests/corner_connector_door_emit_runtime.test.ts',
      'tests/corner_connector_emit_shell_runtime.test.ts',
      'tests/corner_state_normalize_runtime.test.ts',
      'tests/corner_wing_cell_runtime.test.ts',
    ],
  }),
  'runtime-access-surfaces': defineTestGroup({
    script: 'test:runtime-access-surfaces',
    description: 'Runtime access, platform, edit state, errors, history, and storage command surfaces.',
    kind: 'runtime-integration',
    owners: ['runtime/access', 'platform/access', 'state/history'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/cfg_history_platform_runtime_pack.test.ts',
      'tests/zustand_cfg_access_canonical_first.test.ts',
      'tests/platform_access_runtime.test.ts',
      'tests/meta_profile_owner_rejection_runtime.test.ts',
      'tests/edit_state_access_runtime.test.ts',
      'tests/edit_state_runtime_extended.test.ts',
      'tests/errors_runtime_access_cleanup_runtime.test.ts',
      'tests/errors_runtime_state_runtime.test.ts',
      'tests/history_service_runtime_state_isolation.test.ts',
      'tests/history_system_access_runtime.test.ts',
      'tests/history_runtime_action_channel_regression.test.ts',
      'tests/kernel_history_service_slot_runtime.test.ts',
      'tests/kernel_history_system_lifecycle_runtime.test.ts',
      'tests/state_api_history_meta_behavior_runtime.test.ts',
      'tests/state_api_history_store_reactivity_runtime.test.ts',
      'tests/platform_ops_owner_rejection_visibility_runtime.test.ts',
      'tests/storage_commands_access_diagnostics_runtime.test.ts',
    ],
  }),
  'canvas-interaction-surfaces': defineTestGroup({
    script: 'test:canvas-interaction-surfaces',
    description: 'Canvas hit, hover, door action, paint, selector, and projection interaction surfaces.',
    kind: 'service-runtime-integration',
    owners: ['services/canvas-picking'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/canvas_picking_cell_dims_corner_cell_runtime.test.ts',
      'tests/canvas_picking_cell_dims_linear_runtime.test.ts',
      'tests/canvas_picking_click_hit_flow_runtime.test.ts',
      'tests/canvas_picking_door_split_click_runtime.test.ts',
      'tests/canvas_picking_door_action_hover_flow_runtime.test.ts',
      'tests/canvas_picking_door_action_hover_preview_paint_runtime.test.ts',
      'tests/canvas_picking_door_action_hover_preview_trim_runtime.test.ts',
      'tests/canvas_picking_door_action_hover_state_runtime.test.ts',
      'tests/canvas_picking_hover_flow_runtime.test.ts',
      'tests/canvas_picking_hover_targets_runtime.test.ts',
      'tests/canvas_picking_local_helpers_runtime.test.ts',
      'tests/canvas_picking_module_selector_hits_runtime.test.ts',
      'tests/canvas_picking_paint_flow_apply_runtime.test.ts',
      'tests/canvas_picking_projection_runtime_box_runtime.test.ts',
    ],
  }),
  'domain-surfaces': defineTestGroup({
    script: 'test:domain-surfaces',
    description: 'Domain API, store actions, action access, and UI feedback runtime surfaces.',
    kind: 'runtime-integration',
    owners: ['kernel/domain-api', 'ui/actions', 'ui/feedback'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/domain_api_install_state_runtime.test.ts',
      'tests/domain_api_surface_sections_runtime.test.ts',
      'tests/domain_api_room_wardrobe_type_runtime.test.ts',
      'tests/domain_api_modules_recompute_canonical_materialization_runtime.test.ts',
      'tests/domain_api_modules_structure_materialization_runtime.test.ts',
      'tests/domain_api_browser_ui_ops_healing_runtime.test.ts',
      'tests/store_actions_ui_runtime.test.ts',
      'tests/store_actions_config_runtime.test.ts',
      'tests/actions_access_binding_runtime.test.ts',
      'tests/actions_surface_access_runtime.test.ts',
      'tests/actions_meta_stub_runtime.test.ts',
      'tests/ui_feedback_runtime_state_runtime.test.ts',
      'tests/ui_feedback_toast_runtime.test.ts',
      'tests/ui_feedback_prompt_cancel_runtime.test.ts',
      'tests/ui_feedback_wrapper_upgrade_runtime.test.ts',
    ],
  }),
  'render-surfaces': defineTestGroup({
    script: 'test:render-surfaces',
    description:
      'Render access, scene operations, motion, effects, room design, and render installation surfaces.',
    kind: 'runtime-integration',
    owners: ['runtime/render', 'services/scene-view'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/render_access_runtime_seams.test.ts',
      'tests/render_access_runtime_state.test.ts',
      'tests/render_access_runtime_scene_ops.test.ts',
      'tests/render_access_runtime_material_slots.test.ts',
      'tests/render_access_runtime_mirror_floor_cache.test.ts',
      'tests/render_context_access_runtime.test.ts',
      'tests/render_surface_runtime.test.ts',
      'tests/render_surface_runtime_support_runtime.test.ts',
      'tests/render_install_healing_runtime.test.ts',
      'tests/render_runtime_primitives_runtime.test.ts',
      'tests/render_loop_motion_runtime.test.ts',
      'tests/render_loop_visual_effects_runtime.test.ts',
      'tests/room_design_service_slot_runtime.test.ts',
      'tests/room_actions_runtime.test.ts',
    ],
  }),
  'door-build-surfaces': defineTestGroup({
    script: 'test:door-build-surfaces',
    description: 'Door trim, styles, glass, mirrors, dimensions, reveal frames, and post-build cut surfaces.',
    kind: 'builder-runtime-integration',
    owners: ['builder/doors', 'builder/post-build'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/door_trim_center_contract_runtime.test.ts',
      'tests/door_trim_targets_click_runtime.test.ts',
      'tests/door_trim_visuals_cache_runtime.test.ts',
      'tests/door_style_overrides_runtime.test.js',
      'tests/door_hinged_hardware_render_runtime.test.ts',
      'tests/door_glass_build_runtime.test.js',
      'tests/door_glass_profile_visual_runtime.test.js',
      'tests/door_mirror_visual_depth_runtime.test.js',
      'tests/post_build_dimensions_module_metrics_runtime.test.ts',
      'tests/post_build_front_reveal_frames_materials_runtime.test.ts',
      'tests/post_build_sketch_door_cuts_rebuild_runtime.test.ts',
      'tests/post_build_sketch_door_cuts_runtime_assembly.test.ts',
    ],
  }),
  'state-config-kernel-surfaces': defineTestGroup({
    script: 'test:state-config-kernel-surfaces',
    description: 'State API configuration, kernel config, React selectors, and runtime config validation.',
    kind: 'runtime-integration',
    owners: ['kernel/state', 'runtime/config'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 4, heartbeatMs: 10000, timeoutMs: 120000 },
    files: [
      'tests/state_api_config_namespace_canonical_runtime.test.ts',
      'tests/state_api_install_support_noop_runtime.test.ts',
      'tests/state_api_stack_router_corner_root_canonical_runtime.test.ts',
      'tests/state_api_stack_router_structure_materialization_runtime.test.ts',
      'tests/kernel_state_kernel_config_runtime.test.ts',
      'tests/kernel_state_kernel_config_noop_runtime.test.ts',
      'tests/react_config_selectors_runtime.test.ts',
      'tests/p9_runtime_config_validation.test.js',
    ],
  }),
  'canonical-access-surfaces': defineTestGroup({
    script: 'test:canonical-access-surfaces',
    description: 'Canonical application, browser, builder, camera, canvas, and Cloud Sync access surfaces.',
    kind: 'runtime-integration',
    owners: ['runtime/access', 'services/access'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/actions_access_binding_runtime.test.ts',
      'tests/actions_surface_access_runtime.test.ts',
      'tests/app_layers_surface_runtime.test.ts',
      'tests/app_roots_access_runtime.test.ts',
      'tests/boot_entry_access_runtime.test.ts',
      'tests/browser_surface_access_runtime.test.ts',
      'tests/build_reactions_access_runtime.test.ts',
      'tests/builder_deps_access_runtime.test.ts',
      'tests/camera_access_runtime.test.ts',
      'tests/canvas_picking_access_runtime.test.ts',
      'tests/cloud_sync_access_runtime.test.ts',
    ],
  }),
  'overlay-export-family-runtime': defineTestGroup({
    script: 'test:overlay-export-family-runtime',
    description: 'Overlay notes, export canvas, viewport, and workflow runtime surfaces.',
    kind: 'ui-runtime-integration',
    owners: ['ui/overlays', 'ui/export'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/overlay_quick_actions_dock_controller_runtime.test.ts',
      'tests/notes_overlay_editor_async_runtime.test.ts',
      'tests/notes_overlay_editor_state_runtime.test.ts',
      'tests/notes_overlay_interaction_runtime.test.ts',
      'tests/notes_overlay_persistence_runtime.test.ts',
      'tests/export_canvas_core_renderer_canvas_runtime.test.ts',
      'tests/export_canvas_viewport_runtime.test.ts',
      'tests/export_canvas_workflows_surface_runtime.test.ts',
      'tests/viewport_runtime_runtime.test.ts',
    ],
  }),
  'service-canonical-surfaces': defineTestGroup({
    script: 'test:service-canonical-surfaces',
    description:
      'Canonical service namespaces, installation healing, camera, scene view, Three doors, and errors.',
    kind: 'service-runtime-integration',
    owners: ['services/public-surface'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/services_namespace_runtime.test.ts',
      'tests/service_access_legacy_root_runtime.test.ts',
      'tests/ui_service_namespace_runtime.test.ts',
      'tests/service_install_healing_runtime.test.ts',
      'tests/camera_access_runtime.test.ts',
      'tests/scene_view_access_runtime.test.ts',
      'tests/runtime_three_doors_access_runtime.test.ts',
      'tests/errors_runtime_access_cleanup_runtime.test.ts',
    ],
  }),
  'perf-e2e-runtime-core': defineTestGroup({
    script: 'test:perf-e2e-runtime-core',
    description: 'Runtime performance instrumentation and action-flow observability contracts.',
    kind: 'runtime-integration',
    owners: ['runtime/perf', 'ui/action-events'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/perf_runtime_surface_runtime.test.ts',
      'tests/observability_surface_prod_runtime.test.ts',
      'tests/scene_geometry_debug_runtime.test.ts',
      'tests/wp_playwright_matrix_profiles_runtime.test.js',
      'tests/project_ui_action_events_runtime.test.ts',
      'tests/wp_browser_perf_support_runtime.test.js',
      'tests/export_actions_runtime.test.ts',
      'tests/cloud_sync_panel_actions_runtime.test.js',
      'tests/project_save_load_controller_singleflight_runtime.test.js',
    ],
  }),
  'runtime-platform-core-family-core': defineTestGroup({
    script: 'test:runtime-platform-core-family-core',
    description: 'Runtime, platform, kernel, history, snapshot, and configuration architecture contracts.',
    kind: 'architecture-contract',
    owners: ['runtime', 'platform', 'kernel'],
    environment: 'node',
    runner: 'node-test',
    portfolioRole: 'focused',
    files: [
      'tests/runtime_platform_core_family_contracts.test.js',
      'tests/platform_runtime_access_contracts.test.js',
      'tests/kernel_di_and_owner_contracts.test.js',
      'tests/kernel_history_runtime_contracts.test.js',
      'tests/kernel_snapshot_capture_contracts.test.js',
      'tests/statekernel_audit_contracts.test.js',
      'tests/runtime_config_platform_contracts.test.js',
    ],
  }),
  'builder-surfaces': defineTestGroup({
    script: 'test:builder-surfaces',
    description:
      'Builder public surface, dependency access, registry, scheduler, store access, and visibility.',
    kind: 'builder-runtime-integration',
    owners: ['builder/public-surface'],
    environment: 'tsx',
    runner: 'tsx-test',
    portfolioRole: 'focused',
    files: [
      'tests/builder_public_surface_runtime.test.ts',
      'tests/builder_deps_access_runtime.test.ts',
      'tests/builder_registry_runtime.test.ts',
      'tests/builder_scheduler_runtime.test.ts',
      'tests/builder_store_access_canonical_runtime.test.ts',
      'tests/builder_service_owner_rejection_visibility_runtime.test.ts',
    ],
  }),
  'no-main-surfaces': defineTestGroup({
    script: 'test:no-main-surfaces',
    description:
      'No-main sketch/modules, projection, canonical snapshots, and wardrobe build context surfaces.',
    kind: 'runtime-integration',
    owners: ['builder/no-main', 'services/canvas-picking'],
    environment: 'tsx',
    runner: 'serial-tsx',
    portfolioRole: 'focused',
    serialPolicy: { batchSize: 1, heartbeatMs: 0, timeoutMs: 0 },
    files: [
      'tests/no_main_sketch_workspace_runtime.test.ts',
      'tests/no_main_modules_runtime.test.ts',
      'tests/canvas_picking_projection_runtime_box_runtime.test.ts',
      'tests/kernel_snapshot_store_build_state_canonical_runtime.test.ts',
      'tests/build_wardrobe_flow_context_runtime.test.ts',
    ],
  }),
  'perf-toolchain-core': defineTestGroup({
    script: 'test:perf-toolchain-core',
    description: 'Performance smoke and verification toolchain contracts.',
    kind: 'toolchain-contract',
    owners: ['toolchain/performance', 'toolchain/verification'],
    environment: 'node',
    runner: 'node-test',
    portfolioRole: 'focused',
    files: [
      'tests/wp_perf_smoke_runtime.test.js',
      'tests/wp_toolchain_family_contracts.test.js',
      'tests/wp_check_runtime.test.js',
      'tests/wp_verify_runtime.test.js',
      'tests/wp_verify_lane_runtime.test.js',
      'tests/wp_verify_parallel_runtime.test.js',
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
