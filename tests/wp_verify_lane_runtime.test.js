import test from 'node:test';
import assert from 'node:assert/strict';

import {
  flattenVerifyLanePlan,
  flattenVerifyLaneTasks,
  formatVerifyTask,
  listVerifyLaneNames,
} from '../tools/wp_verify_lane_catalog.js';
import { planVerifyLaneRun, runVerifyLane, runVerifyLanePlan } from '../tools/wp_verify_lane_flow.js';
import { createVerifyLaneHelpText, parseVerifyLaneArgs } from '../tools/wp_verify_lane_state.js';

const taskLabels = tasks => tasks.map(formatVerifyTask);

test('verify lane state parses canonical lane names plus print/dry-run/no-dedupe flags', () => {
  assert.deepEqual(parseVerifyLaneArgs(['builder-surfaces', 'domain-surfaces', '--print', '--dry-run']), {
    laneName: 'builder-surfaces',
    laneNames: ['builder-surfaces', 'domain-surfaces'],
    list: false,
    print: true,
    dryRun: true,
    noDedupe: false,
  });
  assert.deepEqual(parseVerifyLaneArgs(['--list', '--no-dedupe']), {
    laneName: '',
    laneNames: [],
    list: true,
    print: false,
    dryRun: false,
    noDedupe: true,
  });
  assert.deepEqual(parseVerifyLaneArgs(['verify:builder-surfaces']).laneNames, ['verify:builder-surfaces']);
});

test('verify lane catalog uses typed tasks and dedupes multi-lane plans', () => {
  const names = listVerifyLaneNames();
  assert.ok(names.includes('builder-surfaces'));
  assert.ok(names.includes('export-overlay-errors-family-core'));
  assert.ok(names.includes('perf-smoke'));
  assert.equal(names.includes('overlay-export-family-core'), false);

  assert.deepEqual(taskLabels(flattenVerifyLaneTasks('export-overlay-errors-family-core')), [
    'test-group:export-overlay-errors-family-contracts',
    'npm:typecheck',
    'npm:contract:layers',
    'npm:contract:api',
  ]);

  assert.deepEqual(taskLabels(flattenVerifyLanePlan(['public-surfaces', 'builder-surfaces']).tasks), [
    'test-group:public-surfaces',
    'npm:typecheck',
    'npm:contract:layers',
    'npm:contract:api',
    'test-group:builder-surfaces',
  ]);
});

test('verify lane planner reports canonical task order for single and multi-lane runs', () => {
  const overlayPlan = planVerifyLaneRun({ laneName: 'export-overlay-errors-family-core' });
  assert.deepEqual(overlayPlan.laneNames, ['export-overlay-errors-family-core']);
  assert.deepEqual(taskLabels(overlayPlan.tasks), [
    'test-group:export-overlay-errors-family-contracts',
    'npm:typecheck',
    'npm:contract:layers',
    'npm:contract:api',
  ]);

  const perfPlan = planVerifyLaneRun({ laneName: 'perf-smoke' });
  assert.deepEqual(perfPlan.laneNames, ['perf-smoke']);
  assert.deepEqual(taskLabels(perfPlan.tasks), ['npm:perf:smoke']);

  assert.deepEqual(
    taskLabels(planVerifyLaneRun({ laneNames: ['public-surfaces', 'builder-surfaces'] }).tasks),
    [
      'test-group:public-surfaces',
      'npm:typecheck',
      'npm:contract:layers',
      'npm:contract:api',
      'test-group:builder-surfaces',
    ]
  );
});

test('verify lane flow dispatches test groups directly and package scripts through npm', () => {
  const calls = [];
  const out = runVerifyLane({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    laneName: 'export-overlay-errors-family-core',
    runners: {
      runTestGroup({ groupName }) {
        calls.push(`test-group:${groupName}`);
      },
      npmRun({ scriptName }) {
        calls.push(`npm:${scriptName}`);
      },
    },
  });

  assert.equal(out.laneName, 'export-overlay-errors-family-core');
  assert.deepEqual(calls, taskLabels(out.tasks));
  assert.deepEqual(calls, [
    'test-group:export-overlay-errors-family-contracts',
    'npm:typecheck',
    'npm:contract:layers',
    'npm:contract:api',
  ]);
});

test('verify lane flow dedupes overlapping typed tasks across multiple lanes by default', () => {
  const calls = [];
  const out = runVerifyLanePlan({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    laneNames: ['public-surfaces', 'builder-surfaces'],
    runners: {
      runTestGroup({ groupName }) {
        calls.push(`test-group:${groupName}`);
      },
      npmRun({ scriptName }) {
        calls.push(`npm:${scriptName}`);
      },
    },
  });

  assert.deepEqual(out.laneNames, ['public-surfaces', 'builder-surfaces']);
  assert.deepEqual(calls, taskLabels(out.tasks));
  assert.deepEqual(calls, [
    'test-group:public-surfaces',
    'npm:typecheck',
    'npm:contract:layers',
    'npm:contract:api',
    'test-group:builder-surfaces',
  ]);
});

test('verify lane help text advertises the canonical lane catalog and multi-lane support', () => {
  const help = createVerifyLaneHelpText();
  assert.match(help, /Available lanes:/);
  assert.match(help, /builder-surfaces/);
  assert.match(help, /export-overlay-errors-family-core/);
  assert.match(help, /more-lanes/);
  assert.match(help, /--no-dedupe/);
  assert.doesNotMatch(help, /overlay-export-family-core/);
});
