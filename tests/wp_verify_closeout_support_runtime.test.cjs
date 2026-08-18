'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  CLOSEOUT_LANES,
  CLOSEOUT_PROFILES,
  assertFinalSelectionEligible,
  buildMarkdownReport,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  STATE_JSON_PATH,
  classifyEnvironmentFailure,
  classifyRunnerFailure,
  createCloseoutContext,
  createCloseoutPayload,
  normalizeCliArgs,
  selectLanes,
  summarize,
  validateFinalReportEligibility,
  mergeResults,
  readStatePayload,
  resolveSpawnInvocation,
  resolveStateFile,
  writeStatePayload,
  runLane,
} = require('../tools/wp_verify_closeout_support.cjs');

test('closeout resolves npm through its JS CLI without a shell command fallback', () => {
  const npmCli = path.join(os.tmpdir(), 'npm-cli.js');
  const resolved = resolveSpawnInvocation('npm', ['run', 'test'], {
    platform: 'win32',
    env: { npm_execpath: npmCli },
    existsImpl: candidate => candidate === npmCli,
  });
  assert.deepEqual(resolved, {
    command: process.execPath,
    args: [npmCli, 'run', 'test'],
  });
  assert.throws(
    () =>
      resolveSpawnInvocation('npm', ['run', 'test'], {
        platform: 'win32',
        env: {},
        existsImpl: () => false,
      }),
    /refusing an unsafe shell fallback/u
  );
});

test('closeout lanes keep stable ids and include critical families', () => {
  const ids = CLOSEOUT_LANES.map(lane => lane.id);
  assert.deepEqual(ids, [
    'verification-control-plane',
    'toolchain-surfaces',
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
    'e2e-preflight',
    'e2e-list',
    'e2e-smoke-run',
    'browser-perf',
    'browser-perf-release',
  ]);
});

test('group-backed closeout lanes execute canonical test groups directly', async () => {
  const { TEST_GROUP_CATALOG } = await import('../tools/wp_test_group_catalog.mjs');
  const groupBackedLanes = CLOSEOUT_LANES.filter(lane => lane.testGroupId);
  assert.ok(groupBackedLanes.length > 0);
  for (const lane of groupBackedLanes) {
    const group = TEST_GROUP_CATALOG[lane.testGroupId];
    assert.ok(group, `${lane.id} should reference an existing test group`);
    assert.equal(lane.command, 'node');
    assert.deepEqual(lane.args, ['tools/wp_test_group.mjs', lane.testGroupId]);
  }
});

test('overlay export closeout lane stays direct and uses a live canonical typecheck mode', async () => {
  const { MODE_TO_CONFIG } = await import('../tools/wp_typecheck_state.js');
  const lane = CLOSEOUT_LANES.find(entry => entry.id === 'overlay-export-core');
  assert.ok(lane);
  assert.equal(Array.isArray(lane.steps), true);
  assert.deepEqual(
    lane.steps.map(step => step.label),
    ['overlay/export contracts', 'typecheck project', 'layer contracts', 'public api contracts']
  );
  const typecheckSteps = lane.steps.filter(step => step.label.startsWith('typecheck '));
  assert.deepEqual(typecheckSteps, [
    {
      label: 'typecheck project',
      command: 'node',
      args: ['tools/wp_typecheck.js', '--mode', 'project'],
    },
  ]);
  assert.equal(Object.hasOwn(MODE_TO_CONFIG, typecheckSteps[0].args[2]), true);
});

test('closeout profiles stay stable and Order PDF remains fully catalog-backed', () => {
  assert.deepEqual(CLOSEOUT_PROFILES['order-pdf'], [
    'order-pdf-overlay-core',
    'order-pdf-pdf-render',
    'order-pdf-sketch',
    'order-pdf-export-overlay',
    'order-pdf-export-builders',
    'order-pdf-export-capture',
    'order-pdf-export-text',
  ]);
  for (const laneId of CLOSEOUT_PROFILES['order-pdf']) {
    const lane = CLOSEOUT_LANES.find(entry => entry.id === laneId);
    assert.ok(lane?.testGroupId, `${laneId} must stay backed by the canonical test-group catalog`);
  }
  assert.deepEqual(CLOSEOUT_PROFILES.sketch, [
    'sketch-manual-hover',
    'sketch-box-hover',
    'sketch-free-boxes',
    'sketch-render-visuals',
  ]);
  assert.deepEqual(CLOSEOUT_PROFILES['control-plane'], ['verification-control-plane', 'toolchain-surfaces']);
  assert.deepEqual(CLOSEOUT_PROFILES['verify-core'], [
    'verification-control-plane',
    'toolchain-surfaces',
    'build-dist',
    'perf-smoke',
    'overlay-export-core',
  ]);
  assert.equal(CLOSEOUT_PROFILES['cloud-sync'].includes('cloud-sync-tabs-ui'), true);
  assert.deepEqual(CLOSEOUT_PROFILES['browser-evidence'], [
    'e2e-preflight',
    'e2e-list',
    'e2e-smoke-run',
    'browser-perf',
    'browser-perf-release',
  ]);
  assert.equal(CLOSEOUT_PROFILES.default.includes('browser-perf'), true);
  assert.equal(CLOSEOUT_PROFILES.default.includes('browser-perf-release'), true);
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
    '--write-final',
    '--stop-on-fail',
  ]);
  assert.deepEqual(options, {
    laneIds: ['build-dist'],
    categories: ['verify'],
    profiles: ['order-pdf'],
    skipLaneIds: ['order-pdf-export-text'],
    resumeFrom: 'order-pdf-sketch',
    stopOnFail: true,
    shouldWriteFinal: true,
    appendState: true,
    fromState: true,
    resetState: true,
    logDir: '.artifacts/closeout-logs',
    stateFile: '.artifacts/custom-closeout-state.json',
  });
});

test('closeout CLI rejects unknown flags missing values and unknown selectors', () => {
  assert.throws(() => normalizeCliArgs(['--profile']), /--profile requires a value/);
  assert.throws(() => normalizeCliArgs(['--wat']), /unknown argument: --wat/);
  assert.throws(() => normalizeCliArgs(['--write']), /unknown argument: --write/);
  assert.throws(() => selectLanes(CLOSEOUT_LANES, { profiles: ['typo'] }), /unknown profile: typo/);
  assert.throws(() => selectLanes(CLOSEOUT_LANES, { categories: ['typo'] }), /unknown category: typo/);
  assert.throws(() => selectLanes(CLOSEOUT_LANES, { laneIds: ['typo'] }), /unknown lane: typo/);
  assert.throws(
    () => selectLanes(CLOSEOUT_LANES, { profiles: ['order-pdf'], resumeFrom: 'build-dist' }),
    /resume lane build-dist is not part of the selected lane set/
  );
});

test('final report eligibility requires a complete clean default closeout', () => {
  const context = createCloseoutContext();
  const requiredLaneIds = CLOSEOUT_PROFILES.default;
  const fullPayload = createCloseoutPayload({
    runId: 'full-release-closeout-001',
    requestedLaneIds: requiredLaneIds,
    context,
    results: CLOSEOUT_LANES.map(lane => ({
      ...lane,
      status: 'passed',
      exitCode: 0,
      durationMs: 1,
      stdout: '',
      stderr: '',
    })),
  });
  assert.deepEqual(validateFinalReportEligibility(fullPayload), []);
  assert.doesNotThrow(() => assertFinalSelectionEligible(requiredLaneIds));

  const whitespacePayload = structuredClone(fullPayload);
  whitespacePayload.results[0].stdout = 'stdout evidence with spaces  \nstdout evidence with tab\t\n';
  whitespacePayload.results[0].stderr = 'stderr evidence with spaces \n';
  const markdown = buildMarkdownReport(whitespacePayload);
  assert.doesNotMatch(markdown, /[ \t]+$/mu);
  assert.match(markdown, /stdout evidence with spaces\n/u);
  assert.match(markdown, /stderr evidence with spaces\n/u);

  const focusedPayload = createCloseoutPayload({
    runId: 'focused-closeout-001',
    requestedLaneIds: CLOSEOUT_PROFILES['control-plane'],
    context,
    results: fullPayload.results.slice(0, 2),
  });
  assert.match(validateFinalReportEligibility(focusedPayload).join('\n'), /missing required lane/);
  assert.throws(
    () => assertFinalSelectionEligible(CLOSEOUT_PROFILES['control-plane']),
    /--write-final requires the complete default closeout selection/
  );

  const environmentBlockedPayload = structuredClone(fullPayload);
  environmentBlockedPayload.results[0].status = 'environment-blocked';
  environmentBlockedPayload.summary = summarize(environmentBlockedPayload.results);
  environmentBlockedPayload.finalStatus = 'passed-with-environment-blockers';
  assert.match(
    validateFinalReportEligibility(environmentBlockedPayload).join('\n'),
    /final report status must be passed/
  );
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

test('state helpers roundtrip versioned payloads and return null when the file is missing', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'closeout-state-'));
  const statePath = path.join(tempDir, 'closeout-state.json');
  assert.equal(readStatePayload(statePath), null);

  const lane = CLOSEOUT_LANES.find(entry => entry.id === 'build-dist');
  const context = createCloseoutContext();
  const payload = createCloseoutPayload({
    workspace: '/tmp/workspace',
    generatedAt: '2026-04-16T00:00:00.000Z',
    runId: 'state-roundtrip-001',
    meta: { stateFile: statePath },
    requestedLaneIds: ['build-dist'],
    context,
    results: [
      {
        ...lane,
        status: 'passed',
        exitCode: 0,
        durationMs: 1,
        startedAtIso: '2026-04-16T00:00:00.000Z',
        finishedAtIso: '2026-04-16T00:00:00.001Z',
        stdout: '',
        stderr: '',
      },
    ],
  });
  writeStatePayload(statePath, payload, { context });
  const loaded = readStatePayload(statePath);
  assert.equal(loaded.workspace, '/tmp/workspace');
  assert.equal(loaded.runId, 'state-roundtrip-001');
  assert.deepEqual(loaded.selection.completedLaneIds, ['build-dist']);
  assert.equal(loaded.results[0].laneDigest, payload.results[0].laneDigest);
});

test('reset-style empty state is explicitly not-run rather than passed', () => {
  const context = createCloseoutContext();
  const payload = createCloseoutPayload({
    runId: 'empty-state-001',
    results: [],
    requestedLaneIds: [],
    context,
  });
  assert.equal(payload.summary.ok, false);
  assert.equal(payload.finalStatus, 'not-run');
  assert.match(buildMarkdownReport(payload), /No closeout lane executed/);
});

test('state file resolves to explicit flag or default artifact path', () => {
  assert.equal(resolveStateFile({ stateFile: '.artifacts/custom.json' }), '.artifacts/custom.json');
  assert.equal(resolveStateFile({}), STATE_JSON_PATH);
});

test('browser-dependent lanes inherit environment-blocked from preflight', () => {
  for (const laneId of ['e2e-list', 'e2e-smoke-run', 'browser-perf', 'browser-perf-release']) {
    const lane = CLOSEOUT_LANES.find(entry => entry.id === laneId);
    const result = runLane(lane, {
      priorResults: [{ id: 'e2e-preflight', status: 'environment-blocked' }],
    });
    assert.equal(result.status, 'environment-blocked');
    assert.equal(result.blockedBy, 'e2e-preflight');
    assert.match(result.stderr, /dependency e2e-preflight/);
  }
});

test('closeout lane logs replace stale streams and grouped-step evidence', () => {
  const logDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-closeout-logs-'));
  const staleLane = {
    id: 'stale-log-probe',
    label: 'stale log probe',
    category: 'toolchain',
    expected: 'pass',
    command: process.execPath,
    args: ['-e', "console.error('old stderr')"],
  };
  assert.equal(runLane(staleLane, { logDir }).status, 'passed');
  assert.match(fs.readFileSync(path.join(logDir, 'stale-log-probe.stderr.log'), 'utf8'), /old stderr/u);

  const groupedLane = {
    ...staleLane,
    command: undefined,
    args: undefined,
    steps: [
      {
        label: 'grouped success',
        command: process.execPath,
        args: ['-e', "console.log('grouped stdout')"],
      },
    ],
  };
  assert.equal(runLane(groupedLane, { logDir }).status, 'passed');
  assert.match(fs.readFileSync(path.join(logDir, 'stale-log-probe.steps.json'), 'utf8'), /grouped success/u);
  assert.equal(fs.readFileSync(path.join(logDir, 'stale-log-probe.stderr.log'), 'utf8'), '');

  const cleanLane = {
    id: groupedLane.id,
    label: groupedLane.label,
    category: groupedLane.category,
    expected: 'pass',
    command: process.execPath,
    args: ['-e', "console.log('fresh stdout')"],
  };
  assert.equal(runLane(cleanLane, { logDir }).status, 'passed');
  assert.equal(fs.readFileSync(path.join(logDir, 'stale-log-probe.stderr.log'), 'utf8'), '');
  assert.match(fs.readFileSync(path.join(logDir, 'stale-log-probe.stdout.log'), 'utf8'), /fresh stdout/u);
  assert.equal(fs.existsSync(path.join(logDir, 'stale-log-probe.steps.json')), false);
});

test('report paths stay under docs and state path stays under artifacts', () => {
  assert.equal(REPORT_JSON_PATH, 'docs/FINAL_VERIFICATION_SUMMARY.json');
  assert.equal(REPORT_MD_PATH, 'docs/FINAL_VERIFICATION_SUMMARY.md');
  assert.equal(STATE_JSON_PATH, '.artifacts/closeout-state.json');
});
