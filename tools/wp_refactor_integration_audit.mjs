#!/usr/bin/env node
import { readFileSync } from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_HIGH_STAGE_METADATA,
  REFACTOR_INTEGRATION_ANCHORS,
  REFACTOR_POST_CLOSEOUT_GUARDRAILS,
  REFACTOR_STAGE_PROGRESS_MARKER,
  assertRefactorStageCatalogIsWellFormed,
} from './wp_refactor_stage_catalog.mjs';

function read(file) {
  return readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

const pkg = readJson('package.json');
const scripts = pkg.scripts || {};
const errors = [];

function requireScript(name) {
  if (!Object.prototype.hasOwnProperty.call(scripts, name))
    errors.push(`package.json: missing script ${name}`);
  return String(scripts[name] || '');
}

function requireNeedle(label, source, needle, message) {
  if (!source.includes(needle)) errors.push(`${label}: ${message || `missing ${needle}`}`);
}

try {
  assertRefactorStageCatalogIsWellFormed();
} catch (err) {
  errors.push(`tools/wp_refactor_stage_catalog.mjs: ${err?.message || err}`);
}

const requiredGuardScripts = [
  'check:import-cycles',
  'check:private-owner-imports',
  'check:project-import-fixtures',
  'check:project-migration-boundary',
  'check:runtime-selector-policy',
  'check:html-sinks',
  'check:css-style',
  'check:builder-context-policy',
  'check:builder-pipeline-contract',
  'check:features-public-api',
  'check:type-hardening',
  'check:ui-option-buttons',
  'check:ui-design-system',
  'check:ui-effect-cleanup',
  'check:canvas-hit-identity',
  'check:canvas-hit-parity',
  'check:cloud-sync-timers',
  'check:cloud-sync-races',
  'check:cloud-sync-offline-reconnect',
  'check:perf-hotpaths',
  'check:refactor-closeout',
  'check:test-portfolio',
  'check:refactor-integration',
];

for (const script of requiredGuardScripts) requireScript(script);
const guardrailCommand = requireScript('check:refactor-guardrails');
for (const script of requiredGuardScripts)
  requireNeedle('check:refactor-guardrails', guardrailCommand, `npm run ${script}`);

const requiredStageGuardTests = [
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
];
const stageGuardCommand = requireScript('test:refactor-stage-guards');
for (const testFile of requiredStageGuardTests)
  requireNeedle('test:refactor-stage-guards', stageGuardCommand, testFile);

for (const stage of REFACTOR_HIGH_STAGE_METADATA) {
  requireNeedle('test:refactor-stage-guards', stageGuardCommand, stage.guard);
  const verificationCommand = requireScript(stage.verificationLane);
  if (stage.verificationLane === 'test:refactor-stage-guards') {
    requireNeedle(stage.verificationLane, verificationCommand, stage.guard);
  } else if (stage.guard) {
    requireNeedle(stage.verificationLane, verificationCommand, stage.guard);
  }
}

for (const guardrail of REFACTOR_POST_CLOSEOUT_GUARDRAILS) {
  const scriptCommand = requireScript(guardrail.script);
  requireNeedle('check:refactor-guardrails', guardrailCommand, `npm run ${guardrail.script}`);
  requireNeedle(guardrail.script, scriptCommand, guardrail.tool);
  if (guardrail.guard) requireNeedle(guardrail.script, scriptCommand, guardrail.guard);
}

const verifyRefactorCommand = requireScript('verify:refactor-modernization');
for (const script of [
  'check:script-duplicates',
  'check:import-cycles',
  'check:legacy-fallbacks',
  'check:refactor-guardrails',
  'test:refactor-stage-guards',
]) {
  requireNeedle('verify:refactor-modernization', verifyRefactorCommand, `npm run ${script}`);
}

const verifyFlow = read('tools/wp_verify_flow.js');
requireNeedle('tools/wp_verify_flow.js', verifyFlow, "scriptName: 'check:refactor-guardrails'");
const guardIndex = verifyFlow.indexOf("scriptName: 'check:refactor-guardrails'");
const testIndex = verifyFlow.indexOf("scriptName: 'test'");
if (guardIndex < 0 || testIndex < 0 || guardIndex > testIndex) {
  errors.push('tools/wp_verify_flow.js: check:refactor-guardrails must run before npm test');
}

const progressDoc = read(REFACTOR_STAGE_PROGRESS_MARKER.file);
for (const stage of REFACTOR_COMPLETED_STAGE_LABELS) {
  requireNeedle(REFACTOR_STAGE_PROGRESS_MARKER.file, progressDoc, stage);
}
requireNeedle(
  REFACTOR_STAGE_PROGRESS_MARKER.file,
  progressDoc,
  REFACTOR_STAGE_PROGRESS_MARKER.verifyEntryPoint
);

for (const anchor of REFACTOR_INTEGRATION_ANCHORS) {
  requireNeedle(anchor.file, read(anchor.file), anchor.needle, anchor.message);
}

if (errors.length) {
  console.error('[refactor-integration-audit] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[refactor-integration-audit] ok');
process.exit(0);
