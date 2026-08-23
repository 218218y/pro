import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

import { chromium, expect } from '@playwright/test';

import {
  happyPathMetricsWithoutErrors,
  requiredProjectActions,
  requiredRuntimeMetricMinimumCounts,
  requiredRuntimeMetrics,
  requiredRuntimeOutcomeCoverage,
  requiredRuntimeRecoverySequences,
  requiredRuntimeStatusTransitions,
} from '../tests/e2e/helpers/perf_contracts.js';
import {
  createCabinetDoorDrawerLayoutFixture,
  createCabinetDoorDrawerLayoutScenarioMatrix,
  readCabinetDoorDrawerLayoutProjectSubset,
} from '../tests/e2e/helpers/cabinet_door_drawer_layout_fixture.js';
import {
  attributeBrowserResponsivenessToSteps,
  createBrowserMetricSummaryFromEntries,
  createBrowserPerfBaseline,
  createBrowserPerfSessionArtifactCaptureState,
  createPerfDomainSummary,
  createPerfSummaryFromEntries,
  createRepeatedMetricPressureSummary,
  createBuildFlowPressureSummary,
  createBuildSummary,
  createDurationSampleSummary,
  createJourneyBuildPressureSummary,
  createJourneyResponsivenessSummary,
  createLongTaskRootCauseSummary,
  createStoreDebugSummary,
  createStoreFlowPressureSummary,
  createJourneyStoreSourceSummary,
  createUserJourneyDiagnosisSummary,
  createUserJourneySummary,
  rankStoreDebugSources,
  rankResponsivenessSteps,
  takeBrowserPerfSessionArtifactDelta,
  createRuntimeOutcomeCoverageSummary,
  createRuntimeRecoveryDebtSummary,
  createRuntimeRecoveryHangoverSummary,
  createRuntimeRecoverySequenceSummary,
  createRuntimeStatusTransitionSummary,
  createStateIntegritySummary,
  evaluateBrowserPerfBaseline,
  summarizeBrowserPerfResult,
} from './wp_browser_perf_support.js';
import { resolvePlaywrightChromiumLaunchOptions } from './wp_playwright_browser_support.js';
import { resolveNpmRunLaunchOptions } from './wp_npm_spawn_support.js';
import { resolveBrowserPerfBaselinePath } from './wp_browser_perf_paths.js';
import {
  areBrowserPerfFailuresConfirmationEligible,
  assertBrowserPerfStepNameAvailable,
  BROWSER_PERF_CONFIRMATION_CANDIDATES_ENV,
  BROWSER_PERF_CONFIRMATION_FLAG,
  createBrowserPerfMeasurementProfile,
  filterReproducedBrowserPerfFailures,
  parseBrowserPerfConfirmationCandidates,
  parseBrowserPerfTarget,
  resolveBrowserPerfTargetPaths,
  serializeBrowserPerfConfirmationCandidates,
} from './wp_browser_perf_targets.js';
import { BROWSER_PERF_REQUIRED_UX_METRICS } from './wp_browser_perf_ux_targets.js';

const projectRoot = process.cwd();
const measurementTarget = parseBrowserPerfTarget();
const reuseReleaseArtifact = process.argv.includes('--reuse-release-artifact');
const traceHeaderSketch = process.argv.includes('--trace-header-sketch');
const confirmationRun = process.argv.includes(BROWSER_PERF_CONFIRMATION_FLAG);
const confirmationCandidateIdentities = confirmationRun
  ? parseBrowserPerfConfirmationCandidates(process.env[BROWSER_PERF_CONFIRMATION_CANDIDATES_ENV])
  : [];
const measurementProfile = createBrowserPerfMeasurementProfile(measurementTarget);
const targetPaths = resolveBrowserPerfTargetPaths(projectRoot, measurementTarget);
const baseUrl = measurementTarget.baseUrl;
const browserPerfRoomId = `browser-perf-${measurementTarget.id}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const browserPerfRoomCredential = buildBrowserPerfRoomCredential(browserPerfRoomId);
const pageUrl = `${baseUrl}${measurementTarget.pagePath}#room=${encodeURIComponent(browserPerfRoomId)}&roomToken=${encodeURIComponent(browserPerfRoomCredential.token)}`;
const { latestJsonPath, latestMdPath, docPath } = targetPaths;
const headerSketchTracePath = path.join(
  projectRoot,
  '.artifacts',
  'browser-perf',
  measurementTarget.id,
  'header-sketch-trace.json'
);
const headerSketchTraceResultPath = path.join(
  projectRoot,
  '.artifacts',
  'browser-perf',
  measurementTarget.id,
  'header-sketch-trace-run.json'
);
const headerSketchTraceReportPath = path.join(
  projectRoot,
  '.artifacts',
  'browser-perf',
  measurementTarget.id,
  'header-sketch-trace-run.md'
);
const baselinePath = resolveBrowserPerfBaselinePath(projectRoot, measurementTarget.id);
const textureFixturePath = path.join(
  projectRoot,
  '.artifacts/browser-perf/fixtures/cabinet-variant-texture.png'
);

const USER_JOURNEYS = Object.freeze({
  bootAndShell: 'boot-and-shell',
  cabinetCoreAuthoring: 'cabinet-core-authoring',
  cabinetBuildVariants: 'cabinet-build-variants',
  cabinetDoorDrawerAuthoring: 'cabinet-door-drawer-authoring',
  exportAuthoring: 'export-authoring',
  settingsBackupResilience: 'settings-backup-resilience',
  cloudSyncControls: 'cloud-sync-controls',
  orderPdfLifecycle: 'order-pdf-lifecycle',
  projectRoundtrip: 'project-roundtrip',
  projectRecoveryProveout: 'project-recovery-proveout',
  adhesiveGlassFirstUse: 'adhesive-glass-first-use',
});

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function writeJson(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeText(filePath, value) {
  ensureDir(filePath);
  fs.writeFileSync(filePath, value, 'utf8');
}

async function startChromiumTrace(page) {
  const session = await page.context().newCDPSession(page);
  await session.send('Tracing.start', {
    categories: [
      'blink.user_timing',
      'cc',
      'devtools.timeline',
      'disabled-by-default-devtools.timeline',
      'disabled-by-default-devtools.timeline.frame',
      'gpu',
      'v8',
      'v8.execute',
    ].join(','),
    options: 'sampling-frequency=10000',
    transferMode: 'ReturnAsStream',
  });
  return session;
}

async function finishChromiumTrace(session, filePath) {
  const completed = new Promise(resolve => session.once('Tracing.tracingComplete', resolve));
  await session.send('Tracing.end');
  const event = await completed;
  const stream = event?.stream;
  if (typeof stream !== 'string' || !stream) {
    throw new Error('Chromium trace completed without a readable stream');
  }
  const chunks = [];
  try {
    let eof = false;
    while (!eof) {
      const response = await session.send('IO.read', { handle: stream });
      chunks.push(response.base64Encoded ? Buffer.from(response.data, 'base64') : Buffer.from(response.data));
      eof = response.eof === true;
    }
  } finally {
    await session.send('IO.close', { handle: stream }).catch(() => {});
    await session.detach().catch(() => {});
  }
  ensureDir(filePath);
  fs.writeFileSync(filePath, Buffer.concat(chunks));
}

function buildBrowserPerfRoomToken(expiresAtMs) {
  const encode = value => Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({ exp: Math.floor(expiresAtMs / 1000) })}.browser-perf-signature`;
}

function buildBrowserPerfRoomCredential(room) {
  const expiresAtMs = Date.now() + 7 * 86_400_000;
  return {
    room,
    token: buildBrowserPerfRoomToken(expiresAtMs),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

function ensureTextureFixture(filePath = textureFixturePath) {
  if (fs.existsSync(filePath)) return filePath;
  ensureDir(filePath);
  const pngBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAIAAAAmkwkpAAAAHUlEQVR4nGNkYGD4z8DAwMDA8J+BgYGBgYGBgQEAOw8CBf8kL9cAAAAASUVORK5CYII=';
  fs.writeFileSync(filePath, Buffer.from(pngBase64, 'base64'));
  return filePath;
}

async function waitForServer(url, timeoutMs = 20000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET' });
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  return false;
}

function startServer() {
  const launch = resolveNpmRunLaunchOptions(measurementTarget.serverScript);
  return spawn(launch.command, launch.args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: launch.shell,
  });
}

function runRequiredNpmScript(scriptName) {
  const launch = resolveNpmRunLaunchOptions(scriptName);
  const result = spawnSync(launch.command, launch.args, {
    cwd: projectRoot,
    stdio: 'inherit',
    env: process.env,
    shell: launch.shell,
  });
  if (result.status !== 0) {
    throw new Error(
      `[browser-perf] required npm script ${scriptName} failed with exit code ${String(result.status ?? 'unknown')}`
    );
  }
}

function runRegressionConfirmation(failures) {
  return spawnSync(process.execPath, [...process.argv.slice(1), BROWSER_PERF_CONFIRMATION_FLAG], {
    cwd: projectRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      [BROWSER_PERF_CONFIRMATION_CANDIDATES_ENV]: serializeBrowserPerfConfirmationCandidates(failures),
    },
  });
}

function readReleaseArtifactEvidence() {
  if (!targetPaths.releaseRoot) {
    throw new Error('[browser-perf] release target is missing its release root');
  }
  const versionPath = path.join(targetPaths.releaseRoot, 'version.json');
  if (!fs.existsSync(versionPath)) {
    throw new Error(`[browser-perf] release metadata missing after build: ${versionPath}`);
  }
  const metadata = JSON.parse(fs.readFileSync(versionPath, 'utf8'));
  const failures = [];
  if (metadata?.schema !== 'wardrobepro.release') failures.push('release schema is not wardrobepro.release');
  if (metadata?.bundle?.buildMode !== 'perf') failures.push('bundle.buildMode must be perf');
  if (metadata?.build?.observabilityMode !== 'perf') failures.push('build.observabilityMode must be perf');
  if (metadata?.build?.jsMinified !== true) failures.push('release JavaScript must be minified');
  if (metadata?.build?.htmlMinified !== true) failures.push('release HTML must be minified');
  if (metadata?.build?.cssMinified !== true) failures.push('release CSS must be minified');
  if (metadata?.cache?.assetsHashed !== true) failures.push('release assets must be content hashed');
  if (!metadata?.cache?.buildId) failures.push('release build id is missing');
  if (!metadata?.bundle?.sha256) failures.push('release bundle digest is missing');
  if (failures.length) {
    throw new Error(`[browser-perf] invalid release measurement artifact\n- ${failures.join('\n- ')}`);
  }
  return {
    kind: 'instrumented-release-artifact',
    root: measurementTarget.releaseRootRelativePath,
    schema: metadata.schema,
    buildId: metadata.cache.buildId,
    observabilityMode: metadata.build.observabilityMode,
    jsMinified: metadata.build.jsMinified,
    htmlMinified: metadata.build.htmlMinified,
    cssMinified: metadata.build.cssMinified,
    assetsHashed: metadata.cache.assetsHashed,
    bundleFile: metadata.bundle.file,
    bundleSha256: metadata.bundle.sha256,
    bundleBytes: metadata.bundle.bytes,
  };
}

function prepareMeasurementArtifact() {
  if (!measurementTarget.buildScript) {
    return {
      kind: 'vite-dev-source',
      observabilityMode: measurementTarget.observabilityMode,
      buildId: null,
    };
  }
  if (reuseReleaseArtifact) return readReleaseArtifactEvidence();
  runRequiredNpmScript(measurementTarget.buildScript);
  return readReleaseArtifactEvidence();
}

async function assertReleaseServerProvenance(artifact) {
  if (measurementTarget.id !== 'release') return;
  const response = await fetch(`${baseUrl}/version.json?wp_perf_probe=${Date.now()}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    throw new Error(`[browser-perf] release server metadata probe failed with HTTP ${response.status}`);
  }
  const served = await response.json();
  const servedBuildId = served?.cache?.buildId;
  const servedBundleSha256 = served?.bundle?.sha256;
  if (servedBuildId !== artifact.buildId || servedBundleSha256 !== artifact.bundleSha256) {
    throw new Error(
      '[browser-perf] static server is not serving the release artifact produced for this measurement run'
    );
  }
}

function stopServer(server) {
  if (!server) return;
  if (process.platform === 'win32' && Number.isFinite(Number(server.pid)) && Number(server.pid) > 0) {
    try {
      spawnSync('taskkill', ['/pid', String(server.pid), '/t', '/f'], {
        stdio: 'ignore',
        windowsHide: true,
      });
      return;
    } catch {
      // Fall through to the normal kill path.
    }
  }
  try {
    server.kill('SIGTERM');
  } catch {
    // ignore server shutdown failures
  }
}

async function installCloudSyncGatewayIsolation(context) {
  const rows = new Map();
  await context.route('**/functions/v1/wp-cloud-sync-room', async route => {
    const request = route.request();
    const method = String(request.method() || 'GET').toUpperCase();
    if (method === 'OPTIONS') {
      await route.fulfill({ status: 204, body: '' });
      return;
    }

    if (method !== 'POST') {
      await route.fulfill({ status: 405, contentType: 'application/json', body: '{"ok":false}' });
      return;
    }

    let body = {};
    try {
      const parsed = JSON.parse(String(request.postData() || '{}'));
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) body = parsed;
    } catch {}
    const action = typeof body.action === 'string' ? body.action : '';
    const room = typeof body.room === 'string' ? body.room : '';
    if (action === 'issue-public' || action === 'create-room' || action === 'renew-room') {
      const issuedRoom =
        action === 'issue-public'
          ? 'public'
          : action === 'renew-room'
            ? room
            : `room_perf_${Date.now().toString(36)}`;
      await route.fulfill({
        status: action === 'create-room' ? 201 : 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ok: true,
          credential: buildBrowserPerfRoomCredential(issuedRoom),
        }),
      });
      return;
    }
    if (action === 'read') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, row: rows.get(room) || null }),
      });
      return;
    }
    if (action === 'write') {
      const current = rows.get(room) || null;
      const expectedRevision = typeof body.expectedRevision === 'number' ? body.expectedRevision : -1;
      if ((current?.revision || 0) !== expectedRevision) {
        await route.fulfill({
          status: 409,
          contentType: 'application/json',
          body: JSON.stringify({ ok: false, code: 'revision_conflict', row: current }),
        });
        return;
      }
      const row = {
        room,
        payload: body.payload && typeof body.payload === 'object' ? body.payload : {},
        revision: expectedRevision + 1,
        updated_at: new Date().toISOString(),
        updated_by: typeof body.clientId === 'string' ? body.clientId : 'perf-client',
      };
      rows.set(room, row);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, row }),
      });
      return;
    }
    await route.fulfill({ status: 400, contentType: 'application/json', body: '{"ok":false}' });
  });
}

const BOOT_READY_TIMEOUT_MS = 45000;
const BOOT_READY_POLL_MS = 25;
const BOOT_OVERLAY_IDS = ['wpFatalOverlay', 'wpBootFatalOverlay', 'wp-fatal-overlay'];

function formatRuntimeIssueLines(runtimeIssues = {}) {
  const pageErrors = Array.isArray(runtimeIssues?.pageErrors) ? runtimeIssues.pageErrors.filter(Boolean) : [];
  const consoleErrors = Array.isArray(runtimeIssues?.consoleErrors)
    ? runtimeIssues.consoleErrors.filter(Boolean)
    : [];
  const lines = [];
  if (pageErrors.length) {
    lines.push(`pageErrors: ${pageErrors.slice(0, 3).join(' | ')}`);
  }
  if (consoleErrors.length) {
    lines.push(`consoleErrors: ${consoleErrors.slice(0, 3).join(' | ')}`);
  }
  return lines;
}

async function readBootReadinessState(page) {
  return await page.evaluate(overlayIds => {
    const body = document.body;
    const bodyClassName = typeof body?.className === 'string' ? body.className.trim() : '';
    const hasBodyClass = !!body?.classList?.contains('wp-ui-react');
    const hasReactRoot = !!document.querySelector('#reactSidebarRoot .wp-react');
    const hasViewerCanvas = !!document.querySelector('#viewer-container canvas');
    const stateFingerprint = window.__WP_PERF__?.getStateFingerprint?.() || {};
    const perfEntries = window.__WP_PERF__?.getEntries?.() || [];
    const readMilestoneMs = name => {
      for (let index = perfEntries.length - 1; index >= 0; index -= 1) {
        const entry = perfEntries[index];
        if (entry?.kind !== 'mark' || entry?.name !== name) continue;
        const timestamp = Number(entry.startTime);
        return Number.isFinite(timestamp) && timestamp >= 0 ? timestamp : null;
      }
      return null;
    };
    const shellVisibleAtMs = readMilestoneMs('boot.milestone.shell-visible');
    const operationalReadyAtMs = readMilestoneMs('boot.milestone.operational-ready');
    const autosaveReadyAtMs = readMilestoneMs('boot.milestone.autosave-ready');
    const bootReady = stateFingerprint.bootReady === true;
    const systemReady = stateFingerprint.systemReady === true;
    let overlayId = null;
    let overlayText = '';
    for (const id of overlayIds) {
      const overlay = document.getElementById(id);
      if (!overlay) continue;
      overlayId = id;
      overlayText = String(overlay.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1200);
      break;
    }
    return {
      bodyClassName,
      hasBodyClass,
      hasReactRoot,
      hasViewerCanvas,
      overlayId,
      overlayText,
      title: document.title || '',
      nowMs: Number(window.performance?.now?.()) || 0,
      sessionId: String(Number(window.performance?.timeOrigin) || 0),
      bootReady,
      systemReady,
      shellVisibleAtMs,
      operationalReadyAtMs,
      autosaveReadyAtMs,
      shellVisible: hasBodyClass && hasReactRoot && hasViewerCanvas && shellVisibleAtMs != null,
      operationalReady:
        hasBodyClass && hasReactRoot && hasViewerCanvas && bootReady && operationalReadyAtMs != null,
      autosaveReady:
        hasBodyClass &&
        hasReactRoot &&
        hasViewerCanvas &&
        bootReady &&
        systemReady &&
        autosaveReadyAtMs != null,
    };
  }, BOOT_OVERLAY_IDS);
}

function createBootReadinessError(state, runtimeIssues = {}, milestone = 'autosaveReady') {
  const reasons = [];
  if (!state?.hasBodyClass) reasons.push('body missing wp-ui-react');
  if (!state?.hasReactRoot) reasons.push('react sidebar root missing');
  if (!state?.hasViewerCanvas) reasons.push('viewer canvas missing');
  if (milestone !== 'shellVisible' && !state?.bootReady) reasons.push('lifecycle bootReady not reached');
  if (milestone === 'autosaveReady' && !state?.systemReady) {
    reasons.push('autosave runtime systemReady not reached');
  }
  const details = [
    `title=${JSON.stringify(state?.title || '')}`,
    `bodyClass=${JSON.stringify(state?.bodyClassName || '')}`,
    `overlay=${state?.overlayId || 'none'}`,
  ];
  if (state?.overlayText) details.push(`overlayText=${JSON.stringify(state.overlayText)}`);
  details.push(...formatRuntimeIssueLines(runtimeIssues));
  return new Error(
    `WardrobePro boot milestone ${milestone} was not reached (${reasons.join(', ') || 'unknown'}). ${details.join(' | ')}`
  );
}

async function waitForBootMilestone(
  page,
  result,
  milestone = 'autosaveReady',
  timeoutMs = BOOT_READY_TIMEOUT_MS
) {
  const startedAt = Date.now();
  let lastState = null;
  while (Date.now() - startedAt < timeoutMs) {
    lastState = await readBootReadinessState(page);
    if (lastState[milestone] === true) {
      if (milestone === 'shellVisible') {
        await page.evaluate(
          () => new Promise(resolve => window.requestAnimationFrame(() => resolve(undefined)))
        );
        lastState = await readBootReadinessState(page);
        if (lastState[milestone] !== true) continue;
      }
      return lastState;
    }
    if (lastState.overlayId) {
      throw createBootReadinessError(lastState, result?.runtimeIssues, milestone);
    }
    await page.waitForTimeout(BOOT_READY_POLL_MS);
  }
  throw createBootReadinessError(lastState, result?.runtimeIssues, milestone);
}

async function waitForBootReadiness(page, result, timeoutMs = BOOT_READY_TIMEOUT_MS) {
  return await waitForBootMilestone(page, result, 'autosaveReady', timeoutMs);
}

async function readBrowserStepClock(page) {
  return await page.evaluate(() => ({
    sessionId: String(Number(window.performance?.timeOrigin) || 0),
    nowMs: Number(window.performance?.now?.()) || 0,
  }));
}

function createBrowserStepTimingWindows(before, after) {
  if (before?.sessionId && before.sessionId === after?.sessionId) {
    return [
      {
        sessionId: before.sessionId,
        startTime: Number(before.nowMs) || 0,
        endTime: Number(after.nowMs) || 0,
      },
    ];
  }
  if (!after?.sessionId) return [];
  return [
    {
      sessionId: after.sessionId,
      startTime: 0,
      endTime: Number(after.nowMs) || 0,
    },
  ];
}

function alignBootStepTimingWindowsToMilestones(result, milestones) {
  const sessionId = String(milestones?.sessionId || '');
  const shellVisibleMs = Number(milestones?.shellVisibleMs);
  const operationalReadyMs = Number(milestones?.operationalReadyMs);
  const autosaveReadyMs = Number(milestones?.autosaveReadyMs);
  if (
    !sessionId ||
    !Number.isFinite(shellVisibleMs) ||
    !Number.isFinite(operationalReadyMs) ||
    !Number.isFinite(autosaveReadyMs) ||
    shellVisibleMs < 0 ||
    operationalReadyMs < shellVisibleMs ||
    autosaveReadyMs < operationalReadyMs
  ) {
    throw new Error('Browser perf boot milestone timestamps are missing or non-monotonic.');
  }

  const windowsByStep = new Map([
    ['boot.shell-visible', { startTime: 0, endTime: shellVisibleMs }],
    ['boot.operational-ready.wait', { startTime: shellVisibleMs, endTime: operationalReadyMs }],
    ['boot.autosave-ready.wait', { startTime: operationalReadyMs, endTime: autosaveReadyMs }],
  ]);
  for (const step of result.windowResponsivenessFlowSteps || []) {
    const window = windowsByStep.get(step?.name);
    if (!window) continue;
    step.timingWindows = [{ sessionId, ...window }];
  }
}

async function withStep(result, page, name, run, meta = {}) {
  if (!Array.isArray(result.windowStoreDebugFlowSteps)) result.windowStoreDebugFlowSteps = [];
  if (!Array.isArray(result.windowBuildDebugFlowSteps)) result.windowBuildDebugFlowSteps = [];
  if (!Array.isArray(result.windowResponsivenessFlowSteps)) result.windowResponsivenessFlowSteps = [];
  assertBrowserPerfStepNameAvailable(result.userFlow, name);
  const beforeStoreDebug = await readStoreDebugStats(page);
  const beforeBuildDebug = await readBuildDebugStats(page);
  const beforeClock = await readBrowserStepClock(page);
  const startedAt = Date.now();
  const runResult = await run();
  const durationMs = Date.now() - startedAt;
  result.userFlow[name] = durationMs;
  result.userFlowSteps.push({
    name,
    durationMs,
    journey: typeof meta?.journey === 'string' && meta.journey.trim() ? meta.journey.trim() : undefined,
    tags: Array.isArray(meta?.tags) ? meta.tags.map(value => String(value || '').trim()).filter(Boolean) : [],
  });
  const afterStoreDebug = await readStoreDebugStats(page);
  const afterBuildDebug = await readBuildDebugStats(page);
  const afterClock = await readBrowserStepClock(page);
  const stepMeta = {
    name,
    durationMs,
    journey: typeof meta?.journey === 'string' && meta.journey.trim() ? meta.journey.trim() : undefined,
    tags: Array.isArray(meta?.tags) ? meta.tags.map(value => String(value || '').trim()).filter(Boolean) : [],
  };
  result.windowStoreDebugFlowSteps.push({
    ...stepMeta,
    before: beforeStoreDebug,
    after: afterStoreDebug,
  });
  result.windowBuildDebugFlowSteps.push({
    ...stepMeta,
    before: beforeBuildDebug,
    after: afterBuildDebug,
  });
  result.windowResponsivenessFlowSteps.push({
    ...stepMeta,
    timingWindows: createBrowserStepTimingWindows(beforeClock, afterClock),
  });
  return runResult;
}

function perfEntryOverlapsTimingWindow(entry, timingWindow) {
  if (String(entry?.browserSessionId || '') !== String(timingWindow?.sessionId || '')) return false;
  const detail = entry?.detail && typeof entry.detail === 'object' ? entry.detail : {};
  const entryStart = Number(detail.startTime ?? entry?.startTime);
  const entryEnd = Number(detail.endTime ?? entry?.endTime);
  const windowStart = Number(timingWindow?.startTime);
  const windowEnd = Number(timingWindow?.endTime);
  return (
    Number.isFinite(entryStart) &&
    Number.isFinite(entryEnd) &&
    Number.isFinite(windowStart) &&
    Number.isFinite(windowEnd) &&
    Math.min(entryEnd, windowEnd) > Math.max(entryStart, windowStart)
  );
}

function summarizeStepBrowserMetric(result, stepName, metricName) {
  const step = (result.windowResponsivenessFlowSteps || []).find(row => row?.name === stepName);
  const timingWindows = Array.isArray(step?.timingWindows) ? step.timingWindows : [];
  const values = (result.windowPerfEntries || [])
    .filter(
      entry =>
        entry?.name === metricName &&
        entry?.kind === 'browser-metric' &&
        timingWindows.some(window => perfEntryOverlapsTimingWindow(entry, window))
    )
    .map(entry => Number(entry?.metricValue) || 0);
  return createDurationSampleSummary(values);
}

function createAdhesiveGlassFirstUseSummary(result, stepName) {
  const step = (result.windowResponsivenessFlowSteps || []).find(row => row?.name === stepName);
  return {
    longTasks: step?.delta?.longTasks || createDurationSampleSummary([]),
    renderer: summarizeStepBrowserMetric(result, stepName, 'render.frame.renderer'),
    frameTotal: summarizeStepBrowserMetric(result, stepName, 'render.frame.total'),
  };
}

function createBuilderExecutionRootCauseSummary(result) {
  const steps = Array.isArray(result.windowResponsivenessFlowSteps)
    ? result.windowResponsivenessFlowSteps
    : [];
  const entries = Array.isArray(result.windowPerfEntries) ? result.windowPerfEntries : [];
  return entries
    .filter(entry => entry?.name === 'builder.execute' && entry?.kind === 'phase')
    .map(entry => {
      const entryStart = Number(entry?.startTime) || 0;
      const entryEnd = Number(entry?.endTime) || entryStart;
      let owner = null;
      let ownerOverlapMs = 0;
      for (const step of steps) {
        for (const window of Array.isArray(step?.timingWindows) ? step.timingWindows : []) {
          if (String(entry?.browserSessionId || '') !== String(window?.sessionId || '')) continue;
          const overlapMs = Math.max(
            0,
            Math.min(entryEnd, Number(window?.endTime) || 0) -
              Math.max(entryStart, Number(window?.startTime) || 0)
          );
          if (overlapMs > ownerOverlapMs) {
            owner = step;
            ownerOverlapMs = overlapMs;
          }
        }
      }
      const detail = entry?.detail && typeof entry.detail === 'object' ? entry.detail : {};
      return {
        executionId: String(entry?.id || ''),
        reason: String(detail.reason || 'unknown'),
        durationMs: Number(entry?.codeExecutionMs) || Math.max(0, entryEnd - entryStart),
        overlapMs: ownerOverlapMs,
        journey: String(owner?.journey || 'unattributed'),
        step: String(owner?.name || 'unattributed'),
      };
    })
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 50);
}

async function installProjectActionRecorder(page) {
  await page.evaluate(() => {
    const win = window;
    win.__WP_PROJECT_ACTION_EVENTS__ = [];
    win.__WP_PROJECT_ACTION_EVENTS_GENERATION__ =
      Math.max(0, Number(win.__WP_PROJECT_ACTION_EVENTS_GENERATION__) || 0) + 1;
    if (win.__WP_PROJECT_ACTION_RECORDER_INSTALLED__) return;
    window.addEventListener('wardrobepro:project-action', event => {
      const detail = (event && event.detail) || {};
      win.__WP_PROJECT_ACTION_EVENTS__?.push({ ...detail });
    });
    win.__WP_PROJECT_ACTION_RECORDER_INSTALLED__ = true;
  });
}

async function waitForProjectAction(page, action, options = {}) {
  return await page.evaluate(
    ({ expectedAction, expectedPhase }) =>
      new Promise(resolve => {
        const timer = window.setTimeout(
          () => resolve({ action: expectedAction, ok: false, reason: 'timeout' }),
          10000
        );
        const onAction = event => {
          const detail = (event && event.detail) || {};
          if (detail.action !== expectedAction) return;
          if (expectedPhase && detail.phase !== expectedPhase) return;
          window.clearTimeout(timer);
          window.removeEventListener('wardrobepro:project-action', onAction);
          resolve(detail);
        };
        window.addEventListener('wardrobepro:project-action', onAction);
      }),
    { expectedAction: action, expectedPhase: options.phase }
  );
}

function runtimeDiagnosticKey(item) {
  if (!item || typeof item !== 'object') return JSON.stringify(item);
  const ctx = item.ctx && typeof item.ctx === 'object' ? item.ctx : {};
  const err = item.err && typeof item.err === 'object' ? item.err : {};
  return [item.ts || '', item.kind || '', ctx.where || '', ctx.op || '', err.message || ''].join('|');
}

function mergeRuntimeDiagnostics(existing, incoming, limit = 60) {
  const merged = [];
  const seen = new Set();
  for (const item of [
    ...(Array.isArray(existing) ? existing : []),
    ...(Array.isArray(incoming) ? incoming : []),
  ]) {
    const key = runtimeDiagnosticKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(item);
  }
  return merged.slice(-Math.max(1, limit));
}

function mergeBrowserMetrics(existing, incoming) {
  const before = existing && typeof existing === 'object' ? existing : {};
  const next = incoming && typeof incoming === 'object' ? incoming : {};
  // Browser-duration budgets describe one document's responsiveness. A perf scenario
  // may intentionally reload the page (for recovery coverage), so summing document
  // totals would make the metric scale with navigation count rather than product cost.
  // Keep the worst observed document for count/total/p95 while preserving the global max.
  const mergeDurationMetric = (left, right) => ({
    count: Math.max(Number(left?.count) || 0, Number(right?.count) || 0),
    totalMs: Math.max(Number(left?.totalMs) || 0, Number(right?.totalMs) || 0),
    maxMs: Math.max(Number(left?.maxMs) || 0, Number(right?.maxMs) || 0),
    p95Ms: Math.max(Number(left?.p95Ms) || 0, Number(right?.p95Ms) || 0),
    lastUpdatedAt: Math.max(Number(left?.lastUpdatedAt) || 0, Number(right?.lastUpdatedAt) || 0),
  });
  return {
    observerSupported: before.observerSupported === true || next.observerSupported === true,
    supportedEntryTypes: Array.from(
      new Set([
        ...(Array.isArray(before.supportedEntryTypes) ? before.supportedEntryTypes : []),
        ...(Array.isArray(next.supportedEntryTypes) ? next.supportedEntryTypes : []),
      ])
    ).sort((left, right) => String(left).localeCompare(String(right))),
    cls: {
      value: Math.max(Number(before.cls?.value) || 0, Number(next.cls?.value) || 0),
      entryCount: (Number(before.cls?.entryCount) || 0) + (Number(next.cls?.entryCount) || 0),
      lastUpdatedAt: Math.max(Number(before.cls?.lastUpdatedAt) || 0, Number(next.cls?.lastUpdatedAt) || 0),
    },
    lcp: {
      valueMs: Math.max(Number(before.lcp?.valueMs) || 0, Number(next.lcp?.valueMs) || 0),
      entryCount: (Number(before.lcp?.entryCount) || 0) + (Number(next.lcp?.entryCount) || 0),
      lastUpdatedAt: Math.max(Number(before.lcp?.lastUpdatedAt) || 0, Number(next.lcp?.lastUpdatedAt) || 0),
    },
    inp: (() => {
      const beforeValue = Number(before.inp?.valueMs) || 0;
      const nextValue = Number(next.inp?.valueMs) || 0;
      const winner = nextValue >= beforeValue ? next.inp || {} : before.inp || {};
      return {
        valueMs: Math.max(beforeValue, nextValue),
        interactionCount:
          (Number(before.inp?.interactionCount) || 0) + (Number(next.inp?.interactionCount) || 0),
        observedInteractionCount:
          (Number(before.inp?.observedInteractionCount) || 0) +
          (Number(next.inp?.observedInteractionCount) || 0),
        entryCount: (Number(before.inp?.entryCount) || 0) + (Number(next.inp?.entryCount) || 0),
        p98Rank: Number(winner.p98Rank) || 0,
        interactionId: Number(winner.interactionId) || 0,
        source: winner.source === 'event' || winner.source === 'first-input' ? winner.source : 'none',
        lastUpdatedAt: Math.max(Number(before.inp?.lastUpdatedAt) || 0, Number(next.inp?.lastUpdatedAt) || 0),
      };
    })(),
    longTasks: mergeDurationMetric(before.longTasks, next.longTasks),
    renderSettle: mergeDurationMetric(before.renderSettle, next.renderSettle),
  };
}

const SESSION_ARTIFACT_CAPTURE_STATE = Symbol('browserPerfSessionArtifactCaptureState');

function getSessionArtifactCaptureState(result) {
  const existing = result && result[SESSION_ARTIFACT_CAPTURE_STATE];
  if (existing && existing.entryOffsets instanceof Map && existing.eventOffsets instanceof Map) {
    return existing;
  }
  const created = createBrowserPerfSessionArtifactCaptureState();
  Object.defineProperty(result, SESSION_ARTIFACT_CAPTURE_STATE, {
    configurable: false,
    enumerable: false,
    writable: false,
    value: created,
  });
  return created;
}

function mergeCapturedBrowserMetrics(captureState) {
  let merged = null;
  for (const metrics of captureState.browserMetricsBySession.values()) {
    merged = mergeBrowserMetrics(merged, metrics);
  }
  return merged || {};
}

async function captureSessionArtifacts(page, result) {
  const [capture, diagnostics] = await Promise.all([
    page.evaluate(() => {
      const captured = window.__WP_BROWSER_PERF_ENTRIES__;
      const entries = Array.isArray(captured) ? captured.slice() : window.__WP_PERF__?.getEntries?.() || [];
      const events = Array.isArray(window.__WP_PROJECT_ACTION_EVENTS__)
        ? window.__WP_PROJECT_ACTION_EVENTS__.slice()
        : [];
      const timeOrigin = Number(window.performance?.timeOrigin) || 0;
      const eventGeneration = Math.max(0, Number(window.__WP_PROJECT_ACTION_EVENTS_GENERATION__) || 0);
      const sessionId = String(timeOrigin);
      return {
        sessionId,
        eventSessionId: `${sessionId}:project-actions:${eventGeneration}`,
        entries,
        events,
        browserMetrics: window.__WP_PERF__?.getBrowserMetrics?.() || null,
      };
    }),
    page.evaluate(() => window.__WP_PERF__?.getErrorHistory?.() || []),
  ]);
  const captureState = getSessionArtifactCaptureState(result);
  const sessionId = String(capture?.sessionId || 'unknown-session');
  const entries = takeBrowserPerfSessionArtifactDelta(
    captureState.entryOffsets,
    sessionId,
    capture?.entries
  ).map(entry => (entry && typeof entry === 'object' ? { ...entry, browserSessionId: sessionId } : entry));
  const eventSessionId = String(capture?.eventSessionId || `${sessionId}:project-actions:0`);
  const events = takeBrowserPerfSessionArtifactDelta(
    captureState.eventOffsets,
    eventSessionId,
    capture?.events
  );

  result.windowPerfEntries.push(...entries);
  result.projectActionEvents.push(...events);
  if (capture?.browserMetrics && typeof capture.browserMetrics === 'object') {
    captureState.browserMetricsBySession.set(sessionId, capture.browserMetrics);
    result.windowBrowserMetrics = mergeCapturedBrowserMetrics(captureState);
  }
  if (Array.isArray(diagnostics)) {
    const bucket = result.runtimeIssues || (result.runtimeIssues = {});
    bucket.diagnostics = mergeRuntimeDiagnostics(bucket.diagnostics, diagnostics, 60);
  }
}

async function readPerfSummary(page) {
  return await page.evaluate(() => {
    const summary = window.__WP_PERF__?.getSummary?.() || {};
    const captured = window.__WP_BROWSER_PERF_ENTRIES__;
    if (!Array.isArray(captured)) return summary;

    const counts = {};
    for (const entry of captured) {
      const name = typeof entry?.name === 'string' ? entry.name : '';
      if (name) counts[name] = (counts[name] || 0) + 1;
    }
    for (const [name, count] of Object.entries(counts)) {
      summary[name] = { ...(summary[name] || {}), count };
    }
    return summary;
  });
}

async function readPerfEntries(page, name) {
  return await page.evaluate(metricName => {
    const captured = window.__WP_BROWSER_PERF_ENTRIES__;
    if (!Array.isArray(captured)) return window.__WP_PERF__?.getEntries?.(metricName) || [];
    return captured.filter(entry => entry?.name === metricName);
  }, name);
}

async function readStoreDebugStats(page) {
  return await page.evaluate(() => window.__WP_PERF__?.getStoreDebugStats?.() || null);
}

async function resetStoreDebugStats(page) {
  return await page.evaluate(() => window.__WP_PERF__?.resetStoreDebugStats?.() || null);
}

async function readBuildDebugStats(page) {
  return await page.evaluate(() => window.__WP_PERF__?.getBuildDebugStats?.() || null);
}

async function readRendererInfoSnapshot(page) {
  return await page.evaluate(() => window.__WP_PERF__?.getRendererInfoSnapshot?.() || null);
}

async function readSceneContentSnapshot(page) {
  return await page.evaluate(() => window.__WP_PERF__?.getSceneContentSnapshot?.() || null);
}

async function resetBuildDebugStats(page) {
  return await page.evaluate(() => window.__WP_PERF__?.resetBuildDebugStats?.() || null);
}

async function waitForBuildExecutionAfter(page, beforeCount, label) {
  await expect
    .poll(async () => Number((await readBuildDebugStats(page))?.executeCount) || 0, {
      timeout: 5000,
      message: `${label} did not produce a builder execution`,
    })
    .toBeGreaterThan(beforeCount);
  await waitForTwoBrowserFrames(page);
}

async function setPressedButtonStateAndWaitForBuild(page, button, pressed, label) {
  const current = await readButtonPressed(button);
  if (current === pressed) return;
  const beforeCount = Number((await readBuildDebugStats(page))?.executeCount) || 0;
  await setPressedButtonState(button, pressed);
  await waitForBuildExecutionAfter(page, beforeCount, label);
}

async function readPerfStateFingerprint(page) {
  const fingerprint = await page.evaluate(() => window.__WP_PERF__?.getStateFingerprint?.() || null);
  if (!fingerprint) {
    throw new Error('Browser perf state fingerprint missing: expected __WP_PERF__.getStateFingerprint()');
  }
  return normalizeUiStateFingerprint(fingerprint);
}

async function readAdhesiveGlassDoorCounts(page) {
  const fingerprint = await page.evaluate(() => window.__WP_PERF__?.getStateFingerprint?.() || null);
  if (!fingerprint) {
    throw new Error('Browser perf state fingerprint missing while measuring adhesive glass');
  }
  return {
    black: normalizeCountValue(fingerprint.blackAdhesiveGlassDoorCount),
    frosted: normalizeCountValue(fingerprint.frostedAdhesiveGlassDoorCount),
  };
}

async function readClipboardWriteCount(page) {
  return await page.evaluate(() => {
    const writes = window.__WP_TEST_CLIPBOARD_WRITES__ || [];
    return Array.isArray(writes) ? writes.length : 0;
  });
}

function getVisibleProjectNameInput(page) {
  return page.locator('#reactSidebarRoot input[data-testid="project-name-input"]:visible').last();
}

async function fillProjectNameViaActiveInput(page, value) {
  await openMainTab(page, 'structure');
  const input = getVisibleProjectNameInput(page);
  await expect(input).toBeVisible();
  await input.fill(value);
  await input.blur();
  await expect(input).toHaveValue(value);
}

async function saveProjectViaHeader(page, saveName) {
  const downloadPromise = page.waitForEvent('download');
  const saveEventPromise = waitForProjectAction(page, 'save', { phase: 'settled' });
  await page.locator('button[data-testid="header-project-save-button"]').click();
  await expect(page.locator('#customPromptModal.open')).toBeVisible();
  await page.locator('#modalInput').fill(String(saveName || '').trim() || `browser-perf-save-${Date.now()}`);
  await page.locator('#modalConfirmBtn').click();
  const [download, detail] = await Promise.all([downloadPromise, saveEventPromise]);
  return {
    detail,
    path: await download.path(),
  };
}

async function loadProjectViaHeader(page, filePath) {
  const loadEventPromise = waitForProjectAction(page, 'load');
  await page.locator('button[data-testid="header-project-load-button"]').click();
  await page.locator('input[data-testid="header-project-load-input"]').setInputFiles(filePath);
  const detail = await loadEventPromise;
  await waitForUiSettledAfterProjectAction(page);
  return detail;
}

function createCabinetDoorDrawerLayoutFixtureFile(sourceProjectPath, scenario = 'mixed-layout') {
  const parsed = JSON.parse(fs.readFileSync(sourceProjectPath, 'utf8'));
  const { project, expectedFingerprint } = createCabinetDoorDrawerLayoutFixture(parsed, scenario);
  const fixturePath = path.join(
    projectRoot,
    '.artifacts/browser-perf/fixtures',
    `cabinet-door-drawer-layout-${scenario}.json`
  );
  writeText(fixturePath, `${JSON.stringify(project, null, 2)}\n`);
  return { fixturePath, expectedFingerprint, scenario };
}

function createCabinetDoorDrawerLayoutFixtureMatrixFiles(sourceProjectPath) {
  const parsed = JSON.parse(fs.readFileSync(sourceProjectPath, 'utf8'));
  return createCabinetDoorDrawerLayoutScenarioMatrix(parsed).map(
    ({ scenario, project, expectedFingerprint }) => {
      const fixturePath = path.join(
        projectRoot,
        '.artifacts/browser-perf/fixtures',
        `cabinet-door-drawer-layout-${scenario}.json`
      );
      writeText(fixturePath, `${JSON.stringify(project, null, 2)}\n`);
      return { fixturePath, expectedFingerprint, scenario };
    }
  );
}

function normalizeCountValue(value) {
  return Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
}

function normalizeUiStateFingerprint(fingerprint) {
  const projectName = typeof fingerprint?.projectName === 'string' ? fingerprint.projectName : '';
  const savedColorValues = Array.isArray(fingerprint?.savedColorValues)
    ? fingerprint.savedColorValues
        .map(value =>
          String(value || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right))
    : [];
  return {
    projectName,
    savedColorCount: savedColorValues.length,
    savedColorValues,
    wardrobeType: typeof fingerprint?.wardrobeType === 'string' ? fingerprint.wardrobeType : '',
    boardMaterial: typeof fingerprint?.boardMaterial === 'string' ? fingerprint.boardMaterial : '',
    doorStyle: typeof fingerprint?.doorStyle === 'string' ? fingerprint.doorStyle : '',
    groovesEnabled: !!fingerprint?.groovesEnabled,
    grooveLinesCount:
      fingerprint?.grooveLinesCount == null || fingerprint?.grooveLinesCount === ''
        ? null
        : Number.isFinite(Number(fingerprint?.grooveLinesCount))
          ? Math.max(1, Math.floor(Number(fingerprint.grooveLinesCount)))
          : null,
    splitDoors: !!fingerprint?.splitDoors,
    removeDoorsEnabled: !!fingerprint?.removeDoorsEnabled,
    internalDrawersEnabled: !!fingerprint?.internalDrawersEnabled,
    showContentsEnabled: !!fingerprint?.showContentsEnabled,
    groovesMapCount: normalizeCountValue(fingerprint?.groovesMapCount),
    grooveLinesCountMapCount: normalizeCountValue(fingerprint?.grooveLinesCountMapCount),
    splitDoorMapCount: normalizeCountValue(fingerprint?.splitDoorMapCount),
    splitDoorBottomMapCount: normalizeCountValue(fingerprint?.splitDoorBottomMapCount),
    removedDoorMapCount: normalizeCountValue(fingerprint?.removedDoorMapCount),
    doorTrimCount: normalizeCountValue(fingerprint?.doorTrimCount),
    drawerDividerCount: normalizeCountValue(fingerprint?.drawerDividerCount),
    internalDrawerPlacementCount: normalizeCountValue(fingerprint?.internalDrawerPlacementCount),
    externalDrawerSelectionCount: normalizeCountValue(fingerprint?.externalDrawerSelectionCount),
  };
}

function stableStateFingerprintText(fingerprint) {
  return JSON.stringify(normalizeUiStateFingerprint(fingerprint));
}

function withMergedSavedColorValues(current, imported) {
  const normalizedCurrent = normalizeUiStateFingerprint(current);
  const normalizedImported = normalizeUiStateFingerprint(imported);
  const savedColorValues = Array.from(
    new Set([...normalizedCurrent.savedColorValues, ...normalizedImported.savedColorValues])
  ).sort((left, right) => left.localeCompare(right));
  return {
    ...normalizedCurrent,
    savedColorCount: savedColorValues.length,
    savedColorValues,
  };
}

async function readUiStateFingerprint(page) {
  return await readPerfStateFingerprint(page);
}

function recordStateIntegrityCheck(result, name, expected, actual, options = {}) {
  const normalizedExpected = normalizeUiStateFingerprint(expected);
  const normalizedActual = normalizeUiStateFingerprint(actual);
  const ok =
    options.ok === false
      ? false
      : stableStateFingerprintText(normalizedExpected) === stableStateFingerprintText(normalizedActual);
  result.stateIntegrityChecks.push({
    name,
    ok,
    expected: normalizedExpected,
    actual: normalizedActual,
    ...(typeof options.detail === 'undefined' ? {} : { detail: options.detail }),
    ...(typeof options.message === 'string' && options.message.trim()
      ? { message: options.message.trim() }
      : {}),
  });
  if (!ok) {
    throw new Error(
      `${name} state integrity failed: expected=${stableStateFingerprintText(normalizedExpected)} actual=${stableStateFingerprintText(normalizedActual)}`
    );
  }
}

async function assertUiStateFingerprint(result, page, name, expected, message) {
  const actual = await readUiStateFingerprint(page);
  recordStateIntegrityCheck(result, name, expected, actual, { message });
  return actual;
}

async function assertPerfStateFingerprintSubset(result, page, name, expectedSubset, message) {
  const actual = await readUiStateFingerprint(page);
  const normalizedExpected = normalizeUiStateFingerprint(expectedSubset);
  const keys = Object.keys(expectedSubset || {}).filter(Boolean);
  const expected = Object.fromEntries(keys.map(key => [key, normalizedExpected[key]]));
  const actualSubset = Object.fromEntries(keys.map(key => [key, actual[key]]));
  const ok = JSON.stringify(actualSubset) === JSON.stringify(expected);
  result.stateIntegrityChecks.push({
    name,
    ok,
    expected,
    actual: actualSubset,
    ...(typeof message === 'string' && message.trim() ? { message: message.trim() } : {}),
  });
  if (!ok) {
    throw new Error(
      `${name} perf state subset integrity failed: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actualSubset)}`
    );
  }
  return actualSubset;
}

function readSavedProjectJson(projectPath) {
  return JSON.parse(fs.readFileSync(projectPath, 'utf8'));
}

function recordProjectPayloadIntegrityCheck(result, name, expected, actual, message) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  result.stateIntegrityChecks.push({
    name,
    ok,
    expected,
    actual,
    ...(typeof message === 'string' && message.trim() ? { message: message.trim() } : {}),
  });
  if (!ok) {
    throw new Error(
      `${name} project payload integrity failed: expected=${JSON.stringify(expected)} actual=${JSON.stringify(actual)}`
    );
  }
}

function assertSavedProjectPayloadSubset(result, name, projectPath, expectedProject, message) {
  const actualProject = readSavedProjectJson(projectPath);
  const expected = readCabinetDoorDrawerLayoutProjectSubset(expectedProject);
  const actual = readCabinetDoorDrawerLayoutProjectSubset(actualProject);
  recordProjectPayloadIntegrityCheck(result, name, expected, actual, message);
  return actual;
}

function getMainTabButton(page, id) {
  return page.locator(`#reactSidebarRoot .tab[role="button"][data-tab="${id}"]:visible`).last();
}

function getStickyEditModeToast(page) {
  return page.locator('#stickyStatusToast.active').first();
}

function getActiveTabPanel(page, id) {
  return page.locator(`#reactSidebarRoot .tab-content[data-tab="${id}"]`).last();
}

function getActiveTabPanelAnchor(page, id) {
  switch (id) {
    case 'structure':
      return page.locator('#reactSidebarRoot input[name="width"]:visible').last();
    case 'design':
      return page.locator('#reactSidebarRoot [data-testid="design-color-section"]:visible').first();
    case 'interior':
      return page.locator('#reactSidebarRoot .wp-r-intdrawer-toggle:visible').last();
    case 'settings':
      return page.locator('#reactSidebarRoot button[data-testid="export-snapshot-button"]:visible').last();
    default:
      return page.locator('#reactSidebarRoot .wp-react:visible').first();
  }
}

async function isLocatorVisible(locator) {
  if ((await locator.count()) === 0) return false;
  try {
    return await locator.first().isVisible();
  } catch {
    return false;
  }
}

async function clickMainTabButton(page, id) {
  const tab = getMainTabButton(page, id);
  await expect(tab).toBeVisible();
  try {
    await tab.click({ timeout: 5000 });
  } catch {
    await page.evaluate(
      () =>
        new Promise(resolve => {
          const finish = () => resolve();
          if (typeof window.requestAnimationFrame !== 'function') {
            queueMicrotask(finish);
            return;
          }
          window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
        })
    );
    await expect(tab).toBeVisible();
    await tab.click({ timeout: 5000 });
  }
}

async function openMainTab(page, id) {
  const tab = getMainTabButton(page, id);
  const anchor = getActiveTabPanelAnchor(page, id);
  await expect(tab).toBeVisible();

  const isReady = async () => await isLocatorVisible(anchor);

  if ((await tab.getAttribute('aria-pressed')) !== 'true' || !(await isReady())) {
    await clickMainTabButton(page, id);
  }
  await expect.poll(async () => await isReady()).toBe(true);
  await expect(anchor).toBeVisible();
}

async function waitForUiSettledAfterProjectAction(page) {
  await expect(page.locator('#viewer-container')).toBeVisible();
  await expect(page.locator('#viewer-container canvas').first()).toBeVisible();
  await expect(page.locator('#reactSidebarRoot')).toBeVisible();
  await expect(
    page.locator('#reactSidebarRoot .tab[role="button"][aria-pressed="true"]').first()
  ).toBeVisible();
  await expect(
    page.locator('#reactSidebarRoot .tab-content.active[aria-hidden="false"]').first()
  ).toBeVisible();
  await page.evaluate(
    () =>
      new Promise(resolve => {
        const finish = () => resolve();
        if (typeof window.requestAnimationFrame !== 'function') {
          queueMicrotask(finish);
          return;
        }
        window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
      })
  );
}

async function readAutosaveProjectName(page) {
  return await page.evaluate(() => {
    const raw = window.localStorage.getItem('wardrobe_autosave_latest');
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed?.projectName === 'string' ? parsed.projectName : null;
    } catch {
      return null;
    }
  });
}

async function waitForAutosaveProjectName(page, expectedProjectName, timeoutMs = 8000) {
  await expect
    .poll(async () => await readAutosaveProjectName(page), { timeout: timeoutMs })
    .toBe(expectedProjectName);
}

async function installClipboardCapture(page) {
  await page.addInitScript(() => {
    const win = window;
    win.__WP_TEST_CLIPBOARD_WRITES__ = [];
    try {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: {
          write: async items => {
            const list = Array.from(items || []);
            win.__WP_TEST_CLIPBOARD_WRITES__?.push({ count: list.length, at: Date.now() });
          },
        },
      });
    } catch {
      // ignore sandbox clipboard override failures
    }

    if (typeof win.ClipboardItem !== 'function') {
      class FakeClipboardItem {
        constructor(items) {
          this.items = items;
        }
      }

      Object.defineProperty(win, 'ClipboardItem', {
        configurable: true,
        writable: true,
        value: FakeClipboardItem,
      });
    }
  });
}

async function installPerfEntryCapture(page) {
  await page.addInitScript(() => {
    const win = window;
    win.__WP_BROWSER_PERF_ENTRIES__ = [];
    window.addEventListener('wardrobepro:perf-entry', event => {
      const entry = event?.detail;
      if (!entry || typeof entry !== 'object') return;
      win.__WP_BROWSER_PERF_ENTRIES__?.push(entry);
    });
  });
}

async function installInitialStorageReset(page) {
  await page.addInitScript(() => {
    try {
      const key = '__WP_BROWSER_PERF_STORAGE_RESET_DONE__';
      if (window.sessionStorage.getItem(key) === '1') return;
      // Perf runs must never inherit or mutate the shared/public cloud-sync room.
      // Start each browser session from a fully clean storage surface and rely on
      // the unique room query param for network isolation.
      window.localStorage.clear();
      window.sessionStorage.setItem(key, '1');
    } catch {
      // ignore storage reset failures; app boot will surface storage issues if they matter
    }
  });
}

async function runClipboardExportAction(page, buttonTestId, metricName) {
  await openMainTab(page, 'settings');
  const button = page.locator(`button[data-testid="${buttonTestId}"]`);
  await expect(button).toBeVisible();
  const before = await readClipboardWriteCount(page);
  await button.click();
  await expect.poll(async () => await readClipboardWriteCount(page)).toBeGreaterThan(before);
  await expectPerfMetricCount(page, metricName, 1);
}

async function expectPerfMetricCount(page, metricName, minCount) {
  await expect
    .poll(async () => {
      const summary = await readPerfSummary(page);
      return summary?.[metricName]?.count || 0;
    })
    .toBeGreaterThanOrEqual(minCount);
}

async function getCheckboxClickTarget(locator) {
  const label = locator.locator('xpath=ancestor::label[1]').first();
  if ((await label.count()) > 0) {
    await expect(label).toBeVisible();
    return label;
  }
  await expect(locator).toBeVisible();
  return locator;
}

async function setCheckboxState(locator, checked) {
  const current = await locator.isChecked();
  if (current === checked) return;
  const target = await getCheckboxClickTarget(locator);
  await target.click();
  if (checked) {
    await expect(locator).toBeChecked();
  } else {
    await expect(locator).not.toBeChecked();
  }
}

async function toggleCheckboxTwice(locator) {
  const before = await locator.isChecked();
  await setCheckboxState(locator, !before);
  await setCheckboxState(locator, before);
}

async function dismissStickyEditModeToastIfPresent(page) {
  const toast = getStickyEditModeToast(page);
  if ((await toast.count()) === 0) return;
  await toast.click();
  await expect(page.locator('#stickyStatusToast.active')).toHaveCount(0);
}

async function toggleCloudSyncFloatingPin(page) {
  const beforeCount = (await readPerfSummary(page))['cloudSync.floatingSync.toggle']?.count || 0;
  const pinButton = page.locator('button[data-testid="quick-actions-sync-pin-button"]').first();
  if ((await pinButton.count()) === 0 || !(await pinButton.isVisible())) {
    const dockToggle = page.locator('button[data-testid="quick-actions-toggle-button"]').first();
    await expect(dockToggle).toBeVisible();
    await dockToggle.click();
  }
  await expect(pinButton).toBeVisible();
  const before = await readButtonPressed(pinButton);
  await pinButton.click();
  if (before) {
    await expectButtonPressed(pinButton, false);
  } else {
    await expectButtonPressed(pinButton, true);
  }
  await expectPerfMetricCount(page, 'cloudSync.floatingSync.toggle', beforeCount + 1);
}

async function confirmActiveModal(page) {
  const modal = page.locator('#customPromptModal');
  await expect(modal).toBeVisible();
  const confirmButton = page.locator('#modalConfirmBtn');
  await expect(confirmButton).toBeVisible();
  await confirmButton.click();
  await expect.poll(async () => await modal.evaluate(node => node.classList.contains('open'))).toBe(false);
}

function normalizeDesignColorValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

async function readSavedDesignColorValues(page) {
  return (await readPerfStateFingerprint(page)).savedColorValues;
}

function bumpHexColorValue(value, offset) {
  const normalized = normalizeDesignColorValue(value);
  const match = /^#([0-9a-f]{6})$/.exec(normalized);
  if (!match) return normalized;
  const next = (Number.parseInt(match[1], 16) + offset) % 0x1000000;
  return `#${next.toString(16).padStart(6, '0')}`;
}

async function resolveUniqueDesignColorValue(page, value) {
  const existing = new Set(await readSavedDesignColorValues(page));
  const normalized = normalizeDesignColorValue(value);
  if (!existing.has(normalized)) return normalized;
  for (let offset = 1; offset <= 255; offset += 1) {
    const candidate = bumpHexColorValue(normalized, offset);
    if (candidate && !existing.has(candidate)) return candidate;
  }
  throw new Error(`Unable to resolve a unique saved design color from ${normalized}`);
}

async function setColorInputValue(input, value) {
  await input.evaluate((node, nextValue) => {
    const element = node;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (typeof setter === 'function') setter.call(element, String(nextValue || ''));
    else element.value = String(nextValue || '');
    element.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    element.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
  }, value);
  await expect(input).toHaveValue(value);
  await input.evaluate(
    () =>
      new Promise(resolve => {
        const finish = () => resolve();
        if (typeof window.requestAnimationFrame !== 'function') {
          queueMicrotask(finish);
          return;
        }
        window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
      })
  );
}

function getSavedDesignColorSwatch(page, value) {
  const normalized = normalizeDesignColorValue(value);
  return page.locator(
    `[data-testid="design-color-swatch-item"][data-color-kind="saved"][data-color-value="${normalized}"]`
  );
}

async function addSavedDesignColor(page, value) {
  await openMainTab(page, 'design');
  const normalized = await resolveUniqueDesignColorValue(page, value);
  const toggle = page.locator('button[data-testid="design-custom-color-toggle"]');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }

  const input = page.locator('input[data-testid="design-custom-color-input"]');
  await expect(input).toBeVisible();
  await setColorInputValue(input, normalized);
  await expect(page.locator('[data-testid="design-color-section"]:visible')).toHaveAttribute(
    'data-draft-color',
    normalized
  );

  const beforeCount = (await readPerfSummary(page))['design.savedColor.add']?.count || 0;
  const saveButton = page.locator('button[data-testid="design-custom-color-save-button"]');
  await expect(saveButton).toBeVisible();
  await saveButton.click();
  const modalInput = page.locator('#modalInput');
  await expect(modalInput).toBeVisible();
  await modalInput.fill(`Browser Perf ${normalized}`);
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'design.savedColor.add', beforeCount + 1);

  const swatch = getSavedDesignColorSwatch(page, normalized);
  await expect(swatch).toHaveCount(1);
  await swatch.click();
  await expect(page.locator('[data-testid="design-selected-color-delete-button"]')).toBeVisible();
  return normalized;
}

async function deleteSavedDesignColor(page, value) {
  await openMainTab(page, 'design');
  const swatch = getSavedDesignColorSwatch(page, value);
  await expect(swatch).toHaveCount(1);
  await swatch.click();

  const deleteButton = page.locator('button[data-testid="design-selected-color-delete-button"]');
  await expect(deleteButton).toBeVisible();
  const beforeCount = (await readPerfSummary(page))['design.savedColor.delete']?.count || 0;
  await deleteButton.click();
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'design.savedColor.delete', beforeCount + 1);
  await expect(swatch).toHaveCount(0);
}

function getStructureTypeRow(page) {
  return getActiveTabPanel(page, 'structure')
    .locator('[data-testid="structure-type-row"], .wp-r-wardrobe-type-row')
    .first();
}

function getBoardMaterialRow(page) {
  return getActiveTabPanel(page, 'structure')
    .locator('[data-testid="structure-board-material-row"], .wp-r-wardrobe-material-row')
    .first();
}

async function resolveStructureTypeButton(page, type) {
  const panel = getActiveTabPanel(page, 'structure');
  const preferred = panel.locator(
    `button[data-testid="structure-type-${type}-button"], button[data-structure-type="${type}"]`
  );
  if ((await preferred.count()) > 0) return preferred.first();

  const label = type === 'hinged' ? 'פתיחה' : 'הזזה';
  const byRole = getStructureTypeRow(page).getByRole('button', { name: label, exact: true });
  if ((await byRole.count()) > 0) return byRole.first();

  return getStructureTypeRow(page)
    .locator('button')
    .nth(type === 'hinged' ? 0 : 1);
}

async function resolveBoardMaterialButton(page, material) {
  const panel = getActiveTabPanel(page, 'structure');
  const preferred = panel.locator(
    `button[data-testid="structure-board-material-${material}-button"], button[data-board-material="${material}"]`
  );
  if ((await preferred.count()) > 0) return preferred.first();

  const label = material === 'sandwich' ? "סנדביץ'" : 'מלמין';
  const byRole = getBoardMaterialRow(page).getByRole('button', { name: label, exact: true });
  if ((await byRole.count()) > 0) return byRole.first();

  return getBoardMaterialRow(page)
    .locator('button')
    .nth(material === 'sandwich' ? 0 : 1);
}

async function getStructureDimensionInput(page, key) {
  await openMainTab(page, 'structure');
  return getActiveTabPanel(page, 'structure').locator(`input[name="${key}"]`).first();
}

async function setStructureDimension(page, key, value) {
  const input = await getStructureDimensionInput(page, key);
  const expectedValue = String(Math.round(value));
  await expect(input).toBeVisible();
  await input.fill(expectedValue);
  await input.blur();
  await expect(input).toHaveValue(expectedValue);
}

async function readStructureDimensions(page) {
  const widthInput = await getStructureDimensionInput(page, 'width');
  const heightInput = await getStructureDimensionInput(page, 'height');
  const depthInput = await getStructureDimensionInput(page, 'depth');
  const [widthValue, heightValue, depthValue] = await Promise.all([
    widthInput.inputValue(),
    heightInput.inputValue(),
    depthInput.inputValue(),
  ]);
  return {
    width: Number(widthValue) || 0,
    height: Number(heightValue) || 0,
    depth: Number(depthValue) || 0,
  };
}

async function setStructureType(page, type) {
  await openMainTab(page, 'structure');
  const button = await resolveStructureTypeButton(page, type);
  await clickButtonAndExpectSelected(button);
}

async function setBoardMaterial(page, material) {
  await openMainTab(page, 'structure');
  const button = await resolveBoardMaterialButton(page, material);
  await clickButtonAndExpectSelected(button);
}

function getDoorStyleSection(page) {
  return getActiveTabPanel(page, 'design').locator('[data-testid="design-door-style-section"]').first();
}

function getDoorFeaturesSection(page) {
  return getActiveTabPanel(page, 'design').locator('[data-testid="design-door-features-section"]').first();
}

function getInteriorPanel(page) {
  return page.locator('#reactSidebarRoot .tab-content[data-tab="interior"]:visible').last();
}

function getInteriorExternalDrawersCard(page) {
  return page.locator('#reactSidebarRoot [data-testid="interior-external-drawers-card"]:visible').last();
}

function getInteriorInternalDrawersCard(page) {
  return page.locator('#reactSidebarRoot [data-testid="interior-internal-drawers-card"]:visible').last();
}

function readDoorFeatureToggleTestId(key) {
  return key === 'groovesEnabled'
    ? 'design-grooves-toggle'
    : key === 'splitDoors'
      ? 'design-split-doors-toggle'
      : 'design-remove-doors-toggle';
}

function getDoorFeatureToggleInput(page, key) {
  return getDoorFeaturesSection(page)
    .locator(`input[data-testid="${readDoorFeatureToggleTestId(key)}"]`)
    .first();
}

function readDoorAuthoringModeButtonTestId(key) {
  return key === 'groove'
    ? 'design-groove-mode-button'
    : key === 'split'
      ? 'design-split-mode-button'
      : key === 'split-custom'
        ? 'design-split-custom-mode-button'
        : 'design-remove-door-mode-button';
}

function getDoorAuthoringModeButton(page, key) {
  return getDoorFeaturesSection(page)
    .locator(`button[data-testid="${readDoorAuthoringModeButtonTestId(key)}"]`)
    .first();
}

function getInternalDrawersToggleInput(page) {
  return page
    .locator(
      '#reactSidebarRoot .tab-content[data-tab="interior"]:visible input[data-testid="interior-internal-drawers-toggle"]'
    )
    .last();
}

function getInternalDrawersModeButton(page) {
  return getInteriorInternalDrawersCard(page)
    .locator('button[data-testid="interior-internal-drawers-mode-button"]')
    .first();
}

function getExternalDrawerTypeButton(page, type) {
  return page
    .locator(`#reactSidebarRoot button[data-testid="interior-external-drawers-${type}-button"]:visible`)
    .last();
}

function getExternalDrawerCountButton(page, count) {
  return page
    .locator(
      `#reactSidebarRoot button[data-testid="interior-external-drawers-count-${count}-button"]:visible`
    )
    .last();
}

function normalizeOptionButtonText(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function readSelectedButtonValue(buttons, attributeName, fallback = {}) {
  const result = await buttons.evaluateAll(
    (nodes, payload) => {
      const buttonsOnly = nodes.filter(node => node instanceof HTMLElement);
      const selectedIndex = buttonsOnly.findIndex(node => {
        const ariaPressed = node.getAttribute('aria-pressed');
        return (
          ariaPressed === 'true' || node.classList.contains('selected') || node.classList.contains('active')
        );
      });
      const fallbackIndex = selectedIndex >= 0 ? selectedIndex : buttonsOnly.length === 1 ? 0 : -1;
      const target = fallbackIndex >= 0 ? buttonsOnly[fallbackIndex] : null;
      if (!target) return { attr: '', text: '', index: fallbackIndex };
      return {
        attr: String(target.getAttribute(String(payload.attributeName)) || '').trim(),
        text: String(target.textContent || '')
          .replace(/\s+/g, ' ')
          .trim(),
        index: fallbackIndex,
      };
    },
    { attributeName }
  );
  if (result.attr) return String(result.attr);

  const normalizedText = normalizeOptionButtonText(result.text);
  if (normalizedText && fallback.byText) {
    const mapped = fallback.byText[normalizedText];
    if (mapped) return mapped;
  }
  if (result.index >= 0 && fallback.byIndex?.[result.index]) {
    return String(fallback.byIndex[result.index] || '');
  }
  return '';
}

async function readOptionalCheckboxState(input) {
  return (await input.count()) > 0 ? await input.first().isChecked() : false;
}

function getHeaderSketchToggle(page) {
  return page.locator('button[data-testid="header-sketch-toggle-button"]').first();
}

function getViewerNoteDrawModeButton(page) {
  return page.locator('button[data-testid="viewer-note-draw-mode-button"]').first();
}

function getViewerNotesVisibilityButton(page) {
  return page.locator('button[data-testid="viewer-notes-visibility-button"]').first();
}

function getViewerContentsToggleButton(page) {
  return page.locator('button[data-testid="viewer-contents-toggle-button"]').first();
}

async function readButtonPressed(button) {
  await expect(button).toBeVisible();
  return (await button.getAttribute('aria-pressed')) === 'true';
}

async function expectButtonPressed(button, expected) {
  await expect(button).toHaveAttribute('aria-pressed', expected ? 'true' : 'false');
}

async function setPressedButtonState(button, pressed) {
  const current = await readButtonPressed(button);
  if (current === pressed) return;
  await button.click();
  await expectButtonPressed(button, pressed);
}

async function togglePressedButtonTwice(button) {
  const before = await readButtonPressed(button);
  await setPressedButtonState(button, !before);
  await setPressedButtonState(button, before);
}

async function setHeaderSketchMode(page, enabled) {
  await setPressedButtonState(getHeaderSketchToggle(page), enabled);
}

async function readHeaderSketchMode(page) {
  return await readButtonPressed(getHeaderSketchToggle(page));
}

async function toggleViewerNoteDrawMode(page) {
  const button = getViewerNoteDrawModeButton(page);
  const before = await readButtonPressed(button);
  await button.click();
  await expectButtonPressed(button, !before);
  if (!before) {
    await expect(page.locator('#notes-overlay')).toBeVisible();
    await expectButtonPressed(getViewerNotesVisibilityButton(page), true);
  }
}

async function toggleViewerNoteDrawModeTwice(page) {
  await toggleViewerNoteDrawMode(page);
  await toggleViewerNoteDrawMode(page);
}

async function toggleViewerNotesVisibilityTwice(page) {
  await togglePressedButtonTwice(getViewerNotesVisibilityButton(page));
}

async function waitForTwoBrowserFrames(page) {
  await page.evaluate(
    () =>
      new Promise(resolve => {
        const requestFrame = window.requestAnimationFrame;
        if (typeof requestFrame !== 'function') {
          queueMicrotask(resolve);
          return;
        }
        requestFrame(() => requestFrame(() => resolve(undefined)));
      })
  );
}

async function selectAdhesiveGlassPaintBrush(page, kind) {
  await openMainTab(page, 'design');
  const panel = getActiveTabPanel(page, 'design');
  const multiColorRow = panel.locator('.toggle-row').filter({ hasText: 'צביעה ותוסף לכל חלק בנפרד' }).first();
  const enabledToggle = multiColorRow.locator('input[type="checkbox"]').first();
  await expect(enabledToggle).toHaveCount(1);
  await setCheckboxState(enabledToggle, true);

  const swatch = panel
    .getByRole('button', { name: kind === 'black' ? 'זכוכית שחורה' : 'זכוכית חלבית', exact: true })
    .first();
  await expect(swatch).toBeVisible();
  await swatch.click();
  await expect.poll(async () => await isButtonSelected(swatch)).toBe(true);
  await waitForTwoBrowserFrames(page);
}

async function clickCanvasAtNdc(page, point) {
  const canvas = page.locator('#viewer-container canvas').first();
  await expect(canvas).toBeVisible();
  const box = await canvas.boundingBox();
  if (!box || !(box.width > 0) || !(box.height > 0)) {
    throw new Error('Adhesive-glass first-use probe could not resolve the viewer canvas bounds');
  }
  await canvas.click({
    position: {
      x: ((point.x + 1) / 2) * box.width,
      y: ((1 - point.y) / 2) * box.height,
    },
  });
  await waitForTwoBrowserFrames(page);
}

async function applyAdhesiveGlassViaCanvas(page, kind, preferredPoint = null) {
  await selectAdhesiveGlassPaintBrush(page, kind);
  const before = await readAdhesiveGlassDoorCounts(page);
  const candidates = preferredPoint
    ? [preferredPoint]
    : [
        { x: 0, y: 0.15 },
        { x: -0.25, y: 0.15 },
        { x: 0.25, y: 0.15 },
        { x: -0.5, y: 0.15 },
        { x: 0.5, y: 0.15 },
        { x: 0, y: 0.45 },
        { x: -0.25, y: 0.45 },
        { x: 0.25, y: 0.45 },
        { x: -0.5, y: 0.45 },
        { x: 0.5, y: 0.45 },
        { x: 0, y: -0.15 },
        { x: -0.25, y: -0.15 },
        { x: 0.25, y: -0.15 },
      ];

  for (const point of candidates) {
    await clickCanvasAtNdc(page, point);
    const counts = await readAdhesiveGlassDoorCounts(page);
    if (kind === 'black' ? counts.black > before.black : counts.frosted > before.frosted) {
      return { point, counts };
    }
  }
  throw new Error(
    `Adhesive-glass first-use probe could not apply ${kind} glass: before=${JSON.stringify(before)}`
  );
}

async function isButtonSelected(button) {
  if ((await button.count()) === 0) return false;
  return await button.first().evaluate(node => {
    const className = String(node.getAttribute('class') || '');
    const ariaPressed = node.getAttribute('aria-pressed');
    return (
      /\bselected\b/.test(className) ||
      /\bis-selected\b/.test(className) ||
      /\bactive\b/.test(className) ||
      ariaPressed === 'true'
    );
  });
}

async function clickButtonAndExpectSelected(button) {
  await expect(button).toBeVisible();
  if (!(await isButtonSelected(button))) {
    await button.click();
  }
  await expect.poll(async () => await isButtonSelected(button)).toBe(true);
}

async function setDoorStyle(page, style) {
  await openMainTab(page, 'design');
  const optionId = style === 'post' ? 'flat' : style;
  const section = getDoorStyleSection(page);
  await expect(section).toBeVisible();
  const preferred = section
    .locator(
      `button[data-testid="design-door-style-${optionId}-button"], button[data-option-id="${optionId}"]`
    )
    .first();
  const button =
    (await preferred.count()) > 0
      ? preferred
      : section
          .getByRole('button', {
            name: style === 'post' ? 'פוסט' : style === 'profile' ? 'פרופיל' : 'פרופיל כפול',
            exact: true,
          })
          .first();
  await clickButtonAndExpectSelected(button);
}

async function setDoorFeatureToggle(page, key, enabled) {
  await openMainTab(page, 'design');
  await setCheckboxState(getDoorFeatureToggleInput(page, key), enabled);
}

async function setGrooveLinesCount(page, value) {
  await openMainTab(page, 'design');
  const input = getDoorFeaturesSection(page)
    .locator('input[data-testid="design-groove-lines-input"]')
    .first();
  await expect(input).toHaveCount(1);
  const nextValue = value == null ? '' : String(Math.max(1, Math.floor(Number(value) || 0)));
  await input.fill(nextValue);
  await input.blur();
  await expect(input).toHaveValue(nextValue);
}

async function setDoorAuthoringMode(page, key, active) {
  await openMainTab(page, 'design');
  const button = getDoorAuthoringModeButton(page, key);
  await expect(button).toBeVisible();
  const isActive = /\bselected\b/.test(String((await button.getAttribute('class')) || ''));
  if (isActive !== active) {
    await button.click();
  }
  await expect
    .poll(async () => /\bselected\b/.test(String((await button.getAttribute('class')) || '')))
    .toBe(active);
  if (!active) await dismissStickyEditModeToastIfPresent(page);
}

async function setInternalDrawersEnabled(page, enabled) {
  await openMainTab(page, 'interior');
  await setCheckboxState(getInternalDrawersToggleInput(page), enabled);
}

async function setInternalDrawerMode(page, active) {
  await openMainTab(page, 'interior');
  const card = getInteriorInternalDrawersCard(page);
  await expect(card).toBeVisible();
  const button = getInternalDrawersModeButton(page);
  await expect(button).toBeVisible();
  const isActive = /\bselected\b/.test(String((await button.getAttribute('class')) || ''));
  if (isActive !== active) {
    await button.click();
  }
  await expect
    .poll(async () => /\bis-active\b/.test(String((await card.getAttribute('class')) || '')))
    .toBe(active);
  if (!active) await dismissStickyEditModeToastIfPresent(page);
}

async function setExternalDrawerSelection(page, type, count, options = {}) {
  await openMainTab(page, 'interior');
  const card = getInteriorExternalDrawersCard(page);
  await expect(card).toBeVisible();
  const typeButton = getExternalDrawerTypeButton(page, type);
  await expect(typeButton).toBeVisible();
  await typeButton.click();
  await expect
    .poll(async () => /\bis-active\b/.test(String((await card.getAttribute('class')) || '')))
    .toBe(true);
  if (type === 'regular' && Number.isFinite(Number(count)) && Number(count) > 0) {
    const countButton = getExternalDrawerCountButton(page, Math.floor(Number(count)));
    await expect(countButton).toBeVisible();
    await countButton.click();
    await expect(countButton).toHaveClass(/\bis-selected\b/);
  }
  if (options?.exitAfterSelect) {
    const exitButtons = card.locator('button[data-testid="interior-external-drawers-exit-button"]');
    const inactiveNotice = card.locator('.wp-r-note').first();
    if ((await exitButtons.count()) > 0) {
      const exitButton = exitButtons.first();
      await expect(exitButton).toBeVisible();
      await exitButton.click();
    }
    await dismissStickyEditModeToastIfPresent(page);
    await expect
      .poll(async () => {
        const className = String((await card.getAttribute('class')) || '');
        return !/\bis-active\b/.test(className) || (await isLocatorVisible(inactiveNotice));
      })
      .toBe(true);
    await expect(exitButtons).toHaveCount(0);
  }
}

async function readCabinetDoorDrawerAuthoringFingerprint(page) {
  const readOptionalLocatorClass = async locator => {
    if ((await locator.count()) === 0) return '';
    return String((await locator.first().getAttribute('class')) || '');
  };

  await openMainTab(page, 'design');
  const section = getDoorFeaturesSection(page);
  const grooveLinesInput = section.locator('input[data-testid="design-groove-lines-input"]').first();
  const grooveLinesValue =
    (await grooveLinesInput.count()) > 0 ? String(await grooveLinesInput.inputValue()).trim() : '';
  const groovesEnabled = await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'groovesEnabled'));
  const splitDoors = await readOptionalCheckboxState(getDoorFeatureToggleInput(page, 'splitDoors'));
  const removeDoorsEnabled = await readOptionalCheckboxState(
    getDoorFeatureToggleInput(page, 'removeDoorsEnabled')
  );
  const grooveModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'groove'))
  );
  const splitModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'split'))
  );
  const splitCustomModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'split-custom'))
  );
  const removeDoorModeActive = /\bselected\b/.test(
    await readOptionalLocatorClass(getDoorAuthoringModeButton(page, 'remove-door'))
  );

  await openMainTab(page, 'interior');
  const extCard = getInteriorExternalDrawersCard(page);
  const intCard = getInteriorInternalDrawersCard(page);
  const shoeTypeSelected = /\bselected\b/.test(
    await readOptionalLocatorClass(getExternalDrawerTypeButton(page, 'shoe'))
  );
  const regularTypeSelected = /\bselected\b/.test(
    await readOptionalLocatorClass(getExternalDrawerTypeButton(page, 'regular'))
  );
  let extDrawerCount = null;
  if (regularTypeSelected) {
    for (const count of [1, 2, 3, 4, 5, 6]) {
      const className = await readOptionalLocatorClass(getExternalDrawerCountButton(page, count));
      if (/\bis-selected\b/.test(className)) {
        extDrawerCount = count;
        break;
      }
    }
  }

  return {
    groovesEnabled,
    grooveLinesCount: grooveLinesValue
      ? Math.max(1, Math.floor(Number(grooveLinesValue) || 0)) || null
      : null,
    grooveModeActive,
    splitDoors,
    splitModeActive,
    splitCustomModeActive,
    removeDoorsEnabled,
    removeDoorModeActive,
    internalDrawersEnabled: await readOptionalCheckboxState(getInternalDrawersToggleInput(page)),
    internalDrawerModeActive: /\bis-active\b/.test(await readOptionalLocatorClass(intCard)),
    extDrawerModeActive: /\bis-active\b/.test(await readOptionalLocatorClass(extCard)),
    extDrawerType: shoeTypeSelected ? 'shoe' : regularTypeSelected ? 'regular' : '',
    extDrawerCount,
  };
}

function normalizeCabinetDoorDrawerAuthoringFingerprint(fingerprint) {
  return {
    groovesEnabled: !!fingerprint?.groovesEnabled,
    grooveLinesCount:
      fingerprint?.grooveLinesCount == null || fingerprint?.grooveLinesCount === ''
        ? null
        : Number.isFinite(Number(fingerprint?.grooveLinesCount))
          ? Math.max(1, Math.floor(Number(fingerprint.grooveLinesCount)))
          : null,
    grooveModeActive: !!fingerprint?.grooveModeActive,
    splitDoors: !!fingerprint?.splitDoors,
    splitModeActive: !!fingerprint?.splitModeActive,
    splitCustomModeActive: !!fingerprint?.splitCustomModeActive,
    removeDoorsEnabled: !!fingerprint?.removeDoorsEnabled,
    removeDoorModeActive: !!fingerprint?.removeDoorModeActive,
    internalDrawersEnabled: !!fingerprint?.internalDrawersEnabled,
    internalDrawerModeActive: !!fingerprint?.internalDrawerModeActive,
    extDrawerModeActive: !!fingerprint?.extDrawerModeActive,
    extDrawerType: typeof fingerprint?.extDrawerType === 'string' ? fingerprint.extDrawerType.trim() : '',
    extDrawerCount:
      fingerprint?.extDrawerCount == null || fingerprint?.extDrawerCount === ''
        ? null
        : Number.isFinite(Number(fingerprint?.extDrawerCount))
          ? Math.max(1, Math.floor(Number(fingerprint.extDrawerCount)))
          : null,
  };
}

async function assertCabinetDoorDrawerAuthoringFingerprint(result, page, name, expected, message) {
  const actual = normalizeCabinetDoorDrawerAuthoringFingerprint(
    await readCabinetDoorDrawerAuthoringFingerprint(page)
  );
  const normalizedExpected = normalizeCabinetDoorDrawerAuthoringFingerprint(expected);
  const ok = JSON.stringify(actual) === JSON.stringify(normalizedExpected);
  result.stateIntegrityChecks.push({
    name,
    ok,
    expected: normalizedExpected,
    actual,
    ...(typeof message === 'string' && message.trim() ? { message: message.trim() } : {}),
  });
  if (!ok) {
    throw new Error(
      `${name} cabinet door/drawer authoring state integrity failed: expected=${JSON.stringify(normalizedExpected)} actual=${JSON.stringify(actual)}`
    );
  }
  return actual;
}

async function readSavedDesignSwatchMeta(page) {
  await openMainTab(page, 'design');
  const items = await page
    .locator('[data-testid="design-color-swatch-item"][data-color-kind="saved"]')
    .evaluateAll(nodes =>
      nodes.map(node => {
        const el = node;
        const dot = el.querySelector('.color-dot-swatch');
        const style = dot instanceof HTMLElement ? String(dot.getAttribute('style') || '') : '';
        const title = el instanceof HTMLElement ? String(el.getAttribute('title') || '') : '';
        return {
          id: String(el?.dataset?.colorId || '').trim(),
          value: String(el?.dataset?.colorValue || '')
            .trim()
            .toLowerCase(),
          style,
          title,
          selected:
            String(el?.dataset?.selected || '')
              .trim()
              .toLowerCase() === 'true',
        };
      })
    );
  return items.filter(item => item.id);
}

function classifySavedDesignSwatchKind(item) {
  const style = String(item?.style || '').toLowerCase();
  const value = String(item?.value || '')
    .trim()
    .toLowerCase();
  if (style.includes('url(') || (!value && style.includes('background-image'))) return 'texture';
  if (value) return 'color';
  return 'saved';
}

async function readSelectedDesignSwatchMeta(page) {
  const items = await readSavedDesignSwatchMeta(page);
  const selected = items.find(item => item.selected) || null;
  if (!selected) return null;
  return {
    ...selected,
    kind: classifySavedDesignSwatchKind(selected),
    title: String(selected.title || '')
      .replace(/\s+\(גרור לשינוי סדר\)\s*$/u, '')
      .trim(),
  };
}

async function selectSavedDesignSwatchById(page, swatchId) {
  await openMainTab(page, 'design');
  const targetId = String(swatchId || '').trim();
  if (!targetId) throw new Error('Saved design swatch id is required');
  const swatch = page
    .locator(`[data-testid="design-color-swatch-item"][data-color-id="${targetId}"]`)
    .first();
  await expect(swatch).toHaveCount(1);
  await swatch.click();
  await expect(swatch).toHaveAttribute('data-selected', 'true');
}

async function addSavedDesignTexture(page, textureFilePath, name = `Texture ${Date.now()}`) {
  await openMainTab(page, 'design');
  const beforeItems = await readSavedDesignSwatchMeta(page);
  const beforeIds = new Set(beforeItems.map(item => item.id));
  const toggle = page.locator('button[data-testid="design-custom-color-toggle"]');
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
  const uploadInput = page.locator('#wp-r-texture-upload');
  await uploadInput.setInputFiles(textureFilePath);
  await expect(page.locator('.wp-r-upload-ok')).toBeVisible();
  const beforeCount = (await readPerfSummary(page))['design.savedColor.add']?.count || 0;
  const saveButton = getActiveTabPanel(page, 'design')
    .locator('button[data-testid="design-custom-color-save-button"]:visible')
    .last();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(saveButton).toBeVisible();
  await saveButton.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise(resolve => {
        const finish = () => resolve();
        if (typeof window.requestAnimationFrame !== 'function') {
          queueMicrotask(finish);
          return;
        }
        window.requestAnimationFrame(() => window.requestAnimationFrame(finish));
      })
  );
  await saveButton.click();
  const modalInput = page.locator('#modalInput');
  await expect(modalInput).toBeVisible();
  await modalInput.fill(name);
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'design.savedColor.add', beforeCount + 1);
  const afterItems = await readSavedDesignSwatchMeta(page);
  const created = afterItems.find(item => !beforeIds.has(item.id));
  if (!created) throw new Error('Saved texture swatch was not created');
  const swatch = page
    .locator(`[data-testid="design-color-swatch-item"][data-color-id="${created.id}"]`)
    .first();
  await expect(swatch).toHaveCount(1);
  await swatch.click();
  await expect(page.locator('[data-testid="design-selected-color-delete-button"]')).toBeVisible();
  return created;
}

async function readBuildOptionFingerprint(page) {
  await openMainTab(page, 'structure');
  const wardrobeType =
    (await page.locator('.wp-r-wardrobe-type-row button.selected .wp-r-btn-label').first().textContent()) ||
    '';
  const boardMaterial =
    (await page
      .locator('.wp-r-wardrobe-material-row button.selected .wp-r-btn-label')
      .first()
      .textContent()) || '';
  await openMainTab(page, 'design');
  const doorStyle =
    (await getDoorStyleSection(page).locator('button[aria-pressed="true"]').first().textContent()) || '';
  return {
    wardrobeType: String(wardrobeType || '').trim(),
    boardMaterial: String(boardMaterial || '').trim(),
    doorStyle: String(doorStyle || '').trim(),
  };
}

async function readCabinetCoreFingerprint(page) {
  const uiState = await readUiStateFingerprint(page);
  const dimensions = await readStructureDimensions(page);
  const buildOptions = await readBuildOptionFingerprint(page);
  const savedSwatches = await readSavedDesignSwatchMeta(page);
  const selectedSwatch = await readSelectedDesignSwatchMeta(page);
  const sketchModeEnabled = await readHeaderSketchMode(page);
  return {
    ...uiState,
    ...dimensions,
    ...buildOptions,
    sketchModeEnabled,
    savedTextureCount: savedSwatches.filter(item => classifySavedDesignSwatchKind(item) === 'texture').length,
    selectedSavedSwatchKind: selectedSwatch?.kind || 'none',
    selectedSavedSwatchName: typeof selectedSwatch?.title === 'string' ? selectedSwatch.title : '',
    selectedSavedSwatchId: typeof selectedSwatch?.id === 'string' ? selectedSwatch.id : '',
  };
}

function normalizeCabinetCoreFingerprint(fingerprint) {
  const base = normalizeUiStateFingerprint(fingerprint);
  return {
    ...base,
    width: Number(fingerprint?.width) || 0,
    height: Number(fingerprint?.height) || 0,
    depth: Number(fingerprint?.depth) || 0,
    wardrobeType: typeof fingerprint?.wardrobeType === 'string' ? fingerprint.wardrobeType.trim() : '',
    boardMaterial: typeof fingerprint?.boardMaterial === 'string' ? fingerprint.boardMaterial.trim() : '',
    doorStyle: typeof fingerprint?.doorStyle === 'string' ? fingerprint.doorStyle.trim() : '',
    sketchModeEnabled: !!fingerprint?.sketchModeEnabled,
    savedTextureCount: Number(fingerprint?.savedTextureCount) || 0,
    selectedSavedSwatchKind:
      typeof fingerprint?.selectedSavedSwatchKind === 'string' && fingerprint.selectedSavedSwatchKind.trim()
        ? fingerprint.selectedSavedSwatchKind.trim()
        : 'none',
    selectedSavedSwatchName:
      typeof fingerprint?.selectedSavedSwatchName === 'string'
        ? fingerprint.selectedSavedSwatchName.trim()
        : '',
    selectedSavedSwatchId:
      typeof fingerprint?.selectedSavedSwatchId === 'string' ? fingerprint.selectedSavedSwatchId.trim() : '',
  };
}

async function assertCabinetCoreFingerprint(result, page, name, expected, message) {
  const normalizedExpected = normalizeCabinetCoreFingerprint(expected);
  const actual = normalizeCabinetCoreFingerprint(await readCabinetCoreFingerprint(page));
  const ok = JSON.stringify(normalizedExpected) === JSON.stringify(actual);
  result.stateIntegrityChecks.push({
    name,
    ok,
    expected: normalizedExpected,
    actual,
    ...(typeof message === 'string' && message.trim() ? { message: message.trim() } : {}),
  });
  if (!ok) {
    throw new Error(
      `${name} cabinet core state integrity failed: expected=${JSON.stringify(normalizedExpected)} actual=${JSON.stringify(actual)}`
    );
  }
}

async function runCabinetCoreMixedEditBurst(page) {
  const selectedBefore = await readSelectedDesignSwatchMeta(page);
  const cycleColors = ['#5a6c7d', '#7b5a45'];
  const targets = [
    { width: 205, height: 244, depth: 61, sketch: false },
    { width: 212, height: 251, depth: 64, sketch: true },
  ];

  for (let index = 0; index < targets.length; index += 1) {
    const target = targets[index];
    await setStructureDimension(page, 'width', target.width);
    await setStructureDimension(page, 'height', target.height);
    await setStructureDimension(page, 'depth', target.depth);
    const colorValue = await addSavedDesignColor(page, cycleColors[index]);
    await expect(getSavedDesignColorSwatch(page, colorValue)).toHaveCount(1);
    await setHeaderSketchMode(page, target.sketch);
    await deleteSavedDesignColor(page, colorValue);
    await expect(getSavedDesignColorSwatch(page, colorValue)).toHaveCount(0);
  }

  await setStructureDimension(page, 'width', 195);
  await setStructureDimension(page, 'height', 247);
  await setStructureDimension(page, 'depth', 62);
  if (selectedBefore?.id) {
    await selectSavedDesignSwatchById(page, selectedBefore.id);
  }
  await setHeaderSketchMode(page, true);
}

async function runCabinetBuildVariantAuthoringMatrix(page, canonicalVariant) {
  if (!canonicalVariant || typeof canonicalVariant !== 'object') {
    throw new Error('Canonical cabinet build variant state is required for the authoring matrix');
  }

  await setStructureType(page, 'sliding');
  await setBoardMaterial(page, 'melamine');
  await setDoorStyle(page, 'double_profile');
  await setHeaderSketchMode(page, false);
  await setStructureDimension(page, 'width', 188);
  await setStructureDimension(page, 'height', 239);
  await setStructureDimension(page, 'depth', 60);

  await setStructureType(page, 'hinged');
  await setBoardMaterial(page, 'melamine');
  await setDoorStyle(page, 'post');
  await setHeaderSketchMode(page, true);
  await setStructureDimension(page, 'width', 201);
  await setStructureDimension(page, 'height', 249);
  await setStructureDimension(page, 'depth', 63);

  await setStructureType(page, canonicalVariant.wardrobeType === 'הזזה' ? 'sliding' : 'hinged');
  await setBoardMaterial(page, canonicalVariant.boardMaterial === 'מלמין' ? 'melamine' : 'sandwich');
  await setDoorStyle(
    page,
    canonicalVariant.doorStyle === 'פרופיל'
      ? 'profile'
      : canonicalVariant.doorStyle === 'פרופיל כפול'
        ? 'double_profile'
        : 'post'
  );
  if (canonicalVariant.textureSwatchId) {
    await selectSavedDesignSwatchById(page, canonicalVariant.textureSwatchId);
  }
  await setHeaderSketchMode(page, !!canonicalVariant.sketchModeEnabled);
  await setStructureDimension(page, 'width', Number(canonicalVariant.width) || 195);
  await setStructureDimension(page, 'height', Number(canonicalVariant.height) || 247);
  await setStructureDimension(page, 'depth', Number(canonicalVariant.depth) || 62);
}

async function runCabinetBuildOptionPressureBurst(page, canonicalVariant) {
  if (!canonicalVariant || typeof canonicalVariant !== 'object') {
    throw new Error('Canonical cabinet build variant state is required for the option pressure burst');
  }

  const combos = [
    {
      type: 'sliding',
      material: 'melamine',
      style: 'double_profile',
      sketch: false,
      width: 186,
      height: 238,
      depth: 60,
    },
    { type: 'hinged', material: 'melamine', style: 'post', sketch: true, width: 201, height: 249, depth: 63 },
    {
      type: 'sliding',
      material: 'sandwich',
      style: 'profile',
      sketch: false,
      width: 209,
      height: 252,
      depth: 64,
    },
  ];

  for (const combo of combos) {
    await setStructureType(page, combo.type);
    await setBoardMaterial(page, combo.material);
    await setDoorStyle(page, combo.style);
    await setHeaderSketchMode(page, combo.sketch);
    await setStructureDimension(page, 'width', combo.width);
    await setStructureDimension(page, 'height', combo.height);
    await setStructureDimension(page, 'depth', combo.depth);
  }

  await setStructureType(page, canonicalVariant.wardrobeType === 'הזזה' ? 'sliding' : 'hinged');
  await setBoardMaterial(page, canonicalVariant.boardMaterial === 'מלמין' ? 'melamine' : 'sandwich');
  await setDoorStyle(
    page,
    canonicalVariant.doorStyle === 'פרופיל'
      ? 'profile'
      : canonicalVariant.doorStyle === 'פרופיל כפול'
        ? 'double_profile'
        : 'post'
  );
  if (canonicalVariant.textureSwatchId) {
    await selectSavedDesignSwatchById(page, canonicalVariant.textureSwatchId);
  }
  await setHeaderSketchMode(page, !!canonicalVariant.sketchModeEnabled);
  await setStructureDimension(page, 'width', Number(canonicalVariant.width) || 195);
  await setStructureDimension(page, 'height', Number(canonicalVariant.height) || 247);
  await setStructureDimension(page, 'depth', Number(canonicalVariant.depth) || 62);
}

async function runProjectPersistenceRecoveryBurst(
  page,
  savedProjectPath,
  expectedCabinetCoreState,
  savedName
) {
  if (!savedProjectPath) throw new Error('Saved project file missing before persistence recovery burst');

  async function mutateAwayFromSavedState(seed) {
    await openMainTab(page, 'structure');
    const nameInput = getVisibleProjectNameInput(page);
    const mutatedProjectName = `${savedName} ${seed}`;
    await nameInput.fill(mutatedProjectName);
    await nameInput.blur();
    if (expectedCabinetCoreState) {
      await setStructureDimension(page, 'width', Math.max(90, Number(expectedCabinetCoreState.width) + 11));
      await setStructureDimension(page, 'height', Math.max(120, Number(expectedCabinetCoreState.height) - 5));
      await setStructureDimension(page, 'depth', Math.max(35, Number(expectedCabinetCoreState.depth) + 4));
      await setHeaderSketchMode(page, !expectedCabinetCoreState.sketchModeEnabled);
    }
    const tempColor = `#${String((Date.now() + seed.length) % 0xffffff)
      .padStart(6, '0')
      .slice(-6)}`;
    const savedColorValue = await addSavedDesignColor(page, tempColor);
    await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
    return mutatedProjectName;
  }

  await mutateAwayFromSavedState('persistence-load-drift');
  const loadEventPromise = waitForProjectAction(page, 'load');
  await page.locator('button[data-testid="header-project-load-button"]').click();
  await page.locator('input[data-testid="header-project-load-input"]').setInputFiles(savedProjectPath);
  const loadDetail = await loadEventPromise;
  if (!loadDetail || loadDetail.ok !== true) {
    throw new Error(`Persistence recovery load failed: ${JSON.stringify(loadDetail)}`);
  }
  await openMainTab(page, 'structure');
  await expect(getVisibleProjectNameInput(page)).toHaveValue(savedName);

  const persistenceRestoreDriftName = await mutateAwayFromSavedState('persistence-restore-drift');
  await waitForAutosaveProjectName(page, persistenceRestoreDriftName);
  await seedAutosaveStorage(page, savedProjectPath);
  const restoreEventPromise = waitForProjectAction(page, 'restore-last-session');
  await openMainTab(page, 'structure');
  await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
  await confirmRestoreLastSessionModalWithAutosave(page, savedProjectPath);
  const restoreDetail = await restoreEventPromise;
  if (!restoreDetail || restoreDetail.ok !== true) {
    throw new Error(`Persistence recovery restore failed: ${JSON.stringify(restoreDetail)}`);
  }
  await openMainTab(page, 'structure');
  await expect(getVisibleProjectNameInput(page)).toHaveValue(savedName);
}

async function importSettingsBackupFromFile(page, filePath) {
  await openMainTab(page, 'settings');
  const importButton = page.locator('button[data-testid="settings-backup-import-button"]');
  const importInput = page.locator('input[data-testid="settings-backup-import-input"]');
  await expect(importButton).toBeVisible();
  await expect(importInput).toHaveCount(1);
  const beforeCount = (await readPerfSummary(page))['settingsBackup.import']?.count || 0;
  await importButton.click();
  await importInput.setInputFiles(filePath);
  await confirmActiveModal(page);
  await expectPerfMetricCount(page, 'settingsBackup.import', beforeCount + 1);
}

async function seedAutosaveStorage(page, filePath) {
  const payloadText = fs.readFileSync(filePath, 'utf8');
  await page.evaluate(text => window.localStorage.setItem('wardrobe_autosave_latest', text), payloadText);
}

async function prepareRestoreLastSessionScenario(page, result, savedProjectPath) {
  if (!savedProjectPath) throw new Error('Saved project file missing before restore-last-session');
  await seedAutosaveStorage(page, savedProjectPath);
  // Recovery setup must exercise a fresh document, but reload/boot/autosave preparation is not
  // part of the restore interaction budget itself.
  await page.reload({ waitUntil: 'domcontentloaded' });
  await installProjectActionRecorder(page);
  await waitForBootReadiness(page, result);
  await openMainTab(page, 'structure');

  const restoreNameInput = getVisibleProjectNameInput(page);
  const mutatedProjectName = `Mutated ${Date.now()}`;
  await restoreNameInput.fill(mutatedProjectName);
  await restoreNameInput.blur();
  await expect(restoreNameInput).toHaveValue(mutatedProjectName);
  // Project-name commits are intentionally uiOnly/noAutosave. Keep the seeded autosave
  // authoritative while the live UI drifts, then measure restoring that saved snapshot.
  await seedAutosaveStorage(page, savedProjectPath);
  return restoreNameInput;
}

async function confirmRestoreLastSessionModalWithAutosave(page, filePath) {
  await expect(page.locator('#customPromptModal')).toBeVisible();
  await seedAutosaveStorage(page, filePath);
  await confirmActiveModal(page);
}

(async () => {
  const updateBaseline = process.argv.includes('--update-baseline');
  const enforce = process.argv.includes('--enforce');
  const measurementArtifact = prepareMeasurementArtifact();
  let server = null;
  const serverReady = await waitForServer(pageUrl, 1500);
  if (!serverReady) {
    server = startServer();
    const ok = await waitForServer(pageUrl, 40000);
    if (!ok) throw new Error(`Failed to start ${measurementTarget.label} server`);
  }
  await assertReleaseServerProvenance(measurementArtifact);

  const browserSupport = resolvePlaywrightChromiumLaunchOptions();
  const browser = await chromium.launch({ headless: true, ...browserSupport.launchOptions });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await installCloudSyncGatewayIsolation(context);
  const page = await context.newPage();
  await installInitialStorageReset(page);
  await installClipboardCapture(page);
  await installPerfEntryCapture(page);

  const result = {
    version: 15,
    generatedAt: new Date().toISOString(),
    measurementProfile,
    measurementArtifact,
    executionEnvironment: {
      platform: process.platform,
      osRelease: os.release(),
      architecture: process.arch,
      cpuModel: os.cpus()[0]?.model || 'unknown',
      logicalCpuCount: os.cpus().length,
      totalMemoryBytes: os.totalmem(),
      nodeVersion: process.version,
      browserVersion: browser.version(),
      browserSource: browserSupport.browserSource,
      headless: true,
      viewport: { width: 1280, height: 800 },
      cachePolicy: 'fresh-browser-context-per-run',
      testSequence: 'wp_browser_perf_smoke.v15',
    },
    browserPerfRoomId,
    cloudSyncRestIsolated: true,
    userFlow: {},
    userFlowSteps: [],
    userJourneySummary: {},
    journeyStoreSourceSummary: {},
    userJourneyDiagnosisSummary: {},
    windowPerfSummary: {},
    windowPerfEntries: [],
    windowPerfPressureSummary: {},
    windowPerfDomainSummary: {},
    windowPerfOutcomeSummary: {},
    windowPerfRecoverySequenceSummary: {},
    windowPerfRecoveryDebtSummary: {},
    windowPerfRecoveryHangoverSummary: {},
    windowBrowserMetrics: {},
    windowStoreDebugStats: null,
    windowStoreDebugSummary: {},
    windowStoreDebugTopSources: [],
    windowStoreDebugFlowSteps: [],
    windowStoreFlowPressureSummary: {},
    windowBuildDebugFlowSteps: [],
    windowResponsivenessFlowSteps: [],
    windowResponsivenessUnattributed: { longTasks: [], renderSettle: [] },
    topLongTaskSteps: [],
    longTaskRootCauseSummary: [],
    builderExecutionRootCauseSummary: [],
    journeyResponsivenessSummary: {},
    adhesiveGlassFirstUse: {},
    headerSketchRendererProbe: {},
    viewerContentsProbe: {},
    bootMilestones: {},
    windowBuildFlowPressureSummary: {},
    journeyBuildPressureSummary: {},
    stateIntegrityChecks: [],
    stateIntegritySummary: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [], diagnostics: [] },
    projectActionEvents: [],
    browserSource: browserSupport.browserSource,
    clipboardWrites: 0,
  };

  page.on('pageerror', error => {
    result.runtimeIssues.pageErrors.push(String(error));
  });
  page.on('console', message => {
    if (message.type() === 'error') result.runtimeIssues.consoleErrors.push(message.text());
  });

  try {
    const shellState = await withStep(
      result,
      page,
      'boot.shell-visible',
      async () => {
        await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
        await installProjectActionRecorder(page);
        await expect(page.locator('#viewer-container')).toBeVisible();
        return await waitForBootMilestone(page, result, 'shellVisible');
      },
      { journey: USER_JOURNEYS.bootAndShell, tags: ['boot', 'shell'] }
    );
    const operationalState = await withStep(
      result,
      page,
      'boot.operational-ready.wait',
      async () => await waitForBootMilestone(page, result, 'operationalReady'),
      { journey: USER_JOURNEYS.bootAndShell, tags: ['boot', 'operational-readiness'] }
    );
    const autosaveState = await withStep(
      result,
      page,
      'boot.autosave-ready.wait',
      async () => await waitForBootMilestone(page, result, 'autosaveReady'),
      { journey: USER_JOURNEYS.bootAndShell, tags: ['boot', 'autosave-readiness'] }
    );
    result.bootMilestones = {
      sessionId: autosaveState?.sessionId || operationalState?.sessionId || shellState?.sessionId || null,
      shellVisibleMs: Number(shellState?.shellVisibleAtMs) || 0,
      operationalReadyMs: Number(operationalState?.operationalReadyAtMs) || 0,
      autosaveReadyMs: Number(autosaveState?.autosaveReadyAtMs) || 0,
    };
    result.userFlow['boot.shell-visible'] = result.bootMilestones.shellVisibleMs;
    result.userFlow['boot.operational-ready'] = result.bootMilestones.operationalReadyMs;
    result.userFlow['boot.autosave-ready'] = result.bootMilestones.autosaveReadyMs;
    alignBootStepTimingWindowsToMilestones(result, result.bootMilestones);
    await resetStoreDebugStats(page);
    await resetBuildDebugStats(page);
    result.windowStoreDebugFlowSteps = [];
    result.windowBuildDebugFlowSteps = [];

    await withStep(
      result,
      page,
      'export.settings-tab.open',
      async () => {
        await openMainTab(page, 'settings');
      },
      { journey: USER_JOURNEYS.bootAndShell, tags: ['navigation', 'settings'] }
    );

    const settingsRoot = page.locator('.tab-content[data-tab="settings"]');
    const globalClickToggle = settingsRoot.locator('input[data-testid="toggle-global-click"]');
    await withStep(
      result,
      page,
      'settings.visual.global-click.roundtrip',
      async () => {
        await toggleCheckboxTwice(globalClickToggle);
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['settings', 'visual', 'toggle'] }
    );

    const headerTraceSession = traceHeaderSketch ? await startChromiumTrace(page) : null;
    try {
      await withStep(
        result,
        page,
        'header.sketch-mode.roundtrip',
        async () => {
          const button = getHeaderSketchToggle(page);
          const beforePressed = await readButtonPressed(button);
          const before = await readRendererInfoSnapshot(page);
          await setPressedButtonStateAndWaitForBuild(
            page,
            button,
            !beforePressed,
            'header sketch first toggle'
          );
          const afterToggle = await readRendererInfoSnapshot(page);
          await setPressedButtonStateAndWaitForBuild(
            page,
            button,
            beforePressed,
            'header sketch restore toggle'
          );
          const afterSettled = await readRendererInfoSnapshot(page);
          result.headerSketchRendererProbe = { beforePressed, before, afterToggle, afterSettled };
        },
        { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['header', 'visual', 'sketch'] }
      );
    } finally {
      if (headerTraceSession) {
        await finishChromiumTrace(headerTraceSession, headerSketchTracePath);
        console.log(`[browser-perf] header sketch trace: ${headerSketchTracePath}`);
      }
    }

    await withStep(
      result,
      page,
      'viewer.notes.draw-mode.roundtrip',
      async () => {
        await toggleViewerNoteDrawModeTwice(page);
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['viewer', 'notes', 'draw-mode'] }
    );

    await withStep(
      result,
      page,
      'viewer.notes.visibility.roundtrip',
      async () => {
        await toggleViewerNotesVisibilityTwice(page);
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['viewer', 'notes', 'visibility'] }
    );

    await withStep(
      result,
      page,
      'viewer.contents.visibility.roundtrip',
      async () => {
        const button = getViewerContentsToggleButton(page);
        const beforePressed = await readButtonPressed(button);
        const beforeFingerprint = await readPerfStateFingerprint(page);
        const before = {
          pressed: beforePressed,
          showContentsEnabled: beforeFingerprint.showContentsEnabled === true,
          snapshot: await readSceneContentSnapshot(page),
        };
        await setPressedButtonStateAndWaitForBuild(
          page,
          button,
          !beforePressed,
          'viewer contents first toggle'
        );
        const toggledFingerprint = await readPerfStateFingerprint(page);
        const afterToggle = {
          pressed: !beforePressed,
          showContentsEnabled: toggledFingerprint.showContentsEnabled === true,
          snapshot: await readSceneContentSnapshot(page),
        };
        await setPressedButtonStateAndWaitForBuild(
          page,
          button,
          beforePressed,
          'viewer contents restore toggle'
        );
        const restoredFingerprint = await readPerfStateFingerprint(page);
        const afterSettled = {
          pressed: beforePressed,
          showContentsEnabled: restoredFingerprint.showContentsEnabled === true,
          snapshot: await readSceneContentSnapshot(page),
        };
        const snapshots = [before, afterToggle, afterSettled];
        result.viewerContentsProbe = {
          beforePressed,
          samples: snapshots,
          enabled: snapshots.find(item => item.showContentsEnabled)?.snapshot || null,
          disabled: snapshots.find(item => !item.showContentsEnabled)?.snapshot || null,
        };
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['viewer', 'contents', 'visibility'] }
    );

    let adhesiveGlassDoorPoint = null;
    await withStep(
      result,
      page,
      'adhesive-glass.first-use.black.apply-and-render',
      async () => {
        const applied = await applyAdhesiveGlassViaCanvas(page, 'black');
        adhesiveGlassDoorPoint = applied.point;
      },
      { journey: USER_JOURNEYS.adhesiveGlassFirstUse, tags: ['adhesive-glass', 'black', 'first-use'] }
    );

    await withStep(
      result,
      page,
      'adhesive-glass.first-use.variant-update-and-render',
      async () => {
        if (!adhesiveGlassDoorPoint) throw new Error('Adhesive-glass first-use target point is missing');
        await applyAdhesiveGlassViaCanvas(page, 'frosted', adhesiveGlassDoorPoint);
      },
      { journey: USER_JOURNEYS.adhesiveGlassFirstUse, tags: ['adhesive-glass', 'frosted', 'variant'] }
    );

    const cabinetCoreSavedName = `Cabinet Browser Perf ${Date.now()}`;
    let expectedCabinetCoreState = null;
    await withStep(
      result,
      page,
      'cabinet-core.configure',
      async () => {
        await fillProjectNameViaActiveInput(page, cabinetCoreSavedName);
        await setStructureDimension(page, 'width', 195);
        await setStructureDimension(page, 'height', 247);
        await setStructureDimension(page, 'depth', 62);
        const uniqueColor = `#${String(Date.now() % 0xffffff)
          .padStart(6, '0')
          .slice(-6)}`;
        const savedColorValue = await addSavedDesignColor(page, uniqueColor);
        await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
        await setHeaderSketchMode(page, true);
        expectedCabinetCoreState = await readCabinetCoreFingerprint(page);
        await expectPerfMetricCount(page, 'structure.dimensions.width.commit', 1);
        await expectPerfMetricCount(page, 'structure.dimensions.height.commit', 1);
        await expectPerfMetricCount(page, 'structure.dimensions.depth.commit', 1);
        await expectPerfMetricCount(page, 'design.savedColor.add', 1);
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['dimensions', 'design', 'sketch'] }
    );

    await withStep(
      result,
      page,
      'cabinet-core.mixed-edit-burst',
      async () => {
        await runCabinetCoreMixedEditBurst(page);
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-core.mixed-edit-burst.restored-state',
            expectedCabinetCoreState,
            'Mixed cabinet editing burst should settle back to the canonical cabinet core state'
          );
        }
        await expectPerfMetricCount(page, 'structure.dimensions.width.commit', 4);
        await expectPerfMetricCount(page, 'structure.dimensions.height.commit', 4);
        await expectPerfMetricCount(page, 'structure.dimensions.depth.commit', 4);
        await expectPerfMetricCount(page, 'design.savedColor.add', 3);
        await expectPerfMetricCount(page, 'design.savedColor.delete', 2);
      },
      { journey: USER_JOURNEYS.cabinetCoreAuthoring, tags: ['dimensions', 'design', 'sketch', 'burst'] }
    );

    let expectedCabinetVariantState = null;
    let canonicalCabinetVariant = null;
    await withStep(
      result,
      page,
      'cabinet-build-variants.profile-texture.configure',
      async () => {
        const texturePath = ensureTextureFixture();
        await setStructureType(page, 'hinged');
        await setBoardMaterial(page, 'sandwich');
        await setDoorStyle(page, 'profile');
        const createdTexture = await addSavedDesignTexture(
          page,
          texturePath,
          `Variant Texture ${Date.now()}`
        );
        expectedCabinetVariantState = await readCabinetCoreFingerprint(page);
        canonicalCabinetVariant = {
          ...expectedCabinetVariantState,
          textureSwatchId: createdTexture?.id || null,
        };
        await expectPerfMetricCount(page, 'design.savedColor.add', 4);
      },
      { journey: USER_JOURNEYS.cabinetBuildVariants, tags: ['structure', 'design', 'texture', 'profile'] }
    );

    await withStep(
      result,
      page,
      'cabinet-build-variants.authoring-matrix',
      async () => {
        await runCabinetBuildVariantAuthoringMatrix(page, canonicalCabinetVariant);
        if (expectedCabinetVariantState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-build-variants.authoring-matrix.restored-state',
            expectedCabinetVariantState,
            'Cabinet build authoring matrix should settle back to the canonical profile + texture authoring state'
          );
        }
        await expectPerfMetricCount(page, 'design.savedColor.add', 4);
        await expectPerfMetricCount(page, 'design.savedColor.delete', 2);
      },
      {
        journey: USER_JOURNEYS.cabinetBuildVariants,
        tags: ['structure', 'material', 'door-style', 'texture', 'matrix'],
      }
    );

    await withStep(
      result,
      page,
      'cabinet-build-variants.structure-material-door-burst',
      async () => {
        await runCabinetBuildOptionPressureBurst(page, canonicalCabinetVariant);
        if (expectedCabinetVariantState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-build-variants.structure-material-door-burst.restored-state',
            expectedCabinetVariantState,
            'Cabinet build variants structure/material/door burst should settle back to the canonical profile + texture authoring state'
          );
        }
        await expectPerfMetricCount(page, 'structure.dimensions.width.commit', 7);
        await expectPerfMetricCount(page, 'structure.dimensions.height.commit', 7);
        await expectPerfMetricCount(page, 'structure.dimensions.depth.commit', 7);
      },
      {
        journey: USER_JOURNEYS.cabinetBuildVariants,
        tags: ['structure', 'material', 'door-style', 'dimensions', 'burst'],
      }
    );

    await withStep(
      result,
      page,
      'cabinet-build-variants.option-burst',
      async () => {
        await setStructureType(page, 'sliding');
        await setBoardMaterial(page, 'melamine');
        await setDoorStyle(page, 'double_profile');
        await setStructureType(page, 'hinged');
        await setBoardMaterial(page, 'sandwich');
        await setDoorStyle(page, 'profile');
        if (canonicalCabinetVariant?.textureSwatchId) {
          await selectSavedDesignSwatchById(page, canonicalCabinetVariant.textureSwatchId);
        }
        if (expectedCabinetVariantState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-build-variants.option-burst.restored-state',
            expectedCabinetVariantState,
            'Cabinet build variants burst should settle back to the canonical profile + texture authoring state'
          );
        }
      },
      { journey: USER_JOURNEYS.cabinetBuildVariants, tags: ['structure', 'material', 'door-style', 'burst'] }
    );

    let expectedDoorDrawerAuthoringState = null;
    await withStep(
      result,
      page,
      'cabinet-door-drawer-authoring.configure',
      async () => {
        await setStructureType(page, 'hinged');
        await setDoorStyle(page, 'profile');
        await setDoorFeatureToggle(page, 'groovesEnabled', true);
        await setGrooveLinesCount(page, 12);
        await setDoorFeatureToggle(page, 'splitDoors', true);
        await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
        await setInternalDrawersEnabled(page, true);
        await setExternalDrawerSelection(page, 'regular', 3, { exitAfterSelect: true });
        expectedDoorDrawerAuthoringState = await readCabinetDoorDrawerAuthoringFingerprint(page);
        expectedCabinetCoreState = await readCabinetCoreFingerprint(page);
      },
      {
        journey: USER_JOURNEYS.cabinetDoorDrawerAuthoring,
        tags: ['doors', 'drawers', 'authoring', 'configure'],
      }
    );

    await withStep(
      result,
      page,
      'cabinet-door-drawer-authoring.mode-burst',
      async () => {
        await setBoardMaterial(page, 'melamine');
        await setDoorStyle(page, 'post');
        await setDoorFeatureToggle(page, 'groovesEnabled', false);
        await setDoorFeatureToggle(page, 'splitDoors', false);
        await setDoorFeatureToggle(page, 'removeDoorsEnabled', false);
        await setInternalDrawersEnabled(page, false);
        await setExternalDrawerSelection(page, 'shoe', undefined, { exitAfterSelect: true });
        if (expectedDoorDrawerAuthoringState) {
          const actualAuthoringState = await readCabinetDoorDrawerAuthoringFingerprint(page);
          if (JSON.stringify(actualAuthoringState) === JSON.stringify(expectedDoorDrawerAuthoringState)) {
            throw new Error(
              'Door/drawer authoring mutation probe did not diverge from the saved canonical authoring state'
            );
          }
        }
        if (expectedCabinetCoreState) {
          const actualCabinetCoreState = await readCabinetCoreFingerprint(page);
          if (JSON.stringify(actualCabinetCoreState) === JSON.stringify(expectedCabinetCoreState)) {
            throw new Error(
              'Door/drawer authoring mutation probe did not diverge from the saved canonical cabinet core state'
            );
          }
        }
        await setBoardMaterial(page, 'sandwich');
        await setDoorStyle(page, 'profile');
        await setDoorFeatureToggle(page, 'groovesEnabled', true);
        await setGrooveLinesCount(page, 12);
        await setDoorFeatureToggle(page, 'splitDoors', true);
        await setDoorFeatureToggle(page, 'removeDoorsEnabled', true);
        await setInternalDrawersEnabled(page, true);
        await setExternalDrawerSelection(page, 'regular', 3, { exitAfterSelect: true });
        if (expectedDoorDrawerAuthoringState) {
          await assertCabinetDoorDrawerAuthoringFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.mode-burst.restored-state',
            expectedDoorDrawerAuthoringState,
            'Cabinet door/drawer authoring burst should settle back to the canonical authoring option state'
          );
        }
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.mode-burst.cabinet-core-state',
            expectedCabinetCoreState,
            'Cabinet door/drawer authoring burst should preserve the canonical cabinet core fingerprint'
          );
        }
      },
      { journey: USER_JOURNEYS.cabinetDoorDrawerAuthoring, tags: ['doors', 'drawers', 'authoring', 'burst'] }
    );

    await withStep(
      result,
      page,
      'cabinet-door-drawer-authoring.layout-persistence-roundtrip',
      async () => {
        const seedName = `Door Drawer Layout Seed ${Date.now()}`;
        await fillProjectNameViaActiveInput(page, seedName);
        const { detail: seedSaveDetail, path: seedProjectPath } = await saveProjectViaHeader(
          page,
          'browser-perf-door-drawer-layout-seed'
        );
        if (!seedSaveDetail || seedSaveDetail.ok !== true) {
          throw new Error(`Door/drawer layout seed save failed: ${JSON.stringify(seedSaveDetail)}`);
        }
        if (!seedProjectPath) throw new Error('Door/drawer layout seed project path missing');
        const { fixturePath, expectedFingerprint } =
          createCabinetDoorDrawerLayoutFixtureFile(seedProjectPath);
        const fixtureLoadDetail = await loadProjectViaHeader(page, fixturePath);
        if (!fixtureLoadDetail || fixtureLoadDetail.ok !== true) {
          throw new Error(`Door/drawer layout fixture load failed: ${JSON.stringify(fixtureLoadDetail)}`);
        }
        await assertPerfStateFingerprintSubset(
          result,
          page,
          'cabinet-door-drawer-authoring.layout-persistence-roundtrip.fixture-state',
          expectedFingerprint,
          'Door/drawer authored layout fixture should expose non-empty split/remove/groove/divider/drawer placement state through the perf fingerprint'
        );
        const { detail: authoredSaveDetail, path: authoredProjectPath } = await saveProjectViaHeader(
          page,
          'browser-perf-door-drawer-layout-authored'
        );
        if (!authoredSaveDetail || authoredSaveDetail.ok !== true) {
          throw new Error(`Door/drawer authored layout save failed: ${JSON.stringify(authoredSaveDetail)}`);
        }
        if (!authoredProjectPath) throw new Error('Door/drawer authored layout project path missing');
        assertSavedProjectPayloadSubset(
          result,
          'cabinet-door-drawer-authoring.layout-persistence-roundtrip.saved-project-payload',
          authoredProjectPath,
          readSavedProjectJson(fixturePath),
          'Door/drawer authored layout save should persist the authored cut/remove/groove/divider/drawer project payload branches'
        );
        await fillProjectNameViaActiveInput(page, `Door Drawer Layout Mutated ${Date.now()}`);
        const authoredLoadDetail = await loadProjectViaHeader(page, authoredProjectPath);
        if (!authoredLoadDetail || authoredLoadDetail.ok !== true) {
          throw new Error(`Door/drawer authored layout reload failed: ${JSON.stringify(authoredLoadDetail)}`);
        }
        await assertPerfStateFingerprintSubset(
          result,
          page,
          'cabinet-door-drawer-authoring.layout-persistence-roundtrip.reload-state',
          expectedFingerprint,
          'Door/drawer authored layout save-load roundtrip should preserve split/remove/groove/divider/drawer placement state'
        );
        const canonicalLoadDetail = await loadProjectViaHeader(page, seedProjectPath);
        if (!canonicalLoadDetail || canonicalLoadDetail.ok !== true) {
          throw new Error(
            `Door/drawer canonical restore load failed: ${JSON.stringify(canonicalLoadDetail)}`
          );
        }
        if (expectedDoorDrawerAuthoringState) {
          await assertCabinetDoorDrawerAuthoringFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-authoring-state',
            expectedDoorDrawerAuthoringState,
            'Door/drawer authored layout roundtrip should restore the canonical authoring toggle state after the seed project reload'
          );
        }
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.layout-persistence-roundtrip.restored-cabinet-core',
            { ...expectedCabinetCoreState, projectName: seedName },
            'Door/drawer authored layout roundtrip should restore the canonical cabinet core fingerprint after the seed project reload'
          );
        }
      },
      {
        journey: USER_JOURNEYS.cabinetDoorDrawerAuthoring,
        tags: ['doors', 'drawers', 'authoring', 'persistence', 'roundtrip'],
      }
    );

    await withStep(
      result,
      page,
      'cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip',
      async () => {
        const seedName = `Door Drawer Layout Matrix Seed ${Date.now()}`;
        await fillProjectNameViaActiveInput(page, seedName);
        const { detail: seedSaveDetail, path: seedProjectPath } = await saveProjectViaHeader(
          page,
          'browser-perf-door-drawer-layout-matrix-seed'
        );
        if (!seedSaveDetail || seedSaveDetail.ok !== true) {
          throw new Error(`Door/drawer layout matrix seed save failed: ${JSON.stringify(seedSaveDetail)}`);
        }
        if (!seedProjectPath) throw new Error('Door/drawer layout matrix seed project path missing');
        const scenarioFixtures = createCabinetDoorDrawerLayoutFixtureMatrixFiles(seedProjectPath);
        for (const { fixturePath, expectedFingerprint, scenario } of scenarioFixtures) {
          const scenarioLoadDetail = await loadProjectViaHeader(page, fixturePath);
          if (!scenarioLoadDetail || scenarioLoadDetail.ok !== true) {
            throw new Error(
              `Door/drawer layout scenario ${scenario} load failed: ${JSON.stringify(scenarioLoadDetail)}`
            );
          }
          await assertPerfStateFingerprintSubset(
            result,
            page,
            `cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.${scenario}.fixture-state`,
            expectedFingerprint,
            `Door/drawer layout scenario ${scenario} should expose the expected cut/remove/drawer authoring fingerprint`
          );
          const { detail: scenarioSaveDetail, path: scenarioProjectPath } = await saveProjectViaHeader(
            page,
            `browser-perf-door-drawer-layout-${scenario}`
          );
          if (!scenarioSaveDetail || scenarioSaveDetail.ok !== true) {
            throw new Error(
              `Door/drawer layout scenario ${scenario} save failed: ${JSON.stringify(scenarioSaveDetail)}`
            );
          }
          if (!scenarioProjectPath)
            throw new Error(`Door/drawer layout scenario ${scenario} project path missing`);
          assertSavedProjectPayloadSubset(
            result,
            `cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.${scenario}.saved-project-payload`,
            scenarioProjectPath,
            readSavedProjectJson(fixturePath),
            `Door/drawer layout scenario ${scenario} save should persist the authored cut/remove/drawer project payload branches`
          );
          await fillProjectNameViaActiveInput(page, `Door Drawer Layout Scenario ${scenario} ${Date.now()}`);
          const scenarioReloadDetail = await loadProjectViaHeader(page, scenarioProjectPath);
          if (!scenarioReloadDetail || scenarioReloadDetail.ok !== true) {
            throw new Error(
              `Door/drawer layout scenario ${scenario} reload failed: ${JSON.stringify(scenarioReloadDetail)}`
            );
          }
          await assertPerfStateFingerprintSubset(
            result,
            page,
            `cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.${scenario}.reload-state`,
            expectedFingerprint,
            `Door/drawer layout scenario ${scenario} save-load roundtrip should preserve the authored cut/remove/drawer fingerprint`
          );
        }
        const canonicalLoadDetail = await loadProjectViaHeader(page, seedProjectPath);
        if (!canonicalLoadDetail || canonicalLoadDetail.ok !== true) {
          throw new Error(
            `Door/drawer layout matrix canonical restore load failed: ${JSON.stringify(canonicalLoadDetail)}`
          );
        }
        if (expectedDoorDrawerAuthoringState) {
          await assertCabinetDoorDrawerAuthoringFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-authoring-state',
            expectedDoorDrawerAuthoringState,
            'Door/drawer layout matrix roundtrip should restore the canonical authoring toggle state after the seed project reload'
          );
        }
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'cabinet-door-drawer-authoring.layout-scenario-matrix-roundtrip.restored-cabinet-core',
            { ...expectedCabinetCoreState, projectName: seedName },
            'Door/drawer layout matrix roundtrip should restore the canonical cabinet core fingerprint after the seed project reload'
          );
        }
      },
      {
        journey: USER_JOURNEYS.cabinetDoorDrawerAuthoring,
        tags: ['doors', 'drawers', 'authoring', 'matrix', 'roundtrip'],
      }
    );

    await withStep(
      result,
      page,
      'tab.settings.open',
      async () => {
        await openMainTab(page, 'settings');
        await expect(page.locator('[data-testid="cloud-sync-panel"]')).toBeVisible();
        await expect(page.locator('[data-testid="settings-backup-panel"]')).toBeVisible();
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['navigation', 'settings'] }
    );

    await withStep(
      result,
      page,
      'export.snapshot.download',
      async () => {
        const downloadPromise = page.waitForEvent('download');
        await page.locator('button[data-testid="export-snapshot-button"]').click();
        const download = await downloadPromise;
        const filePath = await download.path();
        if (!filePath) throw new Error('Snapshot download path missing');
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['export', 'download'] }
    );

    await withStep(
      result,
      page,
      'export.copy.clipboard',
      async () => {
        await runClipboardExportAction(page, 'export-copy-button', 'export.copy');
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['export', 'clipboard'] }
    );

    await withStep(
      result,
      page,
      'export.render-sketch.clipboard',
      async () => {
        await runClipboardExportAction(page, 'export-render-sketch-button', 'export.renderSketch');
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['export', 'clipboard', 'sketch'] }
    );

    await withStep(
      result,
      page,
      'export.dual.clipboard',
      async () => {
        await runClipboardExportAction(page, 'export-dual-image-button', 'export.dual');
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['export', 'clipboard', 'dual'] }
    );

    let settingsBackupPath = null;
    let savedProjectPath = null;
    let expectedImportedState = null;
    const invalidProjectPath = path.join(projectRoot, '.artifacts/browser-perf/invalid-project.json');
    const invalidSettingsBackupPath = path.join(
      projectRoot,
      '.artifacts/browser-perf/invalid-settings-backup.json'
    );
    ensureDir(invalidProjectPath);
    writeText(
      invalidProjectPath,
      `${JSON.stringify({ projectName: 'invalid-fixture' })}
`
    );
    writeText(invalidSettingsBackupPath, '{"broken":true,"savedColors":');
    const savedName = `Browser Perf ${Date.now()}`;
    const changedName = `Browser Perf Changed ${Date.now()}`;
    const nameInput = getVisibleProjectNameInput(page);

    await withStep(
      result,
      page,
      'settings-backup.roundtrip',
      async () => {
        const uniqueColor = `#${String(Date.now() % 0xffffff)
          .padStart(6, '0')
          .slice(-6)}`;
        const savedColorValue = await addSavedDesignColor(page, uniqueColor);
        await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
        expectedImportedState = await readUiStateFingerprint(page);

        await openMainTab(page, 'settings');
        const downloadPromise = page.waitForEvent('download');
        await page.locator('button[data-testid="settings-backup-export-button"]').click();
        const download = await downloadPromise;
        settingsBackupPath = await download.path();
        if (!settingsBackupPath) throw new Error('Settings backup download path missing');

        await deleteSavedDesignColor(page, savedColorValue);
        await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(0);

        await importSettingsBackupFromFile(page, settingsBackupPath);
        await openMainTab(page, 'design');
        await expect(getSavedDesignColorSwatch(page, savedColorValue)).toHaveCount(1);
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.roundtrip.saved-state',
          expectedImportedState,
          'Settings backup import should rebuild the exported saved-color state'
        );

        await importSettingsBackupFromFile(page, settingsBackupPath);
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.reimport.idempotent',
          expectedImportedState,
          'Repeated settings backup import should stay idempotent'
        );

        expectedCabinetCoreState = await readCabinetCoreFingerprint(page);
      },
      { journey: USER_JOURNEYS.settingsBackupResilience, tags: ['settings-backup', 'roundtrip'] }
    );

    await withStep(
      result,
      page,
      'cloud-sync.floating.toggle-on',
      async () => {
        await toggleCloudSyncFloatingPin(page);
      },
      { journey: USER_JOURNEYS.cloudSyncControls, tags: ['cloud-sync', 'toggle'] }
    );

    await withStep(
      result,
      page,
      'cloud-sync.floating.toggle-off',
      async () => {
        await toggleCloudSyncFloatingPin(page);
      },
      { journey: USER_JOURNEYS.cloudSyncControls, tags: ['cloud-sync', 'toggle'] }
    );

    await withStep(
      result,
      page,
      'order-pdf.open-close.initial',
      async () => {
        await openMainTab(page, 'settings');
        await page.locator('button[data-testid="export-open-pdf-button"]').click();
        await expect(page.locator('[data-testid="order-pdf-overlay"]')).toBeVisible();
        await page.locator('button[data-testid="order-pdf-close-button"]').click();
        await expect(page.locator('[data-testid="order-pdf-overlay"]')).toHaveCount(0);
        await waitForUiSettledAfterProjectAction(page);
      },
      { journey: USER_JOURNEYS.orderPdfLifecycle, tags: ['order-pdf', 'overlay'] }
    );

    let expectedRestoredState = null;
    await withStep(
      result,
      page,
      'project.save-load.roundtrip',
      async () => {
        await fillProjectNameViaActiveInput(page, savedName);
        expectedRestoredState = await readUiStateFingerprint(page);
        const { detail: saveDetail, path: downloadedProjectPath } = await saveProjectViaHeader(
          page,
          'browser-perf-roundtrip'
        );
        if (!saveDetail || saveDetail.ok !== true) {
          throw new Error(`Save event failed: ${JSON.stringify(saveDetail)}`);
        }
        savedProjectPath = downloadedProjectPath;
        if (!savedProjectPath) throw new Error('Saved project download path missing');

        await fillProjectNameViaActiveInput(page, changedName);
        const loadDetail = await loadProjectViaHeader(page, savedProjectPath);
        if (!loadDetail || loadDetail.ok !== true) {
          throw new Error(`Load event failed: ${JSON.stringify(loadDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(getVisibleProjectNameInput(page)).toHaveValue(savedName);
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'project.save-load.cabinet-core-state',
            { ...expectedCabinetCoreState, projectName: savedName },
            'Project roundtrip should preserve cabinet build options, dimensions, selected texture state, colors, and sketch mode'
          );
        }
      },
      { journey: USER_JOURNEYS.projectRoundtrip, tags: ['project', 'save-load'] }
    );

    await withStep(
      result,
      page,
      'project.reset-default.confirmed',
      async () => {
        const resetEventPromise = waitForProjectAction(page, 'reset-default');
        await page.locator('button[data-testid="header-reset-default-button"]').click();
        await confirmActiveModal(page);
        const resetDetail = await resetEventPromise;
        if (!resetDetail || resetDetail.ok !== true) {
          throw new Error(`Reset event failed: ${JSON.stringify(resetDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue('');
      },
      { journey: USER_JOURNEYS.projectRoundtrip, tags: ['project', 'reset'] }
    );

    await withStep(
      result,
      page,
      'export.clipboard.pressure',
      async () => {
        for (let i = 0; i < 2; i += 1) {
          await runClipboardExportAction(page, 'export-copy-button', 'export.copy');
          await runClipboardExportAction(page, 'export-render-sketch-button', 'export.renderSketch');
          await runClipboardExportAction(page, 'export-dual-image-button', 'export.dual');
        }
      },
      { journey: USER_JOURNEYS.exportAuthoring, tags: ['export', 'pressure'] }
    );

    await withStep(
      result,
      page,
      'order-pdf.reopen.pressure',
      async () => {
        for (let i = 0; i < 2; i += 1) {
          await openMainTab(page, 'settings');
          await page.locator('button[data-testid="export-open-pdf-button"]').click();
          await expect(page.locator('[data-testid="order-pdf-overlay"]')).toBeVisible();
          await page.locator('button[data-testid="order-pdf-close-button"]').click();
          await expect(page.locator('[data-testid="order-pdf-overlay"]')).toHaveCount(0);
          await waitForUiSettledAfterProjectAction(page);
        }
      },
      { journey: USER_JOURNEYS.orderPdfLifecycle, tags: ['order-pdf', 'pressure'] }
    );

    await page.evaluate(
      () =>
        new Promise(resolve => {
          window.setTimeout(() => window.requestAnimationFrame(() => resolve(undefined)), 0);
        })
    );
    await captureSessionArtifacts(page, result);
    const responsivenessAttribution = attributeBrowserResponsivenessToSteps(
      result.windowResponsivenessFlowSteps,
      result.windowPerfEntries
    );
    result.windowResponsivenessFlowSteps = responsivenessAttribution.steps;
    result.windowResponsivenessUnattributed = responsivenessAttribution.unattributed;
    result.topLongTaskSteps = rankResponsivenessSteps(result.windowResponsivenessFlowSteps, 20);
    result.adhesiveGlassFirstUse = {
      black: createAdhesiveGlassFirstUseSummary(result, 'adhesive-glass.first-use.black.apply-and-render'),
      variant: createAdhesiveGlassFirstUseSummary(
        result,
        'adhesive-glass.first-use.variant-update-and-render'
      ),
    };

    const restoreNameInput = await prepareRestoreLastSessionScenario(page, result, savedProjectPath);

    await withStep(
      result,
      page,
      'project.restore-last-session',
      async () => {
        const beforeCount = (await readPerfSummary(page))['project.restoreLastSession']?.count || 0;
        const restoreEventPromise = waitForProjectAction(page, 'restore-last-session');
        await openMainTab(page, 'structure');
        await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
        await confirmRestoreLastSessionModalWithAutosave(page, savedProjectPath);
        const restoreDetail = await restoreEventPromise;
        if (!restoreDetail || restoreDetail.ok !== true) {
          throw new Error(`Restore action failed: ${JSON.stringify(restoreDetail)}`);
        }
        await expect(restoreNameInput).toHaveValue(savedName);
        await expectPerfMetricCount(page, 'project.restoreLastSession', beforeCount + 1);
        await assertUiStateFingerprint(
          result,
          page,
          'project.restore-last-session.saved-state',
          expectedRestoredState,
          'Restore-last-session should rebuild the saved project fingerprint'
        );
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'project.restore-last-session.cabinet-core-state',
            { ...expectedCabinetCoreState, projectName: savedName },
            'Restore-last-session should rebuild the saved cabinet build options, selected texture state, dimensions, colors, and sketch mode after the app reloads'
          );
        }
      },
      { journey: USER_JOURNEYS.projectRoundtrip, tags: ['project', 'restore'] }
    );

    await withStep(
      result,
      page,
      'project.persistence-recovery.burst',
      async () => {
        const beforeLoadCount = (await readPerfSummary(page))['project.load']?.count || 0;
        const beforeRestoreCount = (await readPerfSummary(page))['project.restoreLastSession']?.count || 0;
        await runProjectPersistenceRecoveryBurst(page, savedProjectPath, expectedCabinetCoreState, savedName);
        if (expectedCabinetCoreState) {
          await assertCabinetCoreFingerprint(
            result,
            page,
            'project.persistence-recovery.load-restores-cabinet-core',
            { ...expectedCabinetCoreState, projectName: savedName },
            'Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after a valid project load'
          );
          await assertCabinetCoreFingerprint(
            result,
            page,
            'project.persistence-recovery.restore-restores-cabinet-core',
            { ...expectedCabinetCoreState, projectName: savedName },
            'Cross-surface persistence burst should restore the canonical cabinet build options, selected texture state, dimensions, colors, and sketch mode after restore-last-session'
          );
        }
        await expectPerfMetricCount(page, 'project.load', beforeLoadCount + 1);
        await expectPerfMetricCount(page, 'project.restoreLastSession', beforeRestoreCount + 1);
      },
      { journey: USER_JOURNEYS.projectRoundtrip, tags: ['project', 'persistence', 'recovery', 'burst'] }
    );

    await withStep(
      result,
      page,
      'project.load.invalid-keeps-state',
      async () => {
        const expectedState = await readUiStateFingerprint(page);
        const loadEventPromise = waitForProjectAction(page, 'load');
        await page.locator('button[data-testid="header-project-load-button"]').click();
        await page
          .locator('input[data-testid="header-project-load-input"]')
          .setInputFiles(invalidProjectPath);
        const loadDetail = await loadEventPromise;
        if (!loadDetail || loadDetail.ok !== false) {
          throw new Error(`Invalid load unexpectedly succeeded: ${JSON.stringify(loadDetail)}`);
        }
        const loadEntries = await readPerfEntries(page, 'project.load');
        if (loadEntries.at(-1)?.status !== 'error') {
          throw new Error(
            `Invalid load did not record an error perf entry: ${JSON.stringify(loadEntries.at(-1) || null)}`
          );
        }
        await assertUiStateFingerprint(
          result,
          page,
          'project.load.invalid-preserves-state',
          expectedState,
          'Invalid project load should preserve visible user state'
        );
      },
      { journey: USER_JOURNEYS.projectRecoveryProveout, tags: ['project', 'invalid-input', 'recovery'] }
    );

    await withStep(
      result,
      page,
      'project.load.recovery-sequence',
      async () => {
        await fillProjectNameViaActiveInput(page, `${changedName} Recovery`);
        const recoveryLoadEventPromise = waitForProjectAction(page, 'load');
        await page.locator('button[data-testid="header-project-load-button"]').click();
        await page.locator('input[data-testid="header-project-load-input"]').setInputFiles(savedProjectPath);
        const recoveryLoadDetail = await recoveryLoadEventPromise;
        if (!recoveryLoadDetail || recoveryLoadDetail.ok !== true) {
          throw new Error(`Recovery load failed: ${JSON.stringify(recoveryLoadDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.load.recovery-restores-state',
          expectedRestoredState,
          'A valid project load after an invalid load should recover the saved project state'
        );

        await fillProjectNameViaActiveInput(page, `${changedName} Recovery Stable`);
        const stableRecoveryLoadEventPromise = waitForProjectAction(page, 'load');
        await page.locator('button[data-testid="header-project-load-button"]').click();
        await page.locator('input[data-testid="header-project-load-input"]').setInputFiles(savedProjectPath);
        const stableRecoveryLoadDetail = await stableRecoveryLoadEventPromise;
        if (!stableRecoveryLoadDetail || stableRecoveryLoadDetail.ok !== true) {
          throw new Error(`Sticky recovery load failed: ${JSON.stringify(stableRecoveryLoadDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.load.recovery-stays-stable',
          expectedRestoredState,
          'Repeated valid project load after a failure should remain stable and preserve the recovered project state'
        );

        await fillProjectNameViaActiveInput(page, `${changedName} Recovery Clean Window`);
        const cleanRecoveryLoadEventPromise = waitForProjectAction(page, 'load');
        await page.locator('button[data-testid="header-project-load-button"]').click();
        await page.locator('input[data-testid="header-project-load-input"]').setInputFiles(savedProjectPath);
        const cleanRecoveryLoadDetail = await cleanRecoveryLoadEventPromise;
        if (!cleanRecoveryLoadDetail || cleanRecoveryLoadDetail.ok !== true) {
          throw new Error(`Recovery clean-window load failed: ${JSON.stringify(cleanRecoveryLoadDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.load.recovery-clean-window',
          expectedRestoredState,
          'A third valid project load after recovery should keep the recovered project state clean and relapse-free'
        );
      },
      { journey: USER_JOURNEYS.projectRecoveryProveout, tags: ['project', 'invalid-input', 'recovery'] }
    );

    await withStep(
      result,
      page,
      'project.restore-last-session.missing-autosave',
      async () => {
        const expectedState = await readUiStateFingerprint(page);
        await page.evaluate(() => window.localStorage.removeItem('wardrobe_autosave_latest'));
        const beforeCount = (await readPerfSummary(page))['project.restoreLastSession']?.count || 0;
        const restoreEventPromise = waitForProjectAction(page, 'restore-last-session');
        await openMainTab(page, 'structure');
        await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
        const restoreDetail = await restoreEventPromise;
        if (!restoreDetail || restoreDetail.ok !== false || restoreDetail.reason !== 'missing-autosave') {
          throw new Error(`Missing-autosave restore did not stay quiet: ${JSON.stringify(restoreDetail)}`);
        }
        await expectPerfMetricCount(page, 'project.restoreLastSession', beforeCount + 1);
        const restoreEntries = await readPerfEntries(page, 'project.restoreLastSession');
        if (restoreEntries.at(-1)?.status !== 'mark') {
          throw new Error(
            `Missing-autosave restore did not record a quiet mark: ${JSON.stringify(restoreEntries.at(-1) || null)}`
          );
        }
        await assertUiStateFingerprint(
          result,
          page,
          'project.restore-last-session.missing-autosave-preserves-state',
          expectedState,
          'Restore-last-session without autosave should keep user state unchanged'
        );

        await seedAutosaveStorage(page, savedProjectPath);
        const recoveryDriftName = `${changedName} Restore Recovery`;
        await fillProjectNameViaActiveInput(page, recoveryDriftName);
        await seedAutosaveStorage(page, savedProjectPath);
        const recoveryRestoreEventPromise = waitForProjectAction(page, 'restore-last-session');
        await openMainTab(page, 'structure');
        await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
        await confirmRestoreLastSessionModalWithAutosave(page, savedProjectPath);
        const recoveryRestoreDetail = await recoveryRestoreEventPromise;
        if (!recoveryRestoreDetail || recoveryRestoreDetail.ok !== true) {
          throw new Error(`Recovery restore action failed: ${JSON.stringify(recoveryRestoreDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.restore-last-session.recovery-restores-state',
          expectedRestoredState,
          'A restore-last-session after a missing-autosave no-op should recover the saved project state once autosave returns'
        );

        const stableDriftName = `${changedName} Restore Stable`;
        await fillProjectNameViaActiveInput(page, stableDriftName);
        await seedAutosaveStorage(page, savedProjectPath);
        const stableRestoreEventPromise = waitForProjectAction(page, 'restore-last-session');
        await openMainTab(page, 'structure');
        await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
        await confirmRestoreLastSessionModalWithAutosave(page, savedProjectPath);
        const stableRestoreDetail = await stableRestoreEventPromise;
        if (!stableRestoreDetail || stableRestoreDetail.ok !== true) {
          throw new Error(`Sticky restore action failed: ${JSON.stringify(stableRestoreDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.restore-last-session.recovery-stays-stable',
          expectedRestoredState,
          'Repeated restore-last-session after recovery should remain stable and preserve the saved project state'
        );

        const cleanWindowDriftName = `${changedName} Restore Clean Window`;
        await fillProjectNameViaActiveInput(page, cleanWindowDriftName);
        await seedAutosaveStorage(page, savedProjectPath);
        const cleanRestoreEventPromise = waitForProjectAction(page, 'restore-last-session');
        await openMainTab(page, 'structure');
        await page.locator('button[data-testid="project-restore-button"]:visible').first().click();
        await confirmRestoreLastSessionModalWithAutosave(page, savedProjectPath);
        const cleanRestoreDetail = await cleanRestoreEventPromise;
        if (!cleanRestoreDetail || cleanRestoreDetail.ok !== true) {
          throw new Error(`Recovery clean-window restore failed: ${JSON.stringify(cleanRestoreDetail)}`);
        }
        await openMainTab(page, 'structure');
        await expect(nameInput).toHaveValue(savedName);
        await assertUiStateFingerprint(
          result,
          page,
          'project.restore-last-session.recovery-clean-window',
          expectedRestoredState,
          'A third restore-last-session after recovery should keep the saved project state clean and relapse-free'
        );
      },
      { journey: USER_JOURNEYS.projectRecoveryProveout, tags: ['project', 'missing-autosave', 'recovery'] }
    );

    await withStep(
      result,
      page,
      'settings-backup.invalid-import-keeps-state',
      async () => {
        const expectedState = await readUiStateFingerprint(page);
        await importSettingsBackupFromFile(page, invalidSettingsBackupPath);
        const importEntries = await readPerfEntries(page, 'settingsBackup.import');
        if (importEntries.at(-1)?.status !== 'error') {
          throw new Error(
            `Invalid settings backup import did not record an error perf entry: ${JSON.stringify(importEntries.at(-1) || null)}`
          );
        }
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.invalid-import-preserves-state',
          expectedState,
          'Invalid settings backup import should preserve visible user state'
        );

        if (
          expectedImportedState &&
          Array.isArray(expectedImportedState.savedColorValues) &&
          expectedImportedState.savedColorValues.length
        ) {
          await openMainTab(page, 'design');
          await deleteSavedDesignColor(page, expectedImportedState.savedColorValues[0]);
        }
        const recoveryImportExpectedState = withMergedSavedColorValues(
          await readUiStateFingerprint(page),
          expectedImportedState || expectedState
        );
        await importSettingsBackupFromFile(page, settingsBackupPath);
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.recovery-import-merges-state',
          recoveryImportExpectedState,
          'A valid settings backup import after an invalid import should merge canonical backup colors into the current state'
        );

        if (
          expectedImportedState &&
          Array.isArray(expectedImportedState.savedColorValues) &&
          expectedImportedState.savedColorValues.length
        ) {
          await openMainTab(page, 'design');
          await deleteSavedDesignColor(page, expectedImportedState.savedColorValues[0]);
        }
        const stableRecoveryImportExpectedState = withMergedSavedColorValues(
          await readUiStateFingerprint(page),
          expectedImportedState || expectedState
        );
        await importSettingsBackupFromFile(page, settingsBackupPath);
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.recovery-import-stays-stable',
          stableRecoveryImportExpectedState,
          'Repeated valid settings backup import after recovery should remain stable and preserve the canonical backup state'
        );

        if (
          expectedImportedState &&
          Array.isArray(expectedImportedState.savedColorValues) &&
          expectedImportedState.savedColorValues.length
        ) {
          await openMainTab(page, 'design');
          await deleteSavedDesignColor(page, expectedImportedState.savedColorValues[0]);
        }
        const cleanRecoveryImportExpectedState = withMergedSavedColorValues(
          await readUiStateFingerprint(page),
          expectedImportedState || expectedState
        );
        await importSettingsBackupFromFile(page, settingsBackupPath);
        await assertUiStateFingerprint(
          result,
          page,
          'settings-backup.recovery-import-clean-window',
          cleanRecoveryImportExpectedState,
          'A third valid settings backup import after recovery should keep the imported state clean and relapse-free'
        );
      },
      {
        journey: USER_JOURNEYS.settingsBackupResilience,
        tags: ['settings-backup', 'invalid-input', 'recovery'],
      }
    );

    await captureSessionArtifacts(page, result);
    result.windowBrowserMetrics = createBrowserMetricSummaryFromEntries(
      result.windowPerfEntries,
      result.windowBrowserMetrics
    );
    result.windowPerfSummary = createPerfSummaryFromEntries(result.windowPerfEntries);
    result.stateIntegritySummary = createStateIntegritySummary(result.stateIntegrityChecks);
    result.windowPerfPressureSummary = createRepeatedMetricPressureSummary(
      result.windowPerfEntries,
      requiredRuntimeMetricMinimumCounts
    );
    result.windowPerfDomainSummary = createPerfDomainSummary(
      result.windowPerfSummary,
      result.windowPerfPressureSummary,
      requiredRuntimeMetrics,
      requiredRuntimeMetricMinimumCounts
    );
    result.windowPerfOutcomeSummary = createRuntimeOutcomeCoverageSummary(result.windowPerfSummary);
    result.windowPerfTransitionSummary = createRuntimeStatusTransitionSummary(result.windowPerfEntries);
    result.windowPerfRecoverySequenceSummary = createRuntimeRecoverySequenceSummary(result.windowPerfEntries);
    result.windowPerfRecoveryDebtSummary = createRuntimeRecoveryDebtSummary(result.windowPerfEntries);
    result.windowPerfRecoveryHangoverSummary = createRuntimeRecoveryHangoverSummary(result.windowPerfEntries);
    result.windowStoreDebugStats = await readStoreDebugStats(page);
    result.windowStoreDebugSummary = createStoreDebugSummary(result.windowStoreDebugStats);
    result.windowStoreDebugTopSources = rankStoreDebugSources(result.windowStoreDebugStats, 5);
    result.windowStoreFlowPressureSummary = createStoreFlowPressureSummary(result.windowStoreDebugFlowSteps);
    result.longTaskRootCauseSummary = createLongTaskRootCauseSummary(result, 5);
    result.builderExecutionRootCauseSummary = createBuilderExecutionRootCauseSummary(result);
    result.windowBuildDebugStats = await readBuildDebugStats(page);
    result.windowBuildDebugSummary = createBuildSummary(result.windowBuildDebugStats);
    result.windowBuildFlowPressureSummary = createBuildFlowPressureSummary(result.windowBuildDebugFlowSteps);
    result.journeyBuildPressureSummary = createJourneyBuildPressureSummary(result.windowBuildDebugFlowSteps);
    result.journeyResponsivenessSummary = createJourneyResponsivenessSummary(
      result.windowResponsivenessFlowSteps
    );
    result.userJourneySummary = createUserJourneySummary(
      result.userFlowSteps,
      result.windowStoreFlowPressureSummary,
      result.userFlow
    );
    result.journeyStoreSourceSummary = createJourneyStoreSourceSummary(result.windowStoreDebugFlowSteps);
    result.userJourneyDiagnosisSummary = createUserJourneyDiagnosisSummary(
      result.userJourneySummary,
      result.windowStoreFlowPressureSummary,
      result.journeyStoreSourceSummary
    );
    result.clipboardWrites = await readClipboardWriteCount(page);

    for (const [metricName, minCount] of Object.entries(requiredRuntimeMetricMinimumCounts)) {
      const count = result.windowPerfSummary?.[metricName]?.count || 0;
      if (count < minCount) {
        throw new Error(
          `Runtime metric count below required minimum: ${metricName} (${count} < ${minCount})`
        );
      }
    }
    for (const [metricName, requiredTransitions] of Object.entries(requiredRuntimeStatusTransitions)) {
      const metricSummary = result.windowPerfTransitionSummary?.[metricName];
      if (!metricSummary) {
        throw new Error(`Runtime metric transition coverage missing: ${metricName}`);
      }
      for (const [transitionKey, minimumCount] of Object.entries(requiredTransitions || {})) {
        const actualCount = Number(metricSummary.transitionCounts?.[transitionKey]) || 0;
        if (actualCount < minimumCount) {
          throw new Error(
            `Runtime metric transition coverage below required minimum: ${metricName} ${transitionKey} (${actualCount} < ${minimumCount})`
          );
        }
      }
    }
    for (const [metricName, requirement] of Object.entries(requiredRuntimeRecoverySequences)) {
      const metricSummary = result.windowPerfRecoverySequenceSummary?.[metricName];
      if (!metricSummary) {
        throw new Error(`Runtime recovery proveout missing: ${metricName}`);
      }
      if ((Number(requirement?.recoveredCount) || 0) > (Number(metricSummary.recoveredCount) || 0)) {
        throw new Error(
          `Runtime recovery proveout below required recovered count: ${metricName} (${Number(metricSummary.recoveredCount) || 0} < ${Number(requirement.recoveredCount) || 0})`
        );
      }
      if (
        (Number(requirement?.stableRecoveryCount) || 0) > (Number(metricSummary.stableRecoveryCount) || 0)
      ) {
        throw new Error(
          `Runtime recovery proveout below required stable recovery count: ${metricName} (${Number(metricSummary.stableRecoveryCount) || 0} < ${Number(requirement.stableRecoveryCount) || 0})`
        );
      }
      if ((Number(requirement?.cleanRecoveryCount) || 0) > (Number(metricSummary.cleanRecoveryCount) || 0)) {
        throw new Error(
          `Runtime recovery proveout below required clean recovery count: ${metricName} (${Number(metricSummary.cleanRecoveryCount) || 0} < ${Number(requirement.cleanRecoveryCount) || 0})`
        );
      }
      if (
        (Number(requirement?.minPostRecoveryOkStreak) || 0) >
        (Number(metricSummary.maxPostRecoveryOkStreak) || 0)
      ) {
        throw new Error(
          `Runtime recovery proveout below required post-recovery ok streak: ${metricName} (${Number(metricSummary.maxPostRecoveryOkStreak) || 0} < ${Number(requirement.minPostRecoveryOkStreak) || 0})`
        );
      }
      if (
        Number.isFinite(Number(requirement?.maxRecoverySpanEntries)) &&
        (Number(metricSummary.maxRecoverySpanEntries) || 0) > Number(requirement.maxRecoverySpanEntries)
      ) {
        throw new Error(
          `Runtime recovery proveout exceeded recovery span: ${metricName} (${Number(metricSummary.maxRecoverySpanEntries) || 0} > ${Number(requirement.maxRecoverySpanEntries)})`
        );
      }
      if (
        Number.isFinite(Number(requirement?.unresolvedCount)) &&
        (Number(metricSummary.unresolvedCount) || 0) > Number(requirement.unresolvedCount)
      ) {
        throw new Error(
          `Runtime recovery proveout left unresolved disruptions: ${metricName} (${Number(metricSummary.unresolvedCount) || 0} > ${Number(requirement.unresolvedCount)})`
        );
      }
      if (
        Number.isFinite(Number(requirement?.maxRelapseCount)) &&
        (Number(metricSummary.relapseCount) || 0) > Number(requirement.maxRelapseCount)
      ) {
        throw new Error(
          `Runtime recovery proveout relapsed before the clean window closed: ${metricName} (${Number(metricSummary.relapseCount) || 0} > ${Number(requirement.maxRelapseCount)})`
        );
      }
    }
  } finally {
    await browser.close();
    stopServer(server);
  }

  const md = summarizeBrowserPerfResult(result, {
    requiredRuntimeMetrics,
    requiredRuntimeMetricMinimumCounts,
    happyPathMetricsWithoutErrors,
    requiredProjectActions,
    requiredRuntimeOutcomeCoverage,
    requiredRuntimeRecoverySequences,
  });
  if (traceHeaderSketch) {
    writeJson(headerSketchTraceResultPath, result);
    writeText(headerSketchTraceReportPath, md);
  } else {
    writeJson(latestJsonPath, result);
    writeText(latestMdPath, md);
    writeText(docPath, md);
  }

  if (updateBaseline) {
    writeJson(
      baselinePath,
      createBrowserPerfBaseline(result, {
        measurementProfile,
        requiredBrowserMetrics: BROWSER_PERF_REQUIRED_UX_METRICS,
        requiredRuntimeMetrics,
        requiredRuntimeMetricMinimumCounts,
        requiredProjectActions,
        requiredRuntimeOutcomeCoverage,
        requiredRuntimeRecoverySequences,
      })
    );
  }
  if (enforce) {
    const baseline = fs.existsSync(baselinePath) ? JSON.parse(fs.readFileSync(baselinePath, 'utf8')) : null;
    const evaluatedFailures = evaluateBrowserPerfBaseline(result, baseline, {
      measurementProfile,
      requiredBrowserMetrics: BROWSER_PERF_REQUIRED_UX_METRICS,
      requiredRuntimeMetrics,
      requiredRuntimeMetricMinimumCounts,
      happyPathMetricsWithoutErrors,
      requiredProjectActions,
      requiredRuntimeOutcomeCoverage,
      requiredRuntimeRecoverySequences,
    });
    const failures = confirmationRun
      ? filterReproducedBrowserPerfFailures(evaluatedFailures, confirmationCandidateIdentities)
      : evaluatedFailures;
    if (failures.length) {
      if (!confirmationRun && areBrowserPerfFailuresConfirmationEligible(failures)) {
        for (const failure of failures) console.warn('[browser-perf][candidate]', failure);
        console.warn('[browser-perf] quantitative regression candidate; running one clean confirmation');
        const confirmation = runRegressionConfirmation(failures);
        if (confirmation.status === 0) {
          console.log('[browser-perf] regression candidate was not reproduced by the confirmation run');
          return;
        }
        process.exit(confirmation.status ?? 1);
      }
      for (const failure of failures) console.error('[browser-perf]', failure);
      process.exit(1);
    }
  }
})();
