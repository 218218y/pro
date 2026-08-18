'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const {
  assertCompatibleVerificationState,
  createVerificationContext,
  createVerificationPayload,
  summarizeResults,
  validateVerificationPayload,
} = require('./wp_verification_manifest.cjs');

const REPORT_JSON_PATH = 'docs/FINAL_VERIFICATION_SUMMARY.json';
const REPORT_MD_PATH = 'docs/FINAL_VERIFICATION_SUMMARY.md';
const STATE_JSON_PATH = '.artifacts/closeout-state.json';

const CLOSEOUT_LANES = [
  {
    id: 'verification-control-plane',
    label: 'Verification control-plane contracts',
    category: 'toolchain',
    expected: 'pass',
    testGroupId: 'verification-control-plane',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'verification-control-plane'],
  },
  {
    id: 'toolchain-surfaces',
    label: 'Toolchain surfaces (canonical group)',
    category: 'toolchain',
    expected: 'pass',
    testGroupId: 'toolchain-surfaces',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'toolchain-surfaces'],
  },
  {
    id: 'build-dist',
    label: 'Build dist bundle',
    command: 'npm',
    args: ['run', 'build:dist'],
    category: 'build',
    expected: 'pass',
  },
  {
    id: 'perf-smoke',
    label: 'Perf smoke baseline',
    command: 'npm',
    args: ['run', 'perf:smoke'],
    category: 'perf',
    expected: 'pass',
  },
  {
    id: 'overlay-export-core',
    label: 'Overlay/export family core verify (direct)',
    category: 'verify',
    expected: 'pass',
    steps: [
      {
        label: 'overlay/export contracts',
        command: 'node',
        args: ['--test', 'tests/export_overlay_errors_family_contracts.test.js'],
      },
      { label: 'typecheck project', command: 'node', args: ['tools/wp_typecheck.js', '--mode', 'project'] },
      { label: 'layer contracts', command: 'node', args: ['tools/wp_layer_contract.js'] },
      { label: 'public api contracts', command: 'node', args: ['tools/wp_public_api_contract.js'] },
    ],
  },
  {
    id: 'order-pdf-overlay-core',
    label: 'Order PDF overlay core (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-overlay-core',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-overlay-core'],
  },
  {
    id: 'order-pdf-pdf-render',
    label: 'Order PDF PDF-render batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-pdf-render',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-pdf-render'],
  },
  {
    id: 'order-pdf-sketch',
    label: 'Order PDF sketch batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-sketch',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-sketch'],
  },
  {
    id: 'order-pdf-export-overlay',
    label: 'Order PDF export overlay batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-export-overlay',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-export-overlay'],
  },
  {
    id: 'order-pdf-export-builders',
    label: 'Order PDF export builders batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-export-builders',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-export-builders'],
  },
  {
    id: 'order-pdf-export-capture',
    label: 'Order PDF export capture batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-export-capture',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-export-capture'],
  },
  {
    id: 'order-pdf-export-text',
    label: 'Order PDF export text batch (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'order-pdf-export-text',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'order-pdf-export-text'],
  },
  {
    id: 'sketch-manual-hover',
    label: 'Sketch manual/hover (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'sketch-manual-hover',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'sketch-manual-hover'],
  },
  {
    id: 'sketch-box-hover',
    label: 'Sketch box/hover (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'sketch-box-hover',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'sketch-box-hover'],
  },
  {
    id: 'sketch-free-boxes',
    label: 'Sketch free-boxes (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'sketch-free-boxes',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'sketch-free-boxes'],
  },
  {
    id: 'sketch-render-visuals',
    label: 'Sketch render/visuals (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'sketch-render-visuals',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'sketch-render-visuals'],
  },
  {
    id: 'cloud-sync-lifecycle',
    label: 'Cloud sync lifecycle (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-lifecycle',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-lifecycle'],
  },
  {
    id: 'cloud-sync-main-row',
    label: 'Cloud sync main-row (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-main-row',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-main-row'],
  },
  {
    id: 'cloud-sync-panel-install',
    label: 'Cloud sync panel-install (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-panel-install',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-panel-install'],
  },
  {
    id: 'cloud-sync-panel-controller',
    label: 'Cloud sync panel-controller (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-panel-controller',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-panel-controller'],
  },
  {
    id: 'cloud-sync-panel-subscriptions',
    label: 'Cloud sync panel-subscriptions (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-panel-subscriptions',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-panel-subscriptions'],
  },
  {
    id: 'cloud-sync-panel-snapshots',
    label: 'Cloud sync panel-snapshots (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-panel-snapshots',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-panel-snapshots'],
  },
  {
    id: 'cloud-sync-sync-ops',
    label: 'Cloud sync sync-ops (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-sync-ops',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-sync-ops'],
  },
  {
    id: 'cloud-sync-tabs-ui',
    label: 'Cloud sync tabs-ui (canonical group)',
    category: 'verify',
    expected: 'pass',
    testGroupId: 'cloud-sync-tabs-ui',
    command: 'node',
    args: ['tools/wp_test_group.mjs', 'cloud-sync-tabs-ui'],
  },
  {
    id: 'e2e-preflight',
    label: 'Playwright browser preflight',
    command: 'npm',
    args: ['run', 'e2e:smoke:preflight'],
    category: 'e2e',
    expected: 'environment-ok',
  },
  {
    id: 'e2e-list',
    label: 'Playwright smoke suite listing',
    command: 'npm',
    args: ['run', 'e2e:smoke:list'],
    category: 'e2e',
    expected: 'pass',
    dependsOn: ['e2e-preflight'],
  },
  {
    id: 'e2e-smoke-run',
    label: 'Playwright smoke run',
    command: 'npm',
    args: ['run', 'e2e:smoke'],
    category: 'e2e',
    expected: 'pass',
    dependsOn: ['e2e-preflight'],
  },
  {
    id: 'browser-perf',
    label: 'Browser dev regression performance evidence',
    command: 'npm',
    args: ['run', 'perf:browser'],
    category: 'perf',
    expected: 'pass',
    dependsOn: ['e2e-preflight'],
  },
  {
    id: 'browser-perf-release',
    label: 'Browser release UX performance evidence',
    command: 'npm',
    args: ['run', 'perf:browser:release'],
    category: 'perf',
    expected: 'pass',
    dependsOn: ['e2e-preflight'],
  },
];

const CLOSEOUT_PROFILES = {
  default: CLOSEOUT_LANES.map(lane => lane.id),
  verify: CLOSEOUT_LANES.filter(lane => lane.category === 'verify').map(lane => lane.id),
  'control-plane': ['verification-control-plane', 'toolchain-surfaces'],
  'verify-core': [
    'verification-control-plane',
    'toolchain-surfaces',
    'build-dist',
    'perf-smoke',
    'overlay-export-core',
  ],
  'order-pdf': CLOSEOUT_LANES.filter(lane => lane.id.startsWith('order-pdf-')).map(lane => lane.id),
  sketch: CLOSEOUT_LANES.filter(lane => lane.id.startsWith('sketch-')).map(lane => lane.id),
  'cloud-sync': CLOSEOUT_LANES.filter(lane => lane.id.startsWith('cloud-sync-')).map(lane => lane.id),
  e2e: CLOSEOUT_LANES.filter(lane => lane.category === 'e2e').map(lane => lane.id),
  'browser-evidence': ['e2e-preflight', 'e2e-list', 'e2e-smoke-run', 'browser-perf', 'browser-perf-release'],
};

function nowIso() {
  return new Date().toISOString();
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function resolveStateFile(options = {}) {
  return options.stateFile || STATE_JSON_PATH;
}

function readJsonFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readStatePayload(filePath) {
  const payload = readJsonFile(filePath);
  if (!payload) return null;
  if (!Array.isArray(payload.results)) {
    throw new Error(`[closeout] invalid state payload at ${filePath}: results must be an array`);
  }
  return payload;
}

function mergeResults(existingResults, nextResults) {
  const byId = new Map();
  for (const result of existingResults || []) {
    if (result && result.id) byId.set(result.id, result);
  }
  for (const result of nextResults || []) {
    if (result && result.id) byId.set(result.id, result);
  }
  const ordered = [];
  for (const lane of CLOSEOUT_LANES) {
    if (byId.has(lane.id)) ordered.push(byId.get(lane.id));
    byId.delete(lane.id);
  }
  for (const leftover of byId.values()) ordered.push(leftover);
  return ordered;
}

function writeStatePayload(filePath, payload, options = {}) {
  const errors = validateCloseoutPayload(payload, options);
  if (errors.length) {
    throw new Error(`[closeout] refusing to write invalid state payload\n- ${errors.join('\n- ')}`);
  }
  ensureDirFor(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function trimOutput(text, maxChars = 5000) {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return `${text.slice(0, maxChars - 80)}\n...\n[trimmed ${text.length - maxChars} chars]`;
}

function classifyEnvironmentFailure(output) {
  const lower = String(output || '').toLowerCase();
  return (
    lower.includes('chromium') ||
    lower.includes('browser') ||
    lower.includes('playwright') ||
    lower.includes('eai_again') ||
    lower.includes('failed to download') ||
    lower.includes("executable doesn't exist") ||
    lower.includes('please run the following command to download new browsers')
  );
}

function classifyRunnerFailure(output) {
  const lower = String(output || '').toLowerCase();
  return (
    lower.includes('\neof') ||
    lower.startsWith('eof') ||
    lower.includes(' sigterm') ||
    lower.includes('\nsigterm') ||
    lower.includes('wrapper the wait') ||
    lower.includes('sandbox dropped')
  );
}

function normalizeCliArgs(argv) {
  const options = {
    laneIds: [],
    categories: [],
    profiles: [],
    skipLaneIds: [],
    resumeFrom: null,
    stopOnFail: false,
    shouldWriteFinal: false,
    appendState: false,
    fromState: false,
    resetState: false,
    logDir: null,
    stateFile: null,
  };
  const valueOptions = new Map([
    ['--lane', value => options.laneIds.push(value)],
    ['--category', value => options.categories.push(value)],
    ['--profile', value => options.profiles.push(value)],
    ['--skip', value => options.skipLaneIds.push(value)],
    ['--resume-from', value => (options.resumeFrom = value)],
    ['--log-dir', value => (options.logDir = value)],
    ['--state-file', value => (options.stateFile = value)],
  ]);
  const booleanOptions = new Map([
    ['--stop-on-fail', () => (options.stopOnFail = true)],
    ['--write-final', () => (options.shouldWriteFinal = true)],
    ['--append-state', () => (options.appendState = true)],
    ['--from-state', () => (options.fromState = true)],
    ['--reset-state', () => (options.resetState = true)],
  ]);

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (valueOptions.has(token)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new Error(`[closeout] ${token} requires a value`);
      }
      valueOptions.get(token)(value);
      index += 1;
      continue;
    }
    if (booleanOptions.has(token)) {
      booleanOptions.get(token)();
      continue;
    }
    throw new Error(`[closeout] unknown argument: ${token}`);
  }
  return options;
}

function validateSelectionOptions(lanes, options = {}) {
  const laneIds = new Set((lanes || []).map(lane => lane.id));
  const categories = new Set((lanes || []).map(lane => lane.category));
  const profiles = new Set(Object.keys(CLOSEOUT_PROFILES));

  function assertKnown(label, values, known) {
    const unknown = (values || []).filter(value => !known.has(value));
    if (unknown.length) {
      throw new Error(
        `[closeout] unknown ${label}: ${unknown.join(', ')}; allowed: ${Array.from(known).join(', ')}`
      );
    }
  }

  assertKnown('profile', options.profiles, profiles);
  assertKnown('category', options.categories, categories);
  assertKnown('lane', options.laneIds, laneIds);
  assertKnown('skip lane', options.skipLaneIds, laneIds);
  if (options.resumeFrom && !laneIds.has(options.resumeFrom)) {
    throw new Error(`[closeout] unknown resume lane: ${options.resumeFrom}`);
  }
}

function selectLanes(lanes, options = {}) {
  validateSelectionOptions(lanes, options);
  const laneMap = new Map(lanes.map(lane => [lane.id, lane]));
  const selectedIds = [];

  function pushUnique(id) {
    if (!laneMap.has(id)) return;
    if (!selectedIds.includes(id)) selectedIds.push(id);
  }

  if (Array.isArray(options.profiles) && options.profiles.length > 0) {
    for (const profile of options.profiles) {
      for (const id of CLOSEOUT_PROFILES[profile] || []) pushUnique(id);
    }
  }

  if (Array.isArray(options.categories) && options.categories.length > 0) {
    for (const lane of lanes) {
      if (options.categories.includes(lane.category)) pushUnique(lane.id);
    }
  }

  if (Array.isArray(options.laneIds) && options.laneIds.length > 0) {
    for (const id of options.laneIds) pushUnique(id);
  }

  if (selectedIds.length === 0) {
    for (const lane of lanes) pushUnique(lane.id);
  }

  let filtered = selectedIds.map(id => laneMap.get(id)).filter(Boolean);

  if (options.resumeFrom) {
    const startIndex = filtered.findIndex(lane => lane.id === options.resumeFrom);
    if (startIndex < 0) {
      throw new Error(`[closeout] resume lane ${options.resumeFrom} is not part of the selected lane set`);
    }
    filtered = filtered.slice(startIndex);
  }

  if (Array.isArray(options.skipLaneIds) && options.skipLaneIds.length > 0) {
    filtered = filtered.filter(lane => !options.skipLaneIds.includes(lane.id));
  }

  return filtered;
}

function writeLaneLogs(logDir, laneResult) {
  if (!logDir) return;
  ensureDir(logDir);
  const safeId = laneResult.id.replace(/[^a-z0-9._-]+/gi, '_');
  const base = path.join(logDir, safeId);
  if (laneResult.stdout) fs.writeFileSync(`${base}.stdout.log`, `${laneResult.stdout}\n`, 'utf8');
  if (laneResult.stderr) fs.writeFileSync(`${base}.stderr.log`, `${laneResult.stderr}\n`, 'utf8');
  if (Array.isArray(laneResult.steps) && laneResult.steps.length > 0) {
    fs.writeFileSync(`${base}.steps.json`, `${JSON.stringify(laneResult.steps, null, 2)}\n`, 'utf8');
  }
}

function resolveSpawnInvocation(command, args, options = {}) {
  const env = options.env || process.env;
  const platform = options.platform || process.platform;
  const existsImpl = options.existsImpl || fs.existsSync;
  const normalizedArgs = Array.isArray(args) ? args : [];
  if (command !== 'npm') return { command, args: normalizedArgs };

  const candidates = [
    env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
  ].filter(Boolean);
  const npmCli = candidates.find(
    candidate => /npm-cli\.(?:c?js)$/iu.test(candidate) && existsImpl(candidate)
  );
  if (npmCli) return { command: process.execPath, args: [npmCli, ...normalizedArgs] };
  if (platform === 'win32') {
    throw new Error('[closeout] npm CLI path is unavailable; refusing an unsafe shell fallback on Windows');
  }
  return { command, args: normalizedArgs };
}

function spawnCommand(command, args) {
  const startedAt = Date.now();
  const invocation = resolveSpawnInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, WP_RELEASE_VERIFY: '1' },
    maxBuffer: 1024 * 1024 * 16,
  });
  const durationMs = Date.now() - startedAt;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  const combined = `${stdout}\n${stderr}`;
  const exitCode = Number.isInteger(result.status) ? result.status : 1;
  return {
    exitCode,
    durationMs,
    startedAtIso: new Date(startedAt).toISOString(),
    finishedAtIso: nowIso(),
    stdout: trimOutput(stdout),
    stderr: trimOutput(stderr),
    combined,
  };
}

function findBlockingDependency(lane, priorResults = []) {
  if (!Array.isArray(lane.dependsOn) || lane.dependsOn.length === 0) return null;
  const byId = new Map((priorResults || []).filter(Boolean).map(result => [result.id, result]));
  for (const dependencyId of lane.dependsOn) {
    const dependency = byId.get(dependencyId);
    if (!dependency) return { id: dependencyId, status: 'failed', reason: 'missing-dependency-result' };
    if (dependency.status !== 'passed') return dependency;
  }
  return null;
}

function classifyStatus(expected, exitCode, combined) {
  if (exitCode === 0) return 'passed';
  if (expected === 'environment-ok' && classifyEnvironmentFailure(combined)) return 'environment-blocked';
  if (classifyRunnerFailure(combined)) return 'runner-blocked';
  return 'failed';
}

function runLane(lane, options = {}) {
  const startedAt = Date.now();
  const blockingDependency = findBlockingDependency(lane, options.priorResults || []);
  if (blockingDependency) {
    const blockedStatus =
      blockingDependency.status === 'environment-blocked'
        ? 'environment-blocked'
        : blockingDependency.status === 'runner-blocked'
          ? 'runner-blocked'
          : 'failed';
    const result = {
      ...lane,
      status: blockedStatus,
      exitCode: 1,
      durationMs: 0,
      startedAtIso: new Date(startedAt).toISOString(),
      finishedAtIso: nowIso(),
      stdout: '',
      stderr: `Skipped because dependency ${blockingDependency.id} resolved to ${blockingDependency.status}.`,
      blockedBy: blockingDependency.id,
    };
    writeLaneLogs(options.logDir, result);
    return result;
  }
  if (Array.isArray(lane.steps) && lane.steps.length > 0) {
    const steps = [];
    let status = 'passed';
    let exitCode = 0;
    for (const step of lane.steps) {
      const spawned = spawnCommand(step.command, step.args);
      const stepStatus = classifyStatus(lane.expected, spawned.exitCode, spawned.combined);
      steps.push({
        label: step.label,
        command: step.command,
        args: step.args || [],
        status: stepStatus,
        exitCode: spawned.exitCode,
        durationMs: spawned.durationMs,
        startedAtIso: spawned.startedAtIso,
        finishedAtIso: spawned.finishedAtIso,
        stdout: spawned.stdout,
        stderr: spawned.stderr,
      });
      if (stepStatus !== 'passed') {
        status = stepStatus;
        exitCode = spawned.exitCode;
        break;
      }
    }
    const result = {
      ...lane,
      status,
      exitCode,
      durationMs: Date.now() - startedAt,
      startedAtIso: new Date(startedAt).toISOString(),
      finishedAtIso: nowIso(),
      steps,
      stdout: '',
      stderr: '',
    };
    writeLaneLogs(options.logDir, result);
    return result;
  }
  const spawned = spawnCommand(lane.command, lane.args);
  const result = {
    ...lane,
    status: classifyStatus(lane.expected, spawned.exitCode, spawned.combined),
    exitCode: spawned.exitCode,
    durationMs: spawned.durationMs,
    startedAtIso: spawned.startedAtIso,
    finishedAtIso: spawned.finishedAtIso,
    stdout: spawned.stdout,
    stderr: spawned.stderr,
  };
  writeLaneLogs(options.logDir, result);
  return result;
}

function summarize(results) {
  return summarizeResults(results);
}

function createCloseoutContext(projectRoot = process.cwd()) {
  return createVerificationContext({
    projectRoot,
    lanes: CLOSEOUT_LANES,
    profiles: CLOSEOUT_PROFILES,
  });
}

function createCloseoutPayload({
  projectRoot = process.cwd(),
  workspace = projectRoot,
  generatedAt,
  runId,
  meta = {},
  results = [],
  requestedLaneIds = [],
  context = null,
} = {}) {
  return createVerificationPayload({
    projectRoot,
    workspace,
    generatedAt,
    runId,
    meta,
    results,
    requestedLaneIds,
    lanes: CLOSEOUT_LANES,
    profiles: CLOSEOUT_PROFILES,
    context,
  });
}

function validateCloseoutPayload(payload, options = {}) {
  return validateVerificationPayload(payload, {
    projectRoot: options.projectRoot || process.cwd(),
    lanes: CLOSEOUT_LANES,
    profiles: CLOSEOUT_PROFILES,
    requireCurrentSource: options.requireCurrentSource !== false,
    context: options.context || null,
  });
}

function validateFinalReportEligibility(payload) {
  const errors = [];
  const requiredLaneIds = CLOSEOUT_PROFILES.default;
  const requestedLaneIds = new Set(payload?.selection?.requestedLaneIds || []);
  const completedLaneIds = new Set(payload?.selection?.completedLaneIds || []);
  const missingRequested = requiredLaneIds.filter(id => !requestedLaneIds.has(id));
  const missingCompleted = requiredLaneIds.filter(id => !completedLaneIds.has(id));

  if (missingRequested.length) {
    errors.push(`final report selection is missing required lane(s): ${missingRequested.join(', ')}`);
  }
  if (missingCompleted.length) {
    errors.push(`final report results are missing required lane(s): ${missingCompleted.join(', ')}`);
  }
  if (payload?.selection?.complete !== true) {
    errors.push('final report selection must be complete');
  }
  if (payload?.finalStatus !== 'passed') {
    errors.push(`final report status must be passed; received ${payload?.finalStatus || '(missing)'}`);
  }

  return errors;
}

function assertFinalSelectionEligible(selectedLaneIds) {
  const selected = new Set(selectedLaneIds || []);
  const missing = CLOSEOUT_PROFILES.default.filter(id => !selected.has(id));
  if (missing.length || selected.size !== CLOSEOUT_PROFILES.default.length) {
    throw new Error(
      `[closeout] --write-final requires the complete default closeout selection; missing: ${missing.join(', ') || '(none)'}`
    );
  }
}

function assertCompatibleCloseoutState(payload, options = {}) {
  return assertCompatibleVerificationState(payload, {
    projectRoot: options.projectRoot || process.cwd(),
    lanes: CLOSEOUT_LANES,
    profiles: CLOSEOUT_PROFILES,
    requireCurrentSource: true,
    context: options.context || null,
  });
}

function formatStatusIcon(status) {
  if (status === 'passed') return '[PASS]';
  if (status === 'environment-blocked') return '[ENV-BLOCKED]';
  if (status === 'runner-blocked') return '[RUNNER-BLOCKED]';
  return '[FAIL]';
}

function formatLaneResultMd(result) {
  const commandText = result.command ? [result.command, ...(result.args || [])].join(' ') : '(grouped steps)';
  const lines = [
    `### ${formatStatusIcon(result.status)} ${result.label}`,
    '',
    `- id: \`${result.id}\``,
    `- category: \`${result.category}\``,
    `- command: \`${commandText}\``,
    `- status: **${result.status}**`,
    `- exit code: \`${result.exitCode}\``,
    `- duration: \`${result.durationMs}ms\``,
  ];
  if (Array.isArray(result.steps) && result.steps.length > 0) {
    lines.push('', '#### steps', '');
    for (const step of result.steps) {
      lines.push(
        `- ${formatStatusIcon(step.status)} ${step.label}: \`${[step.command, ...(step.args || [])].join(' ')}\` (${step.status}, ${step.durationMs}ms)`
      );
    }
  }
  if (result.stderr) lines.push('', '#### stderr', '', '```text', result.stderr, '```');
  if (result.stdout) lines.push('', '#### stdout', '', '```text', result.stdout, '```');
  return lines.join('\n').replace(/\n+$/u, '\n');
}

function describeFinalStatus(payload) {
  if (payload.finalStatus === 'passed') {
    return 'All selected closeout lanes passed. This report is valid for the explicit selection recorded above.';
  }
  if (payload.finalStatus === 'passed-with-environment-blockers') {
    return 'All executable selected lanes passed, but at least one lane was environment-blocked. This is not equivalent to a fully provisioned clean closeout.';
  }
  if (payload.finalStatus === 'not-run') {
    return 'No closeout lane executed. This payload is a state marker, not verification evidence.';
  }
  if (payload.finalStatus === 'incomplete') {
    return 'The requested lane selection was not completed. Partial results must not be treated as a successful closeout.';
  }
  if (payload.finalStatus === 'runner-blocked') {
    return 'At least one lane was blocked by the wrapper, runner, or sandbox. This is not a real pass.';
  }
  return 'At least one lane failed at the verify or command level, so this closeout is not complete.';
}

function buildMarkdownReport(payload) {
  const lines = [
    '# Final Verification Summary',
    '',
    `- schema_version: \`${payload.schemaVersion}\``,
    `- run_id: \`${payload.runId}\``,
    `- generated_at: ${payload.generatedAt}`,
    `- workspace: \`${payload.workspace}\``,
    `- source_digest: \`${payload.source?.digest || '(missing)'}\``,
    `- source_files: **${payload.source?.fileCount ?? 0}**`,
    `- lane_catalog_digest: \`${payload.laneCatalog?.digest || '(missing)'}\``,
    `- node: \`${payload.runtime?.nodeVersion || '(missing)'}\``,
    `- final_status: **${payload.finalStatus || '(missing)'}**`,
    `- requested lanes: **${payload.selection?.requestedLaneIds?.length ?? 0}**`,
    `- completed selection: **${payload.selection?.complete === true ? 'yes' : 'no'}**`,
    `- total results: **${payload.summary.total}**`,
    `- passed: **${payload.summary.passed}**`,
    `- environment-blocked: **${payload.summary.environmentBlocked}**`,
    `- runner-blocked: **${payload.summary.runnerBlocked}**`,
    `- failed: **${payload.summary.failed}**`,
  ];
  if (payload.meta) {
    lines.push(
      `- selected profiles: \`${(payload.meta.profiles || []).join(', ') || 'default'}\``,
      `- selected categories: \`${(payload.meta.categories || []).join(', ') || '(all)'}\``,
      `- selected lanes: \`${(payload.meta.laneIds || []).join(', ') || '(all)'}\``,
      `- skipped lanes: \`${(payload.meta.skipLaneIds || []).join(', ') || '(none)'}\``,
      `- resumed from: \`${payload.meta.resumeFrom || '(start)'}\``,
      `- requested lane ids: \`${(payload.selection?.requestedLaneIds || []).join(', ') || '(none)'}\``,
      `- completed lane ids: \`${(payload.selection?.completedLaneIds || []).join(', ') || '(none)'}\``,
      `- state file: \`${payload.meta.stateFile || '(none)'}\``
    );
  }
  lines.push(
    '',
    '## Interpretation',
    '',
    describeFinalStatus(payload),
    '',
    payload.summary.environmentBlocked > 0
      ? 'At least one lane was environment-blocked. It is not counted as a code failure, but still needs a fully provisioned environment.'
      : 'No environment blockers were detected in this closeout run.',
    '',
    payload.summary.runnerBlocked > 0
      ? 'At least one lane was blocked by the wrapper/runner/sandbox. It is not a direct code failure, but it is not a real pass either.'
      : 'No runner blockers were detected in this closeout run.',
    '',
    '## Lane results',
    ''
  );
  for (const result of payload.results) lines.push(formatLaneResultMd(result), '');
  return lines.join('\n');
}

function writeFinalReports(payload, reportPaths = {}, options = {}) {
  const errors = validateCloseoutPayload(payload, options);
  errors.push(...validateFinalReportEligibility(payload));
  if (errors.length) {
    throw new Error(
      `[closeout] refusing to write ineligible final verification report\n- ${errors.join('\n- ')}`
    );
  }
  const jsonPath = reportPaths.jsonPath || REPORT_JSON_PATH;
  const mdPath = reportPaths.mdPath || REPORT_MD_PATH;
  ensureDirFor(jsonPath);
  fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(mdPath, buildMarkdownReport(payload), 'utf8');
}

module.exports = {
  CLOSEOUT_LANES,
  CLOSEOUT_PROFILES,
  REPORT_JSON_PATH,
  REPORT_MD_PATH,
  STATE_JSON_PATH,
  assertFinalSelectionEligible,
  buildMarkdownReport,
  classifyEnvironmentFailure,
  classifyRunnerFailure,
  createCloseoutContext,
  createCloseoutPayload,
  normalizeCliArgs,
  resolveSpawnInvocation,
  runLane,
  selectLanes,
  readStatePayload,
  assertCompatibleCloseoutState,
  mergeResults,
  resolveStateFile,
  summarize,
  validateCloseoutPayload,
  validateFinalReportEligibility,
  validateSelectionOptions,
  writeFinalReports,
  writeStatePayload,
};
