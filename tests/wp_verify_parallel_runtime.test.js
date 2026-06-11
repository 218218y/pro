import test from 'node:test';
import assert from 'node:assert/strict';

import { createVerifyParallelPlan, runVerifyParallelPlan } from '../tools/wp_verify_parallel_flow.js';
import { parseVerifyParallelArgs } from '../tools/wp_verify_parallel_state.js';

test('verify parallel args preserve verify flags and local concurrency controls', () => {
  assert.deepEqual(
    parseVerifyParallelArgs([
      '--gate',
      '--no-build',
      '--no-bundle',
      '--soft-format',
      '--jobs=3',
      '--test-jobs',
      '2',
      '--test-shards=4',
      '--print',
      '--dry-run',
    ]),
    {
      gate: true,
      noBuild: true,
      skipBundle: true,
      softFormat: true,
      help: false,
      print: true,
      dryRun: true,
      parallelJobs: 3,
      testJobs: 2,
      testShards: 4,
    }
  );
});

test('verify parallel plan builds once and gives test shards isolated reports', () => {
  const flags = parseVerifyParallelArgs(['--no-bundle', '--jobs=4', '--test-jobs=2']);
  const plan = createVerifyParallelPlan({ flags });

  assert.equal(plan.prepareStep.label, 'node tools/wp_build_dist.js --no-assets');
  assert.deepEqual(
    plan.lanes.map(lane => lane.id),
    ['policy', 'typecheck', 'contracts', 'test-shard-1-of-2', 'test-shard-2-of-2']
  );
  assert.equal(plan.bundleSteps.length, 0);

  const contracts = plan.lanes.find(lane => lane.id === 'contracts');
  assert.ok(contracts.steps.some(step => step.label === 'node tools/wp_ui_contract.js'));
  assert.ok(!contracts.steps.some(step => step.label.includes('wp_build_dist.js')));

  const shardOne = plan.lanes.find(lane => lane.id === 'test-shard-1-of-2');
  const shardTwo = plan.lanes.find(lane => lane.id === 'test-shard-2-of-2');
  assert.notEqual(shardOne.env.WP_TEST_REPORT_DIR, shardTwo.env.WP_TEST_REPORT_DIR);
  assert.deepEqual(shardOne.steps[0].extraArgs, ['--', '--shard=1/2', '--no-build', '--jobs=2']);
  assert.deepEqual(shardTwo.steps[0].extraArgs, ['--', '--shard=2/2', '--no-build', '--jobs=2']);
});

test('verify parallel flow treats prettier diffs as warnings outside gate mode', async () => {
  const flags = parseVerifyParallelArgs(['--no-bundle']);
  const calls = [];
  const result = await runVerifyParallelPlan({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    flags,
    log() {},
    runners: {
      prepareDist() {
        return { ok: true, code: 0 };
      },
      runStep({ step, lane }) {
        calls.push(`${lane.id}:${step.id}`);
        if (step.type === 'format') {
          return {
            ok: false,
            code: 1,
            error: null,
            stdout: 'Code style issues found in the above file. Run Prettier with --write.',
            stderr: '',
          };
        }
        return { ok: true, code: 0, error: null, stdout: '', stderr: '' };
      },
    },
  });

  assert.equal(result.ok, true);
  assert.equal(result.hasFormatWarn, true);
  assert.ok(calls.includes('policy:format-check'));
  assert.equal(result.bundleResults.length, 0);
});

test('verify parallel flow fails prettier diffs in gate mode and skips bundle phase', async () => {
  const flags = parseVerifyParallelArgs(['--gate']);
  const result = await runVerifyParallelPlan({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    flags,
    log() {},
    runners: {
      prepareDist() {
        return { ok: true, code: 0 };
      },
      runStep({ step }) {
        if (step.type === 'format') {
          return {
            ok: false,
            code: 1,
            error: null,
            stdout: 'Code style issues found in the above file. Run Prettier with --write.',
            stderr: '',
          };
        }
        return { ok: true, code: 0, error: null, stdout: '', stderr: '' };
      },
    },
  });

  assert.equal(result.ok, false);
  assert.equal(result.laneResults.find(lane => lane.id === 'policy').ok, false);
  assert.equal(result.bundleResults.length, 0);
});
