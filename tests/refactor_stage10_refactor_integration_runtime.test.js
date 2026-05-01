import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_INTEGRATION_ANCHORS,
  REFACTOR_STAGE_PROGRESS_MARKER,
  assertRefactorStageCatalogIsWellFormed,
} from '../tools/wp_refactor_stage_catalog.mjs';

const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

function runNodeScript(script) {
  const result = spawnSync(process.execPath, [script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  assert.equal(result.status, 0, `${script} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

test('stage 10 refactor integration audit is wired into guardrails and verify lane', () => {
  assert.match(pkg.scripts['check:refactor-guardrails'], /npm run check:refactor-integration/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:script-duplicates/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:legacy-fallbacks/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run check:refactor-guardrails/);
  assert.match(pkg.scripts['verify:refactor-modernization'], /npm run test:refactor-stage-guards/);
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage10_refactor_integration_runtime\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage42_legacy_fallback_inventory_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage43_perf_runtime_surface_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage44_scheduler_debug_stats_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage45_corner_connector_special_ownership_guard\.test\.js/
  );
  assert.match(
    pkg.scripts['test:refactor-stage-guards'],
    /tests\/refactor_stage46_domain_api_shared_ownership_guard\.test\.js/
  );

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
    'REFACTOR_STAGE_PROGRESS_MARKER',
    'REFACTOR_COMPLETED_STAGE_LABELS',
    'REFACTOR_INTEGRATION_ANCHORS',
  ]) {
    assert.ok(audit.includes(expected), `audit should include ${expected}`);
  }

  assert.equal(REFACTOR_STAGE_PROGRESS_MARKER.file, 'docs/REFACTOR_WORKMAP_PROGRESS.md');
  assert.equal(REFACTOR_STAGE_PROGRESS_MARKER.verifyEntryPoint, 'verify:refactor-modernization');
});

test('stage 39 to 41 refactor control-plane stage catalog is anchored', () => {
  assert.equal(assertRefactorStageCatalogIsWellFormed(), true);
  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.at(0), 'Stage 0');
  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.at(-1), 'Stage 46');
  assert.equal(new Set(REFACTOR_COMPLETED_STAGE_LABELS).size, REFACTOR_COMPLETED_STAGE_LABELS.length);

  const progress = fs.readFileSync(REFACTOR_STAGE_PROGRESS_MARKER.file, 'utf8');
  for (const stage of REFACTOR_COMPLETED_STAGE_LABELS) {
    assert.match(progress, new RegExp(`${stage.replace(' ', '\\s+')}\\b`));
  }

  const audit = fs.readFileSync('tools/wp_refactor_integration_audit.mjs', 'utf8');
  assert.match(audit, /REFACTOR_COMPLETED_STAGE_LABELS/);
  assert.match(audit, /REFACTOR_INTEGRATION_ANCHORS/);
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 39 to 41 refactor control-plane stage catalog is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 42 legacy fallback inventory closeout is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 43 perf runtime ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 44 scheduler debug stats ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 45 corner connector special interior ownership split is anchored')
    )
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 46 domain API shared ownership split is anchored')
    )
  );

  runNodeScript('tools/wp_refactor_integration_audit.mjs');
});
