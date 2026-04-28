import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

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

test('stage guard portfolio has a single package lane', () => {
  const lane = packageJson.scripts['test:refactor-stage-guards'] || '';
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
    assert.match(lane, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});
