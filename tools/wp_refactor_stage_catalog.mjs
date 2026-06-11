export const REFACTOR_COMPLETED_STAGE_LABELS = Object.freeze(
  Array.from({ length: 81 }, (_, index) => `Stage ${index}`)
);

export const REFACTOR_STAGE_PROGRESS_MARKER = Object.freeze({
  file: 'docs/REFACTOR_WORKMAP_PROGRESS.md',
  verifyEntryPoint: 'verify:refactor-modernization',
});

export const REFACTOR_HIGH_STAGE_METADATA = Object.freeze([
  {
    stage: 74,
    label: 'Stage 74',
    slug: 'refactor-next-stage-plan-quality-gate',
    kind: 'planning-gate',
    status: 'completed',
    primarySurface: 'docs/REFACTOR_NEXT_STAGE_PLAN.md',
    guard: 'tests/refactor_stage74_refactor_next_stage_plan_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 75,
    label: 'Stage 75',
    slug: 'sketch-box-door-visual-ownership',
    kind: 'ownership-split',
    status: 'completed',
    publicFacade: 'esm/native/builder/render_interior_sketch_boxes_fronts_door_visuals.ts',
    guard: 'tests/refactor_stage75_sketch_box_door_visual_ownership_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 76,
    label: 'Stage 76',
    slug: 'drawer-shared-render-contract-ownership',
    kind: 'ownership-split',
    status: 'completed',
    publicFacade: 'esm/native/builder/render_drawer_ops_shared.ts',
    guard: 'tests/refactor_stage76_drawer_shared_contract_ownership_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 77,
    label: 'Stage 77',
    slug: 'sketch-box-controls-runtime-ownership',
    kind: 'ownership-split',
    status: 'completed',
    publicFacade: 'esm/native/ui/react/tabs/interior_layout_sketch_box_controls_runtime.ts',
    guard: 'tests/refactor_stage77_sketch_box_controls_runtime_ownership_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 78,
    label: 'Stage 78',
    slug: 'runtime-access-surfaces-ownership',
    kind: 'runtime-boundary',
    status: 'completed',
    publicFacade: 'esm/native/runtime/ui_raw_selectors.ts',
    additionalPublicFacades: ['esm/native/runtime/runtime_selectors.ts'],
    guard: 'tests/refactor_stage78_runtime_access_surfaces_ownership_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 79,
    label: 'Stage 79',
    slug: 'order-pdf-export-command-ownership',
    kind: 'ownership-split',
    status: 'completed',
    publicFacade: 'esm/native/ui/react/pdf/order_pdf_overlay_export_commands.ts',
    guard: 'tests/refactor_stage79_order_pdf_export_commands_ownership_guard.test.js',
    verificationLane: 'test:refactor-stage-guards',
  },
  {
    stage: 80,
    label: 'Stage 80',
    slug: 'measurement-performance-closeout',
    kind: 'measurement-closeout',
    status: 'completed',
    primarySurface: 'docs/REFACTOR_NEXT_STAGE_PLAN.md',
    guard: 'tests/refactor_stage80_measurement_perf_closeout_guard.test.js',
    verificationLane: 'check:refactor-closeout',
  },
]);

export const REFACTOR_POST_CLOSEOUT_GUARDRAILS = Object.freeze([
  {
    id: 'post-stage-80-import-cycle-baseline',
    script: 'check:import-cycles',
    tool: 'tools/wp_cycles.js',
    verificationLane: 'check:refactor-guardrails',
    scope: 'esm and types import graph',
  },
  {
    id: 'post-stage-80-private-owner-import-boundary',
    script: 'check:private-owner-imports',
    tool: 'tools/wp_private_owner_import_boundary_audit.mjs',
    guard: 'tests/private_owner_import_boundary_audit_runtime.test.js',
    verificationLane: 'check:refactor-guardrails',
    scope: 'registered facade/private-owner families',
  },
  {
    id: 'post-stage-80-project-import-fixtures',
    script: 'check:project-import-fixtures',
    tool: 'tools/wp_run_tsx_tests.mjs',
    guard: 'tests/project_import_fixtures_runtime.test.ts',
    verificationLane: 'check:refactor-guardrails',
    scope: 'real project import fixtures and canonical load ingress',
  },
  {
    id: 'post-stage-80-css-cascade-budget',
    script: 'check:css-style',
    tool: 'tools/wp_css_style_audit.mjs',
    guard: 'tools/wp_css_style_budget.json',
    verificationLane: 'check:refactor-guardrails',
    scope: 'CSS cascade debt budget ratchet',
  },
  {
    id: 'post-stage-80-cloud-sync-offline-reconnect',
    script: 'check:cloud-sync-offline-reconnect',
    tool: 'tools/wp_run_tsx_tests.mjs',
    guard: 'tests/cloud_sync_offline_reconnect_runtime.test.ts',
    verificationLane: 'check:refactor-guardrails',
    scope: 'Cloud Sync offline/reconnect attention behavior',
  },
]);

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
    file: 'tests/refactor_stage74_refactor_next_stage_plan_guard.test.js',
    needle: 'stage 74 refactor next-stage plan quality gate is anchored',
    message: 'stage 74 refactor next-stage plan quality gate must stay anchored',
  },
  {
    file: 'tests/refactor_stage75_sketch_box_door_visual_ownership_guard.test.js',
    needle: 'stage 75 sketch box door visual ownership split is anchored',
    message: 'stage 75 sketch box door visual ownership split must stay anchored',
  },
  {
    file: 'tests/refactor_stage76_drawer_shared_contract_ownership_guard.test.js',
    needle: 'stage 76 drawer shared render contract ownership split is anchored',
    message: 'stage 76 drawer shared render contract ownership split must stay anchored',
  },
  {
    file: 'tests/refactor_stage77_sketch_box_controls_runtime_ownership_guard.test.js',
    needle: 'stage 77 sketch box controls runtime ownership split is anchored',
    message: 'stage 77 sketch box controls runtime ownership split must stay anchored',
  },

  {
    file: 'tests/refactor_stage78_runtime_access_surfaces_ownership_guard.test.js',
    needle: 'stage 78 runtime access surfaces ownership split is anchored',
    message: 'stage 78 runtime access surfaces ownership split must stay anchored',
  },

  {
    file: 'tests/refactor_stage79_order_pdf_export_commands_ownership_guard.test.js',
    needle: 'stage 79 order pdf export command ownership split is anchored',
    message: 'stage 79 order pdf export command ownership split must stay anchored',
  },

  {
    file: 'tests/refactor_stage80_measurement_perf_closeout_guard.test.js',
    needle: 'stage 80 measurement and performance closeout is anchored',
    message: 'stage 80 measurement and performance closeout must stay anchored',
  },

  {
    file: 'tests/project_config_migration_replace_keys_runtime.test.ts',
    needle: 'materializes every replace-owned branch',
    message: 'project config migration must prove replace-owned branch materialization',
  },

  {
    file: 'tests/refactor_stage80_measurement_perf_closeout_guard.test.js',
    needle: 'stage 80 measurement and performance closeout is anchored',
    message: 'stage 80 measurement and performance closeout must stay anchored',
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

  const highStageIds = new Set();
  const highStageSlugs = new Set();
  for (const entry of REFACTOR_HIGH_STAGE_METADATA) {
    if (!Number.isInteger(entry.stage) || entry.stage < 0) {
      throw new Error(`high-stage metadata has invalid stage: ${entry.stage}`);
    }
    if (entry.label !== `Stage ${entry.stage}`) {
      throw new Error(`high-stage metadata label mismatch for stage ${entry.stage}`);
    }
    if (!labels.includes(entry.label)) {
      throw new Error(`high-stage metadata references incomplete stage ${entry.label}`);
    }
    if (highStageIds.has(entry.stage)) {
      throw new Error(`duplicate high-stage metadata for ${entry.label}`);
    }
    if (!entry.slug || highStageSlugs.has(entry.slug)) {
      throw new Error(`missing or duplicate high-stage slug for ${entry.label}`);
    }
    if (!entry.guard || !entry.verificationLane || !entry.status) {
      throw new Error(`high-stage metadata is incomplete for ${entry.label}`);
    }
    highStageIds.add(entry.stage);
    highStageSlugs.add(entry.slug);
  }

  for (const stage of [74, 75, 76, 77, 78, 79, 80]) {
    if (!highStageIds.has(stage)) {
      throw new Error(`high-stage metadata missing Stage ${stage}`);
    }
  }

  const postCloseoutIds = new Set();
  for (const entry of REFACTOR_POST_CLOSEOUT_GUARDRAILS) {
    if (!entry.id || postCloseoutIds.has(entry.id)) {
      throw new Error('post-closeout guardrail metadata has a missing or duplicate id');
    }
    if (!entry.script || !entry.tool || !entry.verificationLane || !entry.scope) {
      throw new Error(`post-closeout guardrail metadata is incomplete for ${entry.id}`);
    }
    postCloseoutIds.add(entry.id);
  }

  return true;
}
