import test from 'node:test';
import assert from 'node:assert/strict';

import {
  parsePerfSmokeArgs,
  resolvePerfSmokePaths,
  createPerfSmokeHelpText,
} from '../tools/wp_perf_smoke_state.js';
import {
  createPerfSmokeBaseline,
  evaluatePerfSmokeBaseline,
  resolvePerfSmokePlan,
} from '../tools/wp_perf_smoke_shared.js';
import { runPerfSmokeFlow } from '../tools/wp_perf_smoke_flow.js';

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
    laneNames: ['overlay-export-family-core', 'ui-react-jsx-hardening-core'],
    scriptNames: ['contract:api'],
    dedupe: true,
  });
  assert.deepEqual(plan.laneNames, ['overlay-export-family-core', 'ui-react-jsx-hardening-core']);
  assert.deepEqual(plan.scriptNames, [
    'contract:api',
    'test:export-overlay-errors-family-contracts',
    'typecheck:platform',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'test:ui-react-import-hardening-contracts',
    'test:ui-react-jsx-hardening-contracts',
    'test:ui-type-hardening-contracts',
  ]);
});

test('perf smoke baseline evaluation detects regressions and profile drift', () => {
  const summary = {
    profileName: 'default',
    laneNames: ['toolchain-surfaces'],
    scripts: [
      { scriptName: 'test:toolchain-surfaces', durationMs: 1200, ok: true, exitCode: 0 },
      { scriptName: 'contract:api', durationMs: 900, ok: true, exitCode: 0 },
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
        { scriptName: 'test:toolchain-surfaces', durationMs: 1201, ok: true, exitCode: 0 },
        { scriptName: 'contract:api', durationMs: 901, ok: true, exitCode: 0 },
      ],
      totalDurationMs: 2102,
    },
    baseline
  );
  assert.equal(fail.ok, false);
  assert.ok(fail.failures.some(item => item.kind === 'script-budget'));
  assert.ok(fail.failures.some(item => item.kind === 'total-budget'));

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
      runPerfSmokeScript({ scriptName }) {
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
      runPerfSmokeScript({ scriptName }) {
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
          runPerfSmokeScript({ scriptName }) {
            return { scriptName, durationMs: 100000, ok: true, exitCode: 0 };
          },
        },
      }),
    /performance budget regression detected/
  );
});
