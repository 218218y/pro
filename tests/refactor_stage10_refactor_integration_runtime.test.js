import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

test('stage 10 refactor integration audit is wired into guardrails and verify lane', () => {
  assert.match(pkg.scripts['check:refactor-guardrails'], /npm run check:refactor-integration/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:script-duplicates/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:legacy-fallbacks/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:refactor-guardrails/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run test:refactor-stage-guards/);
  assert.match(pkg.scripts['test:refactor-stage-guards'], /tests\/refactor_stage10_refactor_integration_runtime\.test\.js/);

  const verifyFlow = fs.readFileSync('tools/wp_verify_flow.js', 'utf8');
  const guardIndex = verifyFlow.indexOf("scriptName: 'check:refactor-guardrails'");
  const testIndex = verifyFlow.indexOf("scriptName: 'test'");
  assert.ok(guardIndex >= 0, 'verify flow should run refactor guardrails');
  assert.ok(testIndex > guardIndex, 'refactor guardrails should run before the general test suite');
});

test('stage 10 refactor integration audit covers guardrails, stage tests, verify flow and progress docs', () => {
  const audit = fs.readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  for (const expected of [
    'requiredGuardScripts',
    'requiredStageGuardTests',
    'verify:refactor-modernization',
    'tools/wp_verify_flow.js',
    'docs/REFACTOR_WORKMAP_PROGRESS.md',
    'Stage 13',
  ]) {
    assert.ok(audit.includes(expected), `audit should include ${expected}`);
  }
});
