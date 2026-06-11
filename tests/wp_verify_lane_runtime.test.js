import test from 'node:test';
import assert from 'node:assert/strict';

import {
  flattenVerifyLanePlan,
  flattenVerifyLaneScripts,
  listVerifyLaneNames,
} from '../tools/wp_verify_lane_catalog.js';
import { planVerifyLaneRun, runVerifyLane, runVerifyLanePlan } from '../tools/wp_verify_lane_flow.js';
import { createVerifyLaneHelpText, parseVerifyLaneArgs } from '../tools/wp_verify_lane_state.js';

test('verify lane state parses multiple lane names plus print/dry-run/no-dedupe flags', () => {
  assert.deepEqual(
    parseVerifyLaneArgs(['verify:builder-surfaces', 'domain-surfaces', '--print', '--dry-run']),
    {
      laneName: 'builder-surfaces',
      laneNames: ['builder-surfaces', 'domain-surfaces'],
      list: false,
      print: true,
      dryRun: true,
      noDedupe: false,
    }
  );
  assert.deepEqual(parseVerifyLaneArgs(['--list', '--no-dedupe']), {
    laneName: '',
    laneNames: [],
    list: true,
    print: false,
    dryRun: false,
    noDedupe: true,
  });
});

test('verify lane catalog lists stable lane names, flattens nested aliases, and dedupes multi-lane plans canonically', () => {
  const names = listVerifyLaneNames();
  assert.ok(names.includes('builder-surfaces'));
  assert.ok(names.includes('overlay-export-family-core'));
  assert.ok(names.includes('perf-smoke'));

  assert.deepEqual(flattenVerifyLaneScripts('overlay-export-family-core'), [
    'test:export-overlay-errors-family-contracts',
    'typecheck:platform',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ]);

  assert.deepEqual(flattenVerifyLanePlan(['public-surfaces', 'builder-surfaces']).scripts, [
    'test:public-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
    'test:builder-surfaces',
    'typecheck:builder',
  ]);
});

test('verify lane planner reports the canonical script order for single and multi-lane runs', () => {
  assert.deepEqual(planVerifyLaneRun({ laneName: 'overlay-export-family-core' }), {
    laneNames: ['overlay-export-family-core'],
    scripts: [
      'test:export-overlay-errors-family-contracts',
      'typecheck:platform',
      'typecheck:services',
      'typecheck:runtime',
      'contract:layers',
      'contract:api',
    ],
  });

  assert.deepEqual(planVerifyLaneRun({ laneName: 'perf-smoke' }), {
    laneNames: ['perf-smoke'],
    scripts: ['perf:smoke'],
  });

  assert.deepEqual(planVerifyLaneRun({ laneNames: ['public-surfaces', 'builder-surfaces'] }).scripts, [
    'test:public-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
    'test:builder-surfaces',
    'typecheck:builder',
  ]);
});

test('verify lane flow runs flattened scripts in order', () => {
  const calls = [];
  const out = runVerifyLane({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    laneName: 'overlay-export-family-core',
    runners: {
      npmRun({ scriptName }) {
        calls.push(scriptName);
      },
    },
  });

  assert.equal(out.laneName, 'overlay-export-family-core');
  assert.deepEqual(calls, out.scripts);
  assert.deepEqual(calls, [
    'test:export-overlay-errors-family-contracts',
    'typecheck:platform',
    'typecheck:services',
    'typecheck:runtime',
    'contract:layers',
    'contract:api',
  ]);
});

test('verify lane flow dedupes overlapping scripts across multiple lanes by default', () => {
  const calls = [];
  const out = runVerifyLanePlan({
    projectRoot: '/tmp/wardrobepro',
    childEnv: process.env,
    laneNames: ['public-surfaces', 'builder-surfaces'],
    runners: {
      npmRun({ scriptName }) {
        calls.push(scriptName);
      },
    },
  });

  assert.deepEqual(out.laneNames, ['public-surfaces', 'builder-surfaces']);
  assert.deepEqual(calls, out.scripts);
  assert.deepEqual(calls, [
    'test:public-surfaces',
    'typecheck:runtime',
    'typecheck:services',
    'typecheck:kernel',
    'typecheck:ui',
    'contract:layers',
    'contract:api',
    'test:builder-surfaces',
    'typecheck:builder',
  ]);
});

test('verify lane help text advertises the canonical lane catalog and multi-lane support', () => {
  const help = createVerifyLaneHelpText();
  assert.match(help, /Available lanes:/);
  assert.match(help, /builder-surfaces/);
  assert.match(help, /overlay-export-family-core/);
  assert.match(help, /more-lanes/);
  assert.match(help, /--no-dedupe/);
});
