import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_HIGH_STAGE_METADATA,
  REFACTOR_INTEGRATION_ANCHORS,
  REFACTOR_POST_CLOSEOUT_GUARDRAILS,
} from '../tools/wp_refactor_stage_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

const GUARD_FILE = 'tests/refactor_stage80_measurement_perf_closeout_guard.test.js';

test('stage 80 measurement and performance closeout is anchored', () => {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  const plan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  const quality = read('docs/QUALITY_GUARDRAILS.md');
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const perfHotpath = read('tools/wp_perf_hotpath_contract.mjs');
  const perfSmoke = read('tools/wp_perf_smoke.mjs');
  const perfSmokeShared = read('tools/wp_perf_smoke_shared.js');
  const browserPerf = read('tools/wp_browser_perf_smoke.mjs');
  const perfBaselineDoc = read('docs/PERF_AND_STABILITY_BASELINE.md');
  const browserBaselineDoc = read('docs/BROWSER_PERF_AND_E2E_BASELINE.md');

  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.at(-1), 'Stage 80');
  assert.equal(REFACTOR_COMPLETED_STAGE_LABELS.length, 81);
  assert.deepEqual(
    REFACTOR_HIGH_STAGE_METADATA.map(entry => entry.stage),
    [74, 75, 76, 77, 78, 79, 80],
    'high-number completed stages must have explicit catalog metadata'
  );
  assert.ok(
    REFACTOR_POST_CLOSEOUT_GUARDRAILS.some(entry => entry.script === 'check:private-owner-imports'),
    'post-closeout private-owner import guardrail must stay cataloged'
  );
  assert.ok(
    REFACTOR_INTEGRATION_ANCHORS.some(anchor =>
      anchor.needle.includes('stage 80 measurement and performance closeout is anchored')
    ),
    'stage 80 must be registered in the shared refactor stage catalog anchors'
  );

  assert.equal(
    scripts['check:refactor-closeout'],
    `node --test ${GUARD_FILE}`,
    'stage 80 closeout must have a focused fast check script'
  );
  assert.ok(
    scripts['check:refactor-guardrails'].includes('npm run check:refactor-closeout'),
    'stage 80 closeout must run in the refactor guardrail lane'
  );
  assert.ok(
    scripts['test:refactor-stage-guards'].includes(GUARD_FILE),
    'stage 80 guard must run with the stage guard suite'
  );
  assert.ok(integrationAudit.includes('check:refactor-closeout'));
  assert.ok(integrationAudit.includes(GUARD_FILE));

  assert.equal(scripts['check:perf-hotpaths'], 'node tools/wp_perf_hotpath_contract.mjs');
  assert.equal(scripts['perf:smoke'], 'node tools/wp_perf_smoke.mjs --enforce');
  assert.match(scripts['perf:smoke:update-baseline'], /--update-baseline/);
  assert.match(scripts['perf:smoke:update-baseline'], /docs\/PERF_AND_STABILITY_BASELINE\.md/);
  assert.equal(scripts['perf:browser'], 'node tools/wp_browser_perf_smoke.mjs --enforce');
  assert.match(scripts['perf:browser:update-baseline'], /--update-baseline/);

  assert.match(perfSmoke, /runPerfSmokeFlow/);
  assert.match(perfSmokeShared, /PERF_AND_STABILITY_BASELINE/);
  assert.match(perfSmokeShared, /wp_perf_smoke_baseline\.json/);
  assert.match(browserPerf, /BROWSER_PERF_AND_E2E_BASELINE/);
  assert.match(browserPerf, /resolveBrowserPerfBaselinePath/);

  assert.match(perfHotpath, /handles_apply\.ts/);
  assert.match(perfHotpath, /scheduler_shared_timers\.ts/);
  assert.match(perfHotpath, /scheduler_runtime\.ts/);
  assert.match(perfHotpath, /timing probes/);
  assert.match(perfHotpath, /performance\\.now/);
  assert.match(perfHotpath, /Date\\.now/);
  assert.match(perfHotpath, /getBrowserTimers\(App\)/);
  assert.match(perfHotpath, /shouldSuppressSatisfiedRequest/);
  assert.match(perfHotpath, /shouldSuppressRepeatedExecute/);

  assert.match(plan, /Stage 80 — Measurement and performance guard closeout — completed/);
  assert.match(plan, /Stage 80 closes the current modernization\/refactor track/);
  assert.match(plan, /Do not create Stage 81 just to continue the numbering/);
  assert.doesNotMatch(plan, /Stage 81\s+—/);

  assert.match(quality, /## Measurement and refactor closeout/);
  assert.match(
    quality,
    /Do not add Stage 81 unless a new, concrete ownership seam passes the professional split gate/
  );
  assert.match(quality, /npm run check:refactor-closeout/);
  assert.match(quality, /npm run perf:smoke/);
  assert.match(quality, /npm run perf:browser/);

  assert.match(perfBaselineDoc, /Tool-owned report target/);
  assert.match(perfBaselineDoc, /tools\/wp_perf_smoke_baseline\.json/);
  assert.match(browserBaselineDoc, /## Runtime health/);
  assert.match(browserBaselineDoc, /## Store write pressure/);
  assert.match(browserBaselineDoc, /## Builder scheduling pressure/);
  assert.match(browserBaselineDoc, /## Runtime perf summary/);

  assert.match(progress, /Stage 80/);
  assert.match(workmap, /Stage 80 — Measurement and performance guard closeout retained/);
});
