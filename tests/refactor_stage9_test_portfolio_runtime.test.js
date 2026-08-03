import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import { readTestGroupFiles } from '../tools/wp_test_group_catalog.mjs';
import {
  collectDirectRepositoryLayerScanTests,
  collectHistoricalMigrationPrefixTests,
} from '../tools/wp_test_portfolio_audit.mjs';

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('stage 9 test portfolio audit is wired into refactor guardrails', () => {
  assert.ok(fs.existsSync('tools/wp_test_portfolio_audit.mjs'));
  assert.ok(fs.existsSync('docs/TEST_PORTFOLIO_GUIDELINES.md'));
  assert.ok(fs.existsSync('docs/REFACTOR_WORKMAP_PROGRESS.md'));
  assert.equal(
    packageJson.scripts['check:test-portfolio'],
    'node tools/wp_test_portfolio_audit.mjs --no-print'
  );
  assert.match(packageJson.scripts['check:refactor-guardrails'], /check:test-portfolio/);
});

test('stage guard portfolio has one package facade backed by the canonical test-group catalog', () => {
  assert.equal(
    packageJson.scripts['test:refactor-stage-guards'],
    'node tools/wp_test_group.mjs refactor-stage-guards'
  );
  const files = readTestGroupFiles('refactor-stage-guards');
  assert.ok(Array.isArray(files));
  for (const file of [
    'tests/refactor_stage3_guardrails_runtime.test.js',
    'tests/refactor_stage4_public_api_and_type_hardening_runtime.test.js',
    'tests/refactor_stage5_ui_option_buttons_runtime.test.js',
    'tests/refactor_stage6_ui_effect_cleanup_runtime.test.js',
    'tests/refactor_stage7_canvas_hit_identity_runtime.test.js',
    'tests/refactor_stage8_cloud_sync_and_perf_runtime.test.js',
    'tests/refactor_stage9_test_portfolio_runtime.test.js',
  ]) {
    assert.ok(fs.existsSync(file), `${file} should exist`);
    assert.ok(files.includes(file), `${file} should belong to refactor-stage-guards`);
  }
});

test('repository-wide layer collection is centralized behind the cached fixture', () => {
  assert.deepEqual(collectDirectRepositoryLayerScanTests(), []);
});

test('historical migration prefixes are centralized in the final closeout fingerprint', () => {
  assert.deepEqual(collectHistoricalMigrationPrefixTests(), []);
});
