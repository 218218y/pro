import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

import {
  REFACTOR_COMPLETED_STAGE_LABELS,
  REFACTOR_HIGH_STAGE_METADATA,
  REFACTOR_INTEGRATION_ANCHORS,
  REFACTOR_POST_CLOSEOUT_GUARDRAILS,
} from '../tools/wp_refactor_stage_catalog.mjs';
import { GENERATED_REPORT_CATALOG } from '../tools/wp_generated_report_contract.mjs';
import { readTestGroupFiles } from '../tools/wp_test_group_catalog.mjs';

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function readJson(file) {
  return JSON.parse(read(file));
}

const GUARD_FILE = 'tests/refactor_stage80_measurement_perf_closeout_guard.test.js';
const CSS_IMPORTANT_RATCHET_CEILING = 0;
const CSS_Z_INDEX_RATCHET_CEILING = 40;

test('post-closeout guards use capability names instead of continuing numbered stages', () => {
  const numberedPostCloseoutGuards = fs
    .readdirSync('tests')
    .filter(file => /^refactor_stage(?:8[1-9]|9\d)_.*_guard\.test\.(?:js|ts)$/u.test(file));
  assert.deepEqual(numberedPostCloseoutGuards, []);

  const plan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  assert.match(plan, /drawer-cross-family-identity/);
  assert.match(plan, /browser-security-headers/);
  assert.match(plan, /developer-feedback-gates/);
  assert.match(plan, /Do not create `refactor_stage81_\*`/);
});

test('stage 80 measurement and performance closeout is anchored', () => {
  const pkg = readJson('package.json');
  const scripts = pkg.scripts || {};
  const plan = read('docs/REFACTOR_NEXT_STAGE_PLAN.md');
  const quality = read('docs/QUALITY_GUARDRAILS.md');
  const progress = read('docs/REFACTOR_WORKMAP_PROGRESS.md');
  const workmap = read('refactor_workmap.md');
  const integrationAudit = read('tools/wp_refactor_integration_audit.mjs');
  const cssBudget = readJson('tools/wp_css_style_budget.json');
  const cssAudit = read('tools/wp_css_style_audit.mjs');
  const cssReport = read('docs/CSS_STYLE_AUDIT.md');
  const perfHotpath = read('tools/wp_perf_hotpath_contract.mjs');
  const perfSmoke = read('tools/wp_perf_smoke.mjs');
  const perfSmokeShared = read('tools/wp_perf_smoke_shared.js');
  const browserPerf = read('tools/wp_browser_perf_smoke.mjs');
  const browserPerfPaths = read('tools/wp_browser_perf_paths.js');
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
    readTestGroupFiles('refactor-stage-guards')?.includes(GUARD_FILE),
    'stage guard must belong to the canonical refactor-stage group'
  );
  assert.ok(integrationAudit.includes('check:refactor-closeout'));
  assert.match(integrationAudit, /readTestGroupFiles\('refactor-stage-guards'\)/);
  assert.match(integrationAudit, /requiredStageGuardTests\.includes\(stage\.guard\)/);

  assert.equal(scripts['check:perf-hotpaths'], 'node tools/wp_perf_hotpath_contract.mjs');
  assert.equal(scripts['perf:smoke'], 'node tools/wp_perf_smoke.mjs --enforce');
  assert.match(scripts['perf:smoke:update-baseline'], /--update-baseline/);
  assert.match(scripts['perf:smoke:update-baseline'], /docs\/PERF_AND_STABILITY_BASELINE\.md/);
  assert.equal(scripts['perf:browser'], 'node tools/wp_browser_perf_smoke.mjs --enforce');
  assert.match(scripts['perf:browser:update-baseline'], /--update-baseline/);
  assert.equal(
    scripts['check:css-style'],
    'node --test tests/css_shadow_tokens_contract.test.js && node tools/wp_css_style_audit.mjs --check --budget=tools/wp_css_style_budget.json'
  );
  assert.equal(
    scripts['report:css-style'],
    'node tools/wp_generated_report_contract.mjs --write --only=css-style'
  );
  const cssReportContract = GENERATED_REPORT_CATALOG.find(report => report.id === 'css-style');
  assert.ok(cssReportContract, 'generated report catalog must own the CSS report');
  assert.ok(
    cssReportContract
      .command({ json: 'report.json', markdown: 'report.md' })
      .includes('--budget=tools/wp_css_style_budget.json'),
    'CSS report generation must retain the enforced style budget'
  );
  assert.equal(cssBudget.file, 'css/react_styles.css');
  assert.ok(
    cssBudget.metrics.important.max <= CSS_IMPORTANT_RATCHET_CEILING,
    'CSS !important budget must not drift above the latest cleanup ratchet'
  );
  assert.equal(cssBudget.metrics.transitionAll.max, 0);
  assert.ok(
    cssBudget.metrics.zIndex.max <= CSS_Z_INDEX_RATCHET_CEILING,
    'CSS z-index budget must not drift above the latest cleanup ratchet'
  );
  assert.equal(cssBudget.metrics.zIndexTokenless.max, 0);
  assert.equal(cssBudget.metrics.boxShadow.max, 0);
  assert.match(cssAudit, /budgetPath/);
  assert.match(cssAudit, /unknown metric/);
  assert.match(cssAudit, /countZIndexWithoutToken/);
  assert.match(cssAudit, /countBoxShadowWithoutToken/);

  assert.match(perfSmoke, /runPerfSmokeFlow/);
  assert.match(perfSmokeShared, /PERF_AND_STABILITY_BASELINE/);
  assert.match(perfSmokeShared, /wp_perf_smoke_baseline\.json/);
  assert.match(browserPerf, /BROWSER_PERF_AND_E2E_BASELINE/);
  assert.match(browserPerf, /resolveBrowserPerfBaselinePath/);
  assert.match(browserPerfPaths, /BROWSER_PERF_BASELINE_RELATIVE_PATH/);
  assert.match(browserPerfPaths, /wp_browser_perf_smoke_baseline\.json/);
  assert.doesNotMatch(browserPerfPaths, /BROWSER_PERF_BASELINE_CANDIDATES/);
  assert.doesNotMatch(browserPerfPaths, /wp_perf_smoke_baseline\.json/);

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
  assert.match(quality, /## CSS cascade/);
  assert.match(quality, /tools\/wp_css_style_budget\.json/);
  assert.match(cssReport, /Budget: `tools\/wp_css_style_budget\.json`/);

  assert.match(perfBaselineDoc, /Tool-owned report target/);
  assert.match(perfBaselineDoc, /tools\/wp_perf_smoke_baseline\.json/);
  assert.match(browserBaselineDoc, /## Runtime health/);
  assert.match(browserBaselineDoc, /## Store write pressure/);
  assert.match(browserBaselineDoc, /## Builder scheduling pressure/);
  assert.match(browserBaselineDoc, /## Runtime perf summary/);
  assert.match(browserBaselineDoc, /Schema: 19/);
  assert.match(browserBaselineDoc, /interactionWaitMs/);
  assert.match(browserBaselineDoc, /codeExecutionMs/);

  assert.match(progress, /Stage 80/);
  assert.match(workmap, /Stage 80 - Measurement and performance guard closeout retained/);
});
