'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const VERIFICATION_SCHEMA_VERSION = 1;
const VERIFICATION_SOURCE_ROOTS = Object.freeze([
  '.github',
  'css',
  'esm',
  'lean_types',
  'public',
  'sites',
  'tests',
  'tools',
  'types',
]);
const VERIFICATION_SOURCE_FILES = Object.freeze([
  'eslint.config.js',
  'oxlint.config.mjs',
  'package-lock.json',
  'package.json',
  'playwright.config.ts',
  'prettier.config.cjs',
  'tsconfig.json',
  'vite.config.mjs',
]);
const ROOT_SOURCE_FILE_PATTERN =
  /^(?:index.*\.html|wp_.*\.(?:js|mjs)|tsconfig.*\.json|.*\.config\.(?:js|cjs|mjs|ts)|netlify\.toml|site\.webmanifest)$/;
const RESULT_STATUSES = new Set(['passed', 'failed', 'environment-blocked', 'runner-blocked']);

function compareCodePoints(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function toPosixPath(value) {
  return String(value || '').replace(/\\/g, '/');
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => compareCodePoints(left, right))
      .map(([key, entry]) => [key, canonicalize(entry)])
  );
}

function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256Text(value) {
  return `sha256:${crypto.createHash('sha256').update(String(value)).digest('hex')}`;
}

function walkFiles(root, current, output) {
  const absolute = path.join(root, current);
  if (!fs.existsSync(absolute)) return;
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    output.push(toPosixPath(current));
    return;
  }
  const entries = fs
    .readdirSync(absolute, { withFileTypes: true })
    .sort((left, right) => compareCodePoints(left.name, right.name));
  for (const entry of entries) {
    walkFiles(root, path.join(current, entry.name), output);
  }
}

function collectVerificationSourceFiles(projectRoot = process.cwd()) {
  const files = [];
  for (const root of VERIFICATION_SOURCE_ROOTS) walkFiles(projectRoot, root, files);
  for (const file of VERIFICATION_SOURCE_FILES) {
    if (fs.existsSync(path.join(projectRoot, file))) files.push(file);
  }
  for (const entry of fs.readdirSync(projectRoot, { withFileTypes: true })) {
    if (entry.isFile() && ROOT_SOURCE_FILE_PATTERN.test(entry.name)) files.push(entry.name);
  }
  return Array.from(new Set(files.map(toPosixPath))).sort(compareCodePoints);
}

function readGitIdentity(projectRoot) {
  const commit = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  if (commit.status !== 0) return null;
  const status = spawnSync('git', ['status', '--porcelain', '--untracked-files=normal'], {
    cwd: projectRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  return {
    commitHash: String(commit.stdout || '').trim(),
    dirty: status.status === 0 ? String(status.stdout || '').trim().length > 0 : null,
  };
}

function createVerificationSourceIdentity(projectRoot = process.cwd()) {
  const files = collectVerificationSourceFiles(projectRoot);
  const hash = crypto.createHash('sha256');
  let byteCount = 0;
  for (const relativePath of files) {
    const absolutePath = path.join(projectRoot, relativePath);
    const content = fs.readFileSync(absolutePath);
    byteCount += content.byteLength;
    hash.update(relativePath);
    hash.update('\0');
    hash.update(String(content.byteLength));
    hash.update('\0');
    hash.update(content);
    hash.update('\0');
  }
  return {
    kind: 'source-tree',
    algorithm: 'sha256',
    digest: `sha256:${hash.digest('hex')}`,
    fileCount: files.length,
    byteCount,
    git: readGitIdentity(projectRoot),
  };
}

function normalizeLaneStep(step) {
  return {
    label: step.label,
    command: step.command,
    args: Array.isArray(step.args) ? step.args : [],
  };
}

function normalizeLaneDefinition(lane) {
  return {
    id: lane.id,
    label: lane.label,
    category: lane.category,
    expected: lane.expected,
    testGroupId: lane.testGroupId || null,
    command: lane.command || null,
    args: Array.isArray(lane.args) ? lane.args : [],
    dependsOn: Array.isArray(lane.dependsOn) ? lane.dependsOn : [],
    steps: Array.isArray(lane.steps) ? lane.steps.map(normalizeLaneStep) : [],
  };
}

function createLaneDigest(lane) {
  return sha256Text(canonicalJson(normalizeLaneDefinition(lane)));
}

function createLaneCatalogIdentity(lanes, profiles = {}) {
  const normalizedLanes = (lanes || []).map(normalizeLaneDefinition);
  const normalizedProfiles = Object.fromEntries(
    Object.entries(profiles || {})
      .sort(([left], [right]) => compareCodePoints(left, right))
      .map(([name, laneIds]) => [name, Array.from(laneIds || [])])
  );
  return {
    algorithm: 'sha256',
    digest: sha256Text(canonicalJson({ lanes: normalizedLanes, profiles: normalizedProfiles })),
    laneCount: normalizedLanes.length,
    profileCount: Object.keys(normalizedProfiles).length,
  };
}

function createVerificationContext({ projectRoot = process.cwd(), lanes = [], profiles = {} } = {}) {
  return {
    projectRoot,
    source: createVerificationSourceIdentity(projectRoot),
    laneCatalog: createLaneCatalogIdentity(lanes, profiles),
    laneDigests: new Map((lanes || []).map(lane => [lane.id, createLaneDigest(lane)])),
  };
}

function summarizeResults(results) {
  const summary = {
    total: Array.isArray(results) ? results.length : 0,
    passed: 0,
    failed: 0,
    environmentBlocked: 0,
    runnerBlocked: 0,
  };
  for (const result of results || []) {
    if (result.status === 'passed') summary.passed += 1;
    else if (result.status === 'environment-blocked') summary.environmentBlocked += 1;
    else if (result.status === 'runner-blocked') summary.runnerBlocked += 1;
    else summary.failed += 1;
  }
  summary.ok = summary.total > 0 && summary.failed === 0 && summary.runnerBlocked === 0;
  return summary;
}

function resolveFinalStatus(summary, selectionComplete = true) {
  if (summary.failed > 0) return 'failed';
  if (summary.runnerBlocked > 0) return 'runner-blocked';
  if (!selectionComplete) return 'incomplete';
  if (summary.total === 0) return 'not-run';
  if (summary.environmentBlocked > 0) return 'passed-with-environment-blockers';
  return 'passed';
}

function uniqueStrings(values) {
  return Array.from(new Set((values || []).filter(value => typeof value === 'string' && value.length > 0)));
}

function enrichResults(results, laneById, laneDigests) {
  return (results || []).map(result => {
    const lane = laneById.get(result.id);
    return {
      ...result,
      laneDigest: lane ? laneDigests?.get(result.id) || createLaneDigest(lane) : result.laneDigest || null,
    };
  });
}

function createVerificationPayload({
  projectRoot = process.cwd(),
  workspace = projectRoot,
  generatedAt = new Date().toISOString(),
  runId = crypto.randomUUID(),
  meta = {},
  results = [],
  requestedLaneIds = [],
  lanes = [],
  profiles = {},
  runtime = {},
  context = null,
}) {
  const verificationContext = context || createVerificationContext({ projectRoot, lanes, profiles });
  const laneById = new Map((lanes || []).map(lane => [lane.id, lane]));
  const enrichedResults = enrichResults(results, laneById, verificationContext.laneDigests);
  const completedLaneIds = uniqueStrings(enrichedResults.map(result => result.id));
  const requested = uniqueStrings(requestedLaneIds);
  const selection = {
    requestedLaneIds: requested,
    completedLaneIds,
    complete: requested.every(id => completedLaneIds.includes(id)),
  };
  const summary = summarizeResults(enrichedResults);
  return {
    schemaVersion: VERIFICATION_SCHEMA_VERSION,
    runId,
    generatedAt,
    workspace,
    runtime: {
      nodeVersion: runtime.nodeVersion || process.version,
      platform: runtime.platform || process.platform,
      arch: runtime.arch || process.arch,
    },
    source: verificationContext.source,
    laneCatalog: verificationContext.laneCatalog,
    selection,
    meta,
    summary,
    finalStatus: resolveFinalStatus(summary, selection.complete),
    results: enrichedResults,
  };
}

function sameJson(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function validateIsoTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function validateVerificationPayload(
  payload,
  { projectRoot = process.cwd(), lanes = [], profiles = {}, requireCurrentSource = true, context = null } = {}
) {
  const errors = [];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return ['payload must be an object'];
  }
  if (payload.schemaVersion !== VERIFICATION_SCHEMA_VERSION) {
    errors.push(
      `schemaVersion must be ${VERIFICATION_SCHEMA_VERSION}; received ${String(payload.schemaVersion)}`
    );
  }
  if (typeof payload.runId !== 'string' || payload.runId.trim().length < 8) {
    errors.push('runId must be a non-empty stable run identifier');
  }
  if (!validateIsoTimestamp(payload.generatedAt)) errors.push('generatedAt must be a valid ISO timestamp');
  if (!payload.runtime || typeof payload.runtime.nodeVersion !== 'string') {
    errors.push('runtime.nodeVersion is required');
  }

  const verificationContext = context || createVerificationContext({ projectRoot, lanes, profiles });
  const currentSource = verificationContext.source;
  if (!payload.source || typeof payload.source.digest !== 'string') {
    errors.push('source identity is required');
  } else if (requireCurrentSource && payload.source.digest !== currentSource.digest) {
    errors.push(`source digest is stale: report=${payload.source.digest} current=${currentSource.digest}`);
  }

  const currentCatalog = verificationContext.laneCatalog;
  if (!payload.laneCatalog || typeof payload.laneCatalog.digest !== 'string') {
    errors.push('laneCatalog identity is required');
  } else if (payload.laneCatalog.digest !== currentCatalog.digest) {
    errors.push(
      `lane catalog digest is stale: report=${payload.laneCatalog.digest} current=${currentCatalog.digest}`
    );
  }

  const laneById = new Map((lanes || []).map(lane => [lane.id, lane]));
  const results = Array.isArray(payload.results) ? payload.results : [];
  if (!Array.isArray(payload.results)) errors.push('results must be an array');
  const seenResultIds = new Set();
  for (const result of results) {
    if (!result || typeof result !== 'object') {
      errors.push('every result must be an object');
      continue;
    }
    if (typeof result.id !== 'string' || result.id.length === 0) {
      errors.push('every result must have an id');
      continue;
    }
    if (seenResultIds.has(result.id)) errors.push(`duplicate result id: ${result.id}`);
    seenResultIds.add(result.id);
    const lane = laneById.get(result.id);
    if (!lane) {
      errors.push(`unknown result lane id: ${result.id}`);
      continue;
    }
    const expectedLaneDigest = verificationContext.laneDigests.get(result.id) || createLaneDigest(lane);
    if (result.laneDigest !== expectedLaneDigest) {
      errors.push(`lane digest mismatch for ${result.id}`);
    }
    if (!RESULT_STATUSES.has(result.status)) errors.push(`invalid status for ${result.id}: ${result.status}`);
  }

  const selection = payload.selection;
  if (
    !selection ||
    !Array.isArray(selection.requestedLaneIds) ||
    !Array.isArray(selection.completedLaneIds)
  ) {
    errors.push('selection requested/completed lane ids are required');
  } else {
    const requested = selection.requestedLaneIds;
    const completed = selection.completedLaneIds;
    if (uniqueStrings(requested).length !== requested.length)
      errors.push('selection requested lane ids must be unique');
    if (uniqueStrings(completed).length !== completed.length)
      errors.push('selection completed lane ids must be unique');
    for (const id of [...requested, ...completed]) {
      if (!laneById.has(id)) errors.push(`selection references unknown lane id: ${id}`);
    }
    const actualCompleted = uniqueStrings(results.map(result => result && result.id));
    if (!sameJson(completed, actualCompleted))
      errors.push('selection.completedLaneIds must match result order');
    const expectedComplete = requested.every(id => actualCompleted.includes(id));
    if (selection.complete !== expectedComplete)
      errors.push('selection.complete does not match completed results');
  }

  const expectedSummary = summarizeResults(results);
  if (!sameJson(payload.summary, expectedSummary)) errors.push('summary does not match results');
  const expectedFinalStatus = resolveFinalStatus(expectedSummary, payload.selection?.complete === true);
  if (payload.finalStatus !== expectedFinalStatus) errors.push('finalStatus does not match summary');
  return errors;
}

function assertVerificationPayload(payload, options) {
  const errors = validateVerificationPayload(payload, options);
  if (errors.length) {
    throw new Error(`[verification-manifest] invalid payload\n- ${errors.join('\n- ')}`);
  }
  return payload;
}

function assertCompatibleVerificationState(payload, options) {
  try {
    return assertVerificationPayload(payload, options);
  } catch (error) {
    throw new Error(
      `${error.message}\n[verification-manifest] state cannot be resumed safely; reset it with npm run verify:closeout:state:reset`
    );
  }
}

module.exports = {
  RESULT_STATUSES,
  VERIFICATION_SCHEMA_VERSION,
  VERIFICATION_SOURCE_FILES,
  VERIFICATION_SOURCE_ROOTS,
  assertCompatibleVerificationState,
  assertVerificationPayload,
  canonicalJson,
  collectVerificationSourceFiles,
  createLaneCatalogIdentity,
  createLaneDigest,
  createVerificationContext,
  createVerificationPayload,
  createVerificationSourceIdentity,
  resolveFinalStatus,
  summarizeResults,
  validateVerificationPayload,
};
