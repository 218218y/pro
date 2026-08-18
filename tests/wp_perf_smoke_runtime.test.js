import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePerfSmokeArgs,
  resolvePerfSmokePaths,
  createPerfSmokeHelpText,
} from '../tools/wp_perf_smoke_state.js';
import {
  DEFAULT_PERF_SMOKE_BASELINE_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_DOC_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_JSON_OUT_RELATIVE_PATH,
  DEFAULT_PERF_SMOKE_MD_OUT_RELATIVE_PATH,
  createPerfSmokeBaseline,
  createPerfSmokeMarkdownReport,
  evaluatePerfSmokeBaseline,
  resolvePerfSmokePlan,
  resolveDirectPerfSmokeInvocation,
} from '../tools/wp_perf_smoke_shared.js';
import { runPerfSmokeFlow } from '../tools/wp_perf_smoke_flow.js';
import { formatVerifyTask } from '../tools/wp_verify_lane_catalog.js';

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test('perf smoke args parse lanes, scripts, baseline paths, and flags canonically', () => {
  assert.deepEqual(
    parsePerfSmokeArgs([
      'toolchain-surfaces',
      '--lane',
      'ui-react-import-hardening-core',
      '--script',
      'contract:api',
      '--baseline',
      'tmp/base.json',
      '--json-out',
      'tmp/out.json',
      '--md-out',
      'tmp/out.md',
      '--doc-out',
      'docs/perf.md',
      '--update-baseline',
      '--enforce',
      '--print',
      '--dry-run',
      '--no-dedupe',
      '--allow-missing-baseline',
    ]),
    {
      laneNames: ['toolchain-surfaces', 'ui-react-import-hardening-core'],
      scriptNames: ['contract:api'],
      baselinePath: 'tmp/base.json',
      jsonOutPath: 'tmp/out.json',
      mdOutPath: 'tmp/out.md',
      docOutPath: 'docs/perf.md',
      updateBaseline: true,
      enforce: true,
      print: true,
      dryRun: true,
      noDedupe: true,
      allowMissingBaseline: true,
      listDefaults: false,
    }
  );
});

test('perf smoke help text advertises default lanes and baseline flags', () => {
  const help = createPerfSmokeHelpText();
  assert.match(help, /perf-toolchain-core/);
  assert.match(help, /--update-baseline/);
  assert.match(help, /--allow-missing-baseline/);
});

test('perf smoke planner resolves verify lanes and dedupes script overlap', () => {
  const plan = resolvePerfSmokePlan({
    laneNames: ['export-overlay-errors-family-core', 'ui-react-jsx-hardening-core'],
    scriptNames: ['contract:api'],
    dedupe: true,
  });
  assert.deepEqual(plan.laneNames, ['export-overlay-errors-family-core', 'ui-react-jsx-hardening-core']);
  assert.deepEqual(plan.tasks.map(formatVerifyTask), [
    'npm:contract:api',
    'test-group:export-overlay-errors-family-contracts',
    'npm:typecheck',
    'npm:contract:layers',
    'test-group:ui-react-import-hardening-contracts',
    'test-group:ui-react-jsx-hardening-contracts',
    'test-group:ui-type-hardening-contracts',
  ]);
});

test('perf smoke resolves the stable Node-only profile directly and keeps other scripts on npm fallback', () => {
  const invocation = resolveDirectPerfSmokeInvocation(process.cwd(), 'contract:layers');
  assert.deepEqual(invocation, {
    command: process.execPath,
    args: ['tools/wp_layer_contract.js'],
  });
  assert.equal(resolveDirectPerfSmokeInvocation(process.cwd(), 'build:dist'), null);
});

test('perf smoke baseline evaluation detects regressions and profile drift', () => {
  const summary = {
    profileName: 'default',
    laneNames: ['toolchain-surfaces'],
    scripts: [
      { scriptName: 'test-group:toolchain-surfaces', durationMs: 1200, ok: true, exitCode: 0 },
      { scriptName: 'npm:contract:api', durationMs: 900, ok: true, exitCode: 0 },
    ],
    totalDurationMs: 2100,
  };

  const baseline = createPerfSmokeBaseline(summary, {
    perScriptRatio: 1.0,
    perScriptSlackMs: 0,
    perScriptMinimumMs: 0,
    totalRatio: 1.0,
    totalSlackMs: 0,
  });

  const pass = evaluatePerfSmokeBaseline(summary, baseline);
  assert.equal(pass.ok, true);

  const fail = evaluatePerfSmokeBaseline(
    {
      ...summary,
      scripts: [
        { scriptName: 'test-group:toolchain-surfaces', durationMs: 1300, ok: true, exitCode: 0 },
        { scriptName: 'npm:contract:api', durationMs: 900, ok: true, exitCode: 0 },
      ],
      totalDurationMs: 2200,
    },
    baseline
  );
  assert.equal(fail.ok, false);
  assert.ok(fail.failures.some(item => item.kind === 'script-budget'));
  assert.ok(fail.failures.some(item => item.kind === 'total-budget'));

  const immaterial = evaluatePerfSmokeBaseline(
    {
      ...summary,
      scripts: [
        { scriptName: 'test-group:toolchain-surfaces', durationMs: 1299, ok: true, exitCode: 0 },
        { scriptName: 'npm:contract:api', durationMs: 900, ok: true, exitCode: 0 },
      ],
      totalDurationMs: 2199,
    },
    baseline
  );
  assert.deepEqual(immaterial.failures, []);

  const drift = evaluatePerfSmokeBaseline(
    {
      ...summary,
      scripts: [{ scriptName: 'different-script', durationMs: 1, ok: true, exitCode: 0 }],
      totalDurationMs: 1,
    },
    baseline
  );
  assert.equal(drift.ok, false);
  assert.ok(drift.failures.some(item => item.kind === 'profile-drift'));
});

test('perf smoke markdown report keeps durable tool-owned baseline anchors', () => {
  const summary = {
    generatedAt: '2026-07-08T08:23:53.758Z',
    profileName: 'default',
    laneNames: ['perf-toolchain-core'],
    nodeVersion: 'v24.18.0',
    scripts: [{ scriptName: 'test-group:perf-toolchain-core', durationMs: 575, ok: true, exitCode: 0 }],
    totalDurationMs: 575,
  };
  const baseline = createPerfSmokeBaseline(summary);
  const markdown = createPerfSmokeMarkdownReport({
    summary,
    baseline,
    evaluation: { ok: true, failures: [] },
  });

  assert.match(markdown, /Tool-owned report target/);
  assert.match(markdown, new RegExp(escapeRegExp(DEFAULT_PERF_SMOKE_BASELINE_RELATIVE_PATH)));
  assert.match(markdown, new RegExp(escapeRegExp(DEFAULT_PERF_SMOKE_DOC_RELATIVE_PATH)));
  assert.match(markdown, new RegExp(escapeRegExp(DEFAULT_PERF_SMOKE_JSON_OUT_RELATIVE_PATH)));
  assert.match(markdown, new RegExp(escapeRegExp(DEFAULT_PERF_SMOKE_MD_OUT_RELATIVE_PATH)));
});

test('perf smoke flow updates baseline, writes outputs, and enforces budgets through the canonical flow', () => {
  const projectRoot = '/tmp/wardrobepro-perf-smoke';
  const args = parsePerfSmokeArgs([
    '--lane',
    'toolchain-surfaces',
    '--baseline',
    'tmp/base.json',
    '--json-out',
    'tmp/out.json',
    '--md-out',
    'tmp/out.md',
    '--doc-out',
    'tmp/doc.md',
    '--update-baseline',
  ]);
  const outputs = resolvePerfSmokePaths(args, projectRoot);
  const runs = [];
  const result = runPerfSmokeFlow({
    projectRoot,
    args,
    runners: {
      runPerfSmokeTask({ task }) {
        const scriptName = formatVerifyTask(task);
        runs.push(scriptName);
        return { scriptName, durationMs: 1000 + runs.length, ok: true, exitCode: 0 };
      },
    },
  });

  assert.equal(result.baselineUpdated, true);
  assert.ok(result.summary.ok);
  assert.ok(runs.length > 0);
  assert.equal(result.paths.baselinePath, outputs.baselinePath);

  const enforced = runPerfSmokeFlow({
    projectRoot,
    args: parsePerfSmokeArgs([
      '--lane',
      'toolchain-surfaces',
      '--baseline',
      'tmp/base.json',
      '--json-out',
      'tmp/out2.json',
      '--md-out',
      'tmp/out2.md',
      '--enforce',
    ]),
    runners: {
      runPerfSmokeTask({ task }) {
        const scriptName = formatVerifyTask(task);
        return { scriptName, durationMs: 1000, ok: true, exitCode: 0 };
      },
    },
  });

  assert.equal(enforced.evaluation.ok, true);

  assert.throws(
    () =>
      runPerfSmokeFlow({
        projectRoot,
        args: parsePerfSmokeArgs([
          '--lane',
          'toolchain-surfaces',
          '--baseline',
          'tmp/base.json',
          '--json-out',
          'tmp/out3.json',
          '--md-out',
          'tmp/out3.md',
          '--enforce',
        ]),
        runners: {
          runPerfSmokeTask({ task }) {
            const scriptName = formatVerifyTask(task);
            return { scriptName, durationMs: 100000, ok: true, exitCode: 0 };
          },
        },
      }),
    /performance budget regression detected/
  );
});
