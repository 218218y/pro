#!/usr/bin/env node
import { readFileSync } from 'node:fs';

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

function requireNeedle(label, source, needle) {
  if (!source.includes(needle)) errors.push(`${label}: missing ${needle}`);
}

const requiredGuardScripts = [
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
  'check:perf-hotpaths',
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
];
const stageGuardCommand = requireScript('test:refactor-stage-guards');
for (const testFile of requiredStageGuardTests)
  requireNeedle('test:refactor-stage-guards', stageGuardCommand, testFile);

const verifyRefactorCommand = requireScript('verify:refactor-modernization');
for (const script of [
  'check:script-duplicates',
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

const progressDoc = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
for (const stage of [
  'Stage 0',
  'Stage 1',
  'Stage 2',
  'Stage 3',
  'Stage 4',
  'Stage 5',
  'Stage 6',
  'Stage 7',
  'Stage 8',
  'Stage 9',
  'Stage 10',
  'Stage 11',
  'Stage 12',
  'Stage 13',
  'Stage 14',
  'Stage 15',
  'Stage 16',
  'Stage 17',
  'Stage 18',
  'Stage 19',
  'Stage 20',
  'Stage 21',
  'Stage 22',
  'Stage 23',
]) {
  requireNeedle('docs/REFACTOR_WORKMAP_PROGRESS.md', progressDoc, stage);
}
requireNeedle('docs/REFACTOR_WORKMAP_PROGRESS.md', progressDoc, 'verify:refactor-modernization');

if (errors.length) {
  console.error('[refactor-integration-audit] FAILED');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('[refactor-integration-audit] ok');
process.exit(0);
