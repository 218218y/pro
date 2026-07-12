'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  VERIFICATION_SCHEMA_VERSION,
  assertCompatibleVerificationState,
  createLaneCatalogIdentity,
  createVerificationPayload,
  createVerificationSourceIdentity,
  resolveFinalStatus,
  summarizeResults,
  validateVerificationPayload,
} = require('../tools/wp_verification_manifest.cjs');

function createProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wp-verification-manifest-'));
  fs.mkdirSync(path.join(root, 'tools'), { recursive: true });
  fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
  fs.writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}\n');
  fs.writeFileSync(path.join(root, 'tools', 'runner.js'), 'export const value = 1;\n');
  fs.writeFileSync(path.join(root, 'tests', 'runner.test.js'), 'export const testValue = 1;\n');
  return root;
}

const lanes = [
  {
    id: 'unit',
    label: 'Unit contracts',
    category: 'toolchain',
    expected: 'pass',
    command: 'node',
    args: ['--test', 'tests/runner.test.js'],
  },
];
const profiles = { default: ['unit'] };

function passedResult() {
  return {
    ...lanes[0],
    status: 'passed',
    exitCode: 0,
    durationMs: 5,
    startedAtIso: '2026-07-12T10:00:00.000Z',
    finishedAtIso: '2026-07-12T10:00:00.005Z',
    stdout: '',
    stderr: '',
  };
}

test('source identity is deterministic and changes when owned source changes', () => {
  const root = createProject();
  const first = createVerificationSourceIdentity(root);
  const second = createVerificationSourceIdentity(root);
  assert.equal(first.digest, second.digest);
  assert.equal(first.fileCount, 3);
  assert.equal(first.git, null);

  fs.writeFileSync(path.join(root, 'tools', 'runner.js'), 'export const value = 2;\n');
  const changed = createVerificationSourceIdentity(root);
  assert.notEqual(changed.digest, first.digest);
});

test('lane catalog identity covers lane execution and profile membership', () => {
  const base = createLaneCatalogIdentity(lanes, profiles);
  const commandChanged = createLaneCatalogIdentity(
    [{ ...lanes[0], args: ['--test', 'tests/other.js'] }],
    profiles
  );
  const profileChanged = createLaneCatalogIdentity(lanes, { default: [], focused: ['unit'] });
  const testGroupChanged = createLaneCatalogIdentity(
    [{ ...lanes[0], testGroupId: 'unit-contracts' }],
    profiles
  );
  assert.notEqual(base.digest, commandChanged.digest);
  assert.notEqual(base.digest, profileChanged.digest);
  assert.notEqual(base.digest, testGroupChanged.digest);
});

test('verification payload binds results to source lane catalog and explicit selection', () => {
  const root = createProject();
  const payload = createVerificationPayload({
    projectRoot: root,
    workspace: root,
    generatedAt: '2026-07-12T10:00:01.000Z',
    runId: 'run-fixture-001',
    meta: { profiles: ['default'] },
    results: [passedResult()],
    requestedLaneIds: ['unit'],
    lanes,
    profiles,
    runtime: { nodeVersion: 'v24.0.0', platform: 'linux', arch: 'x64' },
  });

  assert.equal(payload.schemaVersion, VERIFICATION_SCHEMA_VERSION);
  assert.equal(payload.runId, 'run-fixture-001');
  assert.equal(payload.source.kind, 'source-tree');
  assert.match(payload.source.digest, /^sha256:/);
  assert.match(payload.laneCatalog.digest, /^sha256:/);
  assert.match(payload.results[0].laneDigest, /^sha256:/);
  assert.deepEqual(payload.selection, {
    requestedLaneIds: ['unit'],
    completedLaneIds: ['unit'],
    complete: true,
  });
  assert.equal(payload.finalStatus, 'passed');
  assert.deepEqual(validateVerificationPayload(payload, { projectRoot: root, lanes, profiles }), []);
});

test('verification validation fails closed for source drift lane drift and summary tampering', () => {
  const root = createProject();
  const payload = createVerificationPayload({
    projectRoot: root,
    runId: 'run-fixture-002',
    results: [passedResult()],
    requestedLaneIds: ['unit'],
    lanes,
    profiles,
  });

  fs.writeFileSync(path.join(root, 'tools', 'runner.js'), 'export const value = 9;\n');
  assert.match(
    validateVerificationPayload(payload, { projectRoot: root, lanes, profiles }).join('\n'),
    /source digest is stale/
  );

  const fresh = createVerificationPayload({
    projectRoot: root,
    runId: 'run-fixture-003',
    results: [passedResult()],
    requestedLaneIds: ['unit'],
    lanes,
    profiles,
  });
  const changedLanes = [{ ...lanes[0], args: ['--test', 'tests/changed.test.js'] }];
  assert.match(
    validateVerificationPayload(fresh, { projectRoot: root, lanes: changedLanes, profiles }).join('\n'),
    /lane catalog digest is stale|lane digest mismatch/
  );

  const tampered = structuredClone(fresh);
  tampered.summary.passed = 0;
  assert.match(
    validateVerificationPayload(tampered, { projectRoot: root, lanes, profiles }).join('\n'),
    /summary does not match results/
  );
});

test('state compatibility rejects legacy or stale payloads with a reset instruction', () => {
  const root = createProject();
  assert.throws(
    () =>
      assertCompatibleVerificationState(
        { generatedAt: '2026-07-12T10:00:00.000Z', results: [] },
        { projectRoot: root, lanes, profiles }
      ),
    /state cannot be resumed safely; reset it/
  );

  const payload = createVerificationPayload({
    projectRoot: root,
    runId: 'run-fixture-004',
    results: [passedResult()],
    requestedLaneIds: ['unit'],
    lanes,
    profiles,
  });
  fs.writeFileSync(path.join(root, 'tests', 'runner.test.js'), 'export const testValue = 2;\n');
  assert.throws(
    () => assertCompatibleVerificationState(payload, { projectRoot: root, lanes, profiles }),
    /source digest is stale/
  );
});

test('summary and final status preserve environment blockers without treating them as clean proof', () => {
  const summary = summarizeResults([{ status: 'passed' }, { status: 'environment-blocked' }]);
  assert.deepEqual(summary, {
    total: 2,
    passed: 1,
    failed: 0,
    environmentBlocked: 1,
    runnerBlocked: 0,
    ok: true,
  });
  assert.equal(resolveFinalStatus(summary), 'passed-with-environment-blockers');
});

test('empty and partial selections cannot report a successful closeout', () => {
  const emptySummary = summarizeResults([]);
  assert.deepEqual(emptySummary, {
    total: 0,
    passed: 0,
    failed: 0,
    environmentBlocked: 0,
    runnerBlocked: 0,
    ok: false,
  });
  assert.equal(resolveFinalStatus(emptySummary), 'not-run');

  const root = createProject();
  const partial = createVerificationPayload({
    projectRoot: root,
    runId: 'run-fixture-005',
    results: [],
    requestedLaneIds: ['unit'],
    lanes,
    profiles,
  });
  assert.equal(partial.selection.complete, false);
  assert.equal(partial.finalStatus, 'incomplete');
  assert.deepEqual(validateVerificationPayload(partial, { projectRoot: root, lanes, profiles }), []);
});
