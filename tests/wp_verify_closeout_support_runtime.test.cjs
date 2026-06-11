'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CLOSEOUT_LANES,
  CLOSEOUT_PROFILES,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  STATE_JSON_PATH,
  classifyEnvironmentFailure,
  classifyRunnerFailure,
  normalizeCliArgs,
  selectLanes,
  summarize,
  mergeResults,
  readStatePayload,
  resolveStateFile,
  writeStatePayload,
  runLane,
} = require('../tools/wp_verify_closeout_support.cjs');

test('closeout lanes keep stable ids and include critical families', () => {
  const ids = CLOSEOUT_LANES.map(lane => lane.id);
  assert.deepEqual(ids, [
    'build-dist',
    'perf-smoke',
    'overlay-export-core',
    'order-pdf-overlay-core',
    'order-pdf-pdf-render',
    'order-pdf-sketch',
    'order-pdf-export-overlay',
    'order-pdf-export-builders',
    'order-pdf-export-capture',
    'order-pdf-export-text',
    'sketch-manual-hover',
    'sketch-box-hover',
    'sketch-free-boxes',
    'sketch-render-visuals',
    'cloud-sync-lifecycle',
    'cloud-sync-main-row',
    'cloud-sync-panel-install',
    'cloud-sync-panel-controller',
    'cloud-sync-panel-subscriptions',
    'cloud-sync-panel-snapshots',
    'cloud-sync-sync-ops',
    'cloud-sync-tabs-ui',
    'e2e-list',
    'e2e-preflight',
    'e2e-smoke-run',
  ]);
});

test('overlay export closeout lane stays direct and grouped', () => {
  const lane = CLOSEOUT_LANES.find(entry => entry.id === 'overlay-export-core');
  assert.ok(lane);
  assert.equal(Array.isArray(lane.steps), true);
  assert.deepEqual(
    lane.steps.map(step => step.label),
    [
      'overlay/export contracts',
      'typecheck platform',
      'typecheck services',
      'typecheck runtime',
      'layer contracts',
      'public api contracts',
    ]
  );
});

test('direct profiles stay stable for order-pdf sketch and cloud-sync', () => {
  assert.deepEqual(CLOSEOUT_PROFILES['order-pdf'], [
    'order-pdf-overlay-core',
    'order-pdf-pdf-render',
    'order-pdf-sketch',
    'order-pdf-export-overlay',
    'order-pdf-export-builders',
    'order-pdf-export-capture',
    'order-pdf-export-text',
  ]);
  assert.deepEqual(CLOSEOUT_PROFILES.sketch, [
    'sketch-manual-hover',
    'sketch-box-hover',
    'sketch-free-boxes',
    'sketch-render-visuals',
  ]);
  assert.deepEqual(CLOSEOUT_PROFILES['verify-core'], ['build-dist', 'perf-smoke', 'overlay-export-core']);
  assert.equal(CLOSEOUT_PROFILES['cloud-sync'].includes('cloud-sync-tabs-ui'), true);
});

test('normalize args collects profiles categories lane ids skips log dir and state options', () => {
  const options = normalizeCliArgs([
    '--profile',
    'order-pdf',
    '--category',
    'verify',
    '--lane',
    'build-dist',
    '--skip',
    'order-pdf-export-text',
    '--resume-from',
    'order-pdf-sketch',
    '--log-dir',
    '.artifacts/closeout-logs',
    '--state-file',
    '.artifacts/custom-closeout-state.json',
    '--append-state',
    '--from-state',
    '--reset-state',
    '--write',
    '--stop-on-fail',
  ]);
  assert.deepEqual(options, {
    laneIds: ['build-dist'],
    categories: ['verify'],
    profiles: ['order-pdf'],
    skipLaneIds: ['order-pdf-export-text'],
    resumeFrom: 'order-pdf-sketch',
    stopOnFail: true,
    shouldWrite: true,
    appendState: true,
    fromState: true,
    resetState: true,
    logDir: '.artifacts/closeout-logs',
    stateFile: '.artifacts/custom-closeout-state.json',
  });
});

test('select lanes respects profile resume and skip while preserving order', () => {
  const selected = selectLanes(CLOSEOUT_LANES, {
    profiles: ['order-pdf'],
    skipLaneIds: ['order-pdf-export-builders'],
    resumeFrom: 'order-pdf-sketch',
  });
  assert.deepEqual(
    selected.map(lane => lane.id),
    ['order-pdf-sketch', 'order-pdf-export-overlay', 'order-pdf-export-capture', 'order-pdf-export-text']
  );
});

test('environment classifier recognizes playwright/browser failures', () => {
  assert.equal(classifyEnvironmentFailure('Chromium executable does not exist'), true);
  assert.equal(classifyEnvironmentFailure('EAI_AGAIN failed to download browser'), true);
  assert.equal(classifyEnvironmentFailure('ordinary assertion failure in runtime test'), false);
});

test('runner classifier recognizes wrapper and sandbox failures', () => {
  assert.equal(classifyRunnerFailure('EOF while waiting on child process'), true);
  assert.equal(classifyRunnerFailure('received SIGTERM from wrapper'), true);
  assert.equal(classifyRunnerFailure('ordinary assertion failure in runtime test'), false);
});

test('summary separates passed failures environment-blocked and runner-blocked lanes', () => {
  const summary = summarize([
    { status: 'passed' },
    { status: 'environment-blocked' },
    { status: 'runner-blocked' },
    { status: 'failed' },
  ]);
  assert.deepEqual(summary, {
    total: 4,
    passed: 1,
    failed: 1,
    environmentBlocked: 1,
    runnerBlocked: 1,
    ok: false,
  });
});

test('state helpers merge by lane id and preserve canonical order', () => {
  const merged = mergeResults(
    [
      { id: 'order-pdf-export-text', status: 'passed' },
      { id: 'build-dist', status: 'passed' },
    ],
    [
      { id: 'perf-smoke', status: 'passed' },
      { id: 'build-dist', status: 'failed' },
    ]
  );
  assert.deepEqual(
    merged.map(entry => [entry.id, entry.status]),
    [
      ['build-dist', 'failed'],
      ['perf-smoke', 'passed'],
      ['order-pdf-export-text', 'passed'],
    ]
  );
});

test('state helpers roundtrip payloads and fall back when file is missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-state-'));
  const statePath = path.join(tempDir, 'closeout-state.json');
  const empty = readStatePayload(statePath);
  assert.deepEqual(empty.summary, summarize([]));
  writeStatePayload(statePath, {
    generatedAt: '2026-04-16T00:00:00.000Z',
    workspace: '/tmp/workspace',
    meta: { stateFile: statePath },
    summary: summarize([{ status: 'passed' }]),
    results: [{ id: 'build-dist', status: 'passed' }],
  });
  const loaded = readStatePayload(statePath);
  assert.equal(loaded.workspace, '/tmp/workspace');
  assert.deepEqual(loaded.results, [{ id: 'build-dist', status: 'passed' }]);
});

test('state file resolves to explicit flag or default artifact path', () => {
  assert.equal(resolveStateFile({ stateFile: '.artifacts/custom.json' }), '.artifacts/custom.json');
  assert.equal(resolveStateFile({}), STATE_JSON_PATH);
});

test('dependency-blocked lanes inherit environment-blocked from preflight', () => {
  const lane = CLOSEOUT_LANES.find(entry => entry.id === 'e2e-smoke-run');
  const result = runLane(lane, { priorResults: [{ id: 'e2e-preflight', status: 'environment-blocked' }] });
  assert.equal(result.status, 'environment-blocked');
  assert.equal(result.blockedBy, 'e2e-preflight');
  assert.match(result.stderr, /dependency e2e-preflight/);
});

test('report paths stay under docs and state path stays under artifacts', () => {
  assert.equal(REPORT_JSON_PATH, 'docs/FINAL_VERIFICATION_SUMMARY.json');
  assert.equal(REPORT_MD_PATH, 'docs/FINAL_VERIFICATION_SUMMARY.md');
  assert.equal(STATE_JSON_PATH, '.artifacts/closeout-state.json');
});
