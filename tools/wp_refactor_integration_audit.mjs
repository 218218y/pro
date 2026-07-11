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
import { readTestGroupFiles } from './wp_test_group_catalog.mjs';

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
  'check:docs-control-plane',
  'check:generated-reports',
  'check:site-profiles',
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

const requiredStageGuardTests = readTestGroupFiles('refactor-stage-guards') || [];
const stageGuardCommand = requireScript('test:refactor-stage-guards');
requireNeedle(
  'test:refactor-stage-guards',
  stageGuardCommand,
  'tools/wp_test_group.mjs refactor-stage-guards'
);
if (!requiredStageGuardTests.length) {
  errors.push('tools/wp_test_group_catalog.mjs: refactor-stage-guards group is missing or empty');
}

for (const stage of REFACTOR_HIGH_STAGE_METADATA) {
  const verificationCommand = requireScript(stage.verificationLane);
  if (stage.verificationLane === 'test:refactor-stage-guards') {
    if (!requiredStageGuardTests.includes(stage.guard)) {
      errors.push(`tools/wp_test_group_catalog.mjs: refactor-stage-guards missing ${stage.guard}`);
    }
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
  'check:docs-control-plane',
  'check:generated-reports',
  'check:site-profiles',
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
