import test from 'node:test';
import assert from 'node:assert/strict';

import {
  classifyRuntimeMetricDomain,
  createBrowserPerfBaseline,
  createPerfDomainSummary,
  createPerfSummaryFromEntries,
  createProjectActionSummary,
  createRepeatedMetricPressureSummary,
  createRuntimeOutcomeCoverageSummary,
  createRuntimeRecoveryDebtBudgetMs,
  createRuntimeRecoveryDebtSummary,
  createRuntimeRecoveryHangoverBudget,
  createRuntimeRecoveryHangoverSummary,
  createRuntimeRecoverySequenceSummary,
  createRuntimeStatusTransitionSummary,
  createStateIntegritySummary,
  createRuntimeIssueSummary,
  createStoreDebugSummary,
  createStoreFlowPressureSummary,
  createStorePressureBudget,
  createBuildSummary,
  createBuildFlowPressureSummary,
  createBuildPressureBudget,
  createJourneyBuildPressureSummary,
  createJourneyStoreSourceSummary,
  createUserJourneyBudget,
  createUserJourneyDiagnosisBudget,
  createUserJourneyDiagnosisSummary,
  createUserJourneySummary,
  rankJourneyBuildPressure,
  rankJourneyStoreSources,
  rankRuntimeOutcomeCoverage,
  rankStoreDebugSources,
  rankStoreFlowPressure,
  rankBuildFlowPressure,
  rankBuildReasons,
  rankUserJourneyDiagnosis,
  rankUserJourneys,
  evaluateBrowserPerfBaseline,
  rankBrowserPerfHotspots,
  rankPerfDomains,
  rankRepeatedMetricPressure,
  rankRuntimeRecoveryDebt,
  rankRuntimeRecoveryHangover,
  rankRuntimeRecoverySequences,
  rankRuntimeStatusTransitions,
  summarizeBrowserPerfResult,
} from '../tools/wp_browser_perf_support.js';

test('browser perf support summarizes runtime issues and perf metrics canonically', () => {
  const result = {
    generatedAt: '2026-04-19T00:00:00.000Z',
    userFlow: {
      'boot.app-shell': 320,
    },
    userFlowSteps: [{ name: 'project.save-load.roundtrip', durationMs: 440, journey: 'project-roundtrip' }],
    runtimeIssues: {
      pageErrors: ['boom'],
      consoleErrors: ['nope'],
    },
    clipboardWrites: 3,
    windowStoreDebugSummary: {
      commitCount: 9,
      noopSkipCount: 2,
      selectorListenerCount: 4,
      selectorNotifyCount: 18,
      sourceCount: 2,
      slowSourceCount: 1,
      totalSourceMs: 36,
      topSourceKey: 'PATCH:actions.project.save:config+meta',
      topSourceCount: 3,
      topSourceTotalMs: 24,
    },
    windowStoreDebugTopSources: [
      {
        key: 'PATCH:actions.project.save:config+meta',
        source: 'actions.project.save',
        type: 'PATCH',
        slices: ['config', 'meta'],
        count: 3,
        totalMs: 24,
        maxMs: 11,
        lastMs: 8,
        slowCount: 1,
      },
    ],
    windowStoreFlowPressureSummary: {
      'project.save-load.roundtrip': {
        durationMs: 440,
        commitCount: 8,
        noopSkipCount: 2,
        selectorNotifyCount: 16,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 36,
        topSources: ['PATCH:actions.project.save:config+meta'],
      },
    },
    windowBuildDebugSummary: {
      requestCount: 6,
      executeCount: 4,
      immediateRequestCount: 2,
      debouncedRequestCount: 4,
      executeImmediateCount: 1,
      executeDebouncedCount: 3,
      pendingOverwriteCount: 2,
      suppressedRequestCount: 1,
      suppressedExecuteCount: 1,
      debouncedScheduleCount: 3,
      reusedDebouncedScheduleCount: 1,
      builderWaitScheduleCount: 1,
      staleWakeupCount: 0,
      reasonCount: 2,
      topReason: 'apply-board-material',
      topReasonRequestCount: 4,
      topReasonExecuteCount: 3,
    },
    windowBuildDebugTopReasons: [
      {
        reason: 'apply-board-material',
        requestCount: 4,
        executeCount: 3,
        immediateRequestCount: 1,
        debouncedRequestCount: 3,
        executeImmediateCount: 1,
        executeDebouncedCount: 2,
      },
    ],
    windowBuildFlowPressureSummary: {
      'project.save-load.roundtrip': {
        durationMs: 440,
        requestCount: 6,
        executeCount: 4,
        immediateRequestCount: 2,
        debouncedRequestCount: 4,
        executeImmediateCount: 1,
        executeDebouncedCount: 3,
        pendingOverwriteCount: 2,
        suppressedRequestCount: 1,
        suppressedExecuteCount: 1,
        debounceCount: 4,
        builderWaitScheduleCount: 1,
        staleWakeupCount: 0,
        topReasons: ['apply-board-material'],
      },
    },
    journeyBuildPressureSummary: {
      'cabinet-build-variants': {
        stepCount: 2,
        totalDurationMs: 780,
        requestCount: 9,
        executeCount: 6,
        immediateRequestCount: 2,
        debouncedRequestCount: 7,
        executeImmediateCount: 1,
        executeDebouncedCount: 5,
        pendingOverwriteCount: 3,
        suppressedRequestCount: 2,
        suppressedExecuteCount: 1,
        debounceCount: 5,
        builderWaitScheduleCount: 1,
        staleWakeupCount: 0,
        topReasons: ['apply-board-material', 'toggle-door-style'],
      },
    },
    journeyStoreSourceSummary: {
      'project-roundtrip': {
        'PATCH:actions.project.save:config+meta': {
          key: 'PATCH:actions.project.save:config+meta',
          source: 'actions.project.save',
          type: 'PATCH',
          slices: ['config', 'meta'],
          count: 3,
          totalMs: 24,
          maxMs: 11,
          slowCount: 1,
          stepCount: 1,
          steps: ['project.save-load.roundtrip'],
        },
      },
    },
    userJourneyDiagnosisSummary: {
      'project-roundtrip': {
        stepCount: 1,
        burstyStepCount: 1,
        repeatedSourceCount: 0,
        dominantSourceSharePct: 67,
        primaryBottleneck: 'duration-heavy',
        totalDurationMs: 440,
        totalSourceMs: 36,
        commitCount: 8,
        selectorNotifyCount: 16,
        topStepName: 'project.save-load.roundtrip',
        topStepCommitCount: 8,
        topStepSelectorNotifyCount: 16,
        topStepTotalSourceMs: 36,
        topSourceKey: 'PATCH:actions.project.save:config+meta',
        topSourceTotalMs: 24,
        topSourceStepCount: 1,
        topSources: ['PATCH:actions.project.save:config+meta'],
        burstySteps: ['project.save-load.roundtrip'],
      },
    },
    projectActionEvents: [
      { action: 'save', ok: true, pending: false },
      { action: 'load', ok: true, pending: false },
    ],
    stateIntegrityChecks: [
      {
        name: 'pressure.loops.keep-user-state',
        ok: true,
        expected: { projectName: 'Saved', savedColorValues: ['#112233'] },
        actual: { savedColorValues: ['#112233'], projectName: 'Saved' },
      },
    ],
    windowPerfSummary: {
      'project.save': {
        count: 1,
        okCount: 1,
        errorCount: 0,
        markCount: 0,
        totalMs: 25,
        averageMs: 25,
        p95Ms: 25,
        maxMs: 25,
      },
      'project.load': {
        count: 2,
        okCount: 1,
        errorCount: 1,
        markCount: 0,
        totalMs: 55,
        averageMs: 27.5,
        p95Ms: 35,
        maxMs: 35,
      },
    },
    windowPerfEntries: [
      { name: 'project.save', durationMs: 25, status: 'ok' },
      { name: 'project.load', durationMs: 20, status: 'ok' },
      { name: 'project.load', durationMs: 35, status: 'error', error: 'invalid' },
    ],
  };

  const summary = createRuntimeIssueSummary(result.runtimeIssues);
  assert.deepEqual(summary, {
    pageErrors: ['boom'],
    consoleErrors: ['nope'],
    totalCount: 2,
  });

  const actionSummary = createProjectActionSummary(result.projectActionEvents);
  assert.equal(actionSummary.save.okCount, 1);

  const md = summarizeBrowserPerfResult(result, {
    requiredRuntimeMetrics: ['project.save'],
    requiredRuntimeMetricMinimumCounts: { 'project.save': 2 },
    requiredProjectActions: ['save', 'load'],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    requiredRuntimeOutcomeCoverage: { 'project.load': { ok: 1, error: 1 } },
    requiredRuntimeRecoverySequences: {
      'project.load': {
        recoveredCount: 1,
        stableRecoveryCount: 1,
        cleanRecoveryCount: 1,
        minPostRecoveryOkStreak: 3,
        maxRecoverySpanEntries: 1,
        maxRelapseCount: 0,
      },
    },
  });
  assert.match(md, /Runtime health/);
  assert.match(md, /Page errors: 1/);
  assert.match(md, /Console errors: 1/);
  assert.match(md, /Clipboard writes: 3/);
  assert.match(md, /save: count=1, ok=1, failure=0, pending=0/);
  assert.match(md, /Store write pressure/);
  assert.match(
    md,
    /Store commits: 9, no-op skips: 2, selector notifications: 18, tracked sources: 2, slow sources: 1, total source time: 36ms/
  );
  assert.match(md, /Store-heavy user-flow steps/);
  assert.match(
    md,
    /project\.save-load\.roundtrip: commits=8, selectorNotify=16, sourceTime=36ms, duration=440ms, topSources=PATCH:actions\.project\.save:config\+meta/
  );
  assert.match(md, /Top store sources/);
  assert.match(md, /Builder scheduling pressure/);
  assert.match(
    md,
    /Build requests: 6, executes: 4, pending overwrites: 2, suppressed requests: 1, suppressed executes: 1, debounce schedules: 3/
  );
  assert.match(md, /Build-heavy user-flow steps/);
  assert.match(
    md,
    /project\.save-load\.roundtrip: requests=6, executes=4, pendingOverwrites=2, suppressedRequests=1, debounce=4, duration=440ms, topReasons=apply-board-material/
  );
  assert.match(md, /Top build reasons/);
  assert.match(md, /apply-board-material: requests=4, executes=3, immediateRequests=1, debouncedRequests=3/);
  assert.match(md, /Build-heavy customer journeys/);
  assert.match(
    md,
    /cabinet-build-variants: steps=2, requests=9, executes=6, pendingOverwrites=3, suppressedRequests=2, debounce=5, total=780ms, topReasons=apply-board-material, toggle-door-style/
  );
  assert.match(md, /Customer journeys/);
  assert.match(
    md,
    /project-roundtrip: steps=1, total=440ms, avgStep=440ms, maxStep=440ms, commits=8, selectorNotify=16, sourceTime=36ms/
  );
  assert.match(md, /Journey diagnosis/);
  assert.match(
    md,
    /project-roundtrip: bottleneck=duration-heavy, burstySteps=1, repeatedSources=0, dominantSourceShare=67%, topStep=project\.save-load\.roundtrip, topSource=PATCH:actions\.project\.save:config\+meta, burstyStepNames=project\.save-load\.roundtrip/
  );
  assert.match(md, /Required customer journey coverage/);
  assert.match(md, /- none required/);
  assert.match(
    md,
    /PATCH:actions\.project\.save:config\+meta: source=actions\.project\.save, type=PATCH, slices=config\+meta, count=3, total=24ms, max=11ms, slow=1/
  );
  assert.match(md, /Runtime outcome coverage/);
  assert.match(md, /project\.load: statuses=ok\/error, ok=1, error=1, mark=0, mixed=yes/);
  assert.match(md, /Required mixed-outcome coverage/);
  assert.match(md, /Runtime recovery transitions/);
  assert.match(md, /project\.load: transitions=ok->error, last=error, destabilizations=1, recoveries=0/);
  assert.match(md, /Required recovery transitions/);
  assert.match(md, /Runtime recovery proveout/);
  assert.match(
    md,
    /project\.load: disruptions=1, recovered=0, stableRecoveries=0, cleanRecoveries=0, relapses=0, unresolved=1, recoverySpan<=0 entries, postRecoveryOkStreak=0, paths=none/
  );
  assert.match(md, /Required recovery proveout/);
  assert.match(md, /Runtime recovery debt/);
  assert.match(md, /Runtime recovery hangover/);
  assert.match(md, /no recovery hangover recorded/);
  assert.match(
    md,
    /project\.load: debtCount=1, totalDebt=35ms, avgDebt=35ms, p95Debt=35ms, maxDebt=35ms, maxDebtEntries=1, unresolved=1/
  );
  assert.match(md, /project\.save: count=1, ok=1, error=0, mark=0/);
  assert.match(md, /Required metric coverage/);
  assert.match(md, /State integrity checks/);
  assert.match(md, /pressure\.loops\.keep-user-state: ok/);
  assert.match(md, /project.save: count=1, required>=2/);
  assert.match(md, /Sustained-use pressure signals/);
  assert.match(md, /Runtime domains/);
  assert.match(
    md,
    /project: required=1\/1, metrics=2, entries=3, errors=1, marks=0, total=80ms, maxP95=35ms, worstDrift=0%/
  );
  assert.match(md, /Hotspot candidates/);
  assert.match(md, /project.save: total=25ms, p95=25ms, max=25ms, count=1, errors=0/);
});

test('browser perf support ranks hotspot candidates by errors and time cost', () => {
  const hotspots = rankBrowserPerfHotspots({
    'export.copy': { count: 2, errorCount: 1, totalMs: 80, p95Ms: 45, maxMs: 50 },
    'project.load': { count: 1, errorCount: 0, totalMs: 150, p95Ms: 150, maxMs: 150 },
    'orderPdf.open': { count: 4, errorCount: 0, totalMs: 200, p95Ms: 70, maxMs: 90 },
  });

  assert.deepEqual(
    hotspots.map(item => item.name),
    ['export.copy', 'orderPdf.open', 'project.load']
  );
});

test('browser perf support can rebuild metric summaries from raw entries', () => {
  const summary = createPerfSummaryFromEntries([
    { name: 'export.copy', durationMs: 10, status: 'ok' },
    { name: 'export.copy', durationMs: 30, status: 'error', error: 'clipboard' },
    { name: 'orderPdf.open', durationMs: 55, status: 'ok' },
  ]);

  assert.deepEqual(summary['export.copy'], {
    count: 2,
    okCount: 1,
    errorCount: 1,
    markCount: 0,
    errorRate: 50,
    totalMs: 40,
    averageMs: 20,
    minMs: 10,
    maxMs: 30,
    p50Ms: 10,
    p95Ms: 30,
    lastDurationMs: 30,
    lastStatus: 'error',
    lastError: 'clipboard',
  });
  assert.equal(summary['orderPdf.open'].p95Ms, 55);
});

test('browser perf support summarizes repeated-action pressure and ranks drift-heavy metrics', () => {
  const pressure = createRepeatedMetricPressureSummary(
    [
      { name: 'export.copy', durationMs: 10, status: 'ok' },
      { name: 'export.copy', durationMs: 14, status: 'ok' },
      { name: 'export.copy', durationMs: 22, status: 'ok' },
      { name: 'export.copy', durationMs: 30, status: 'error' },
      { name: 'orderPdf.open', durationMs: 25, status: 'ok' },
      { name: 'orderPdf.open', durationMs: 26, status: 'ok' },
      { name: 'orderPdf.open', durationMs: 27, status: 'ok' },
    ],
    { 'export.copy': 4, 'orderPdf.open': 3 }
  );

  assert.deepEqual(pressure['export.copy'], {
    count: 4,
    minimumCount: 4,
    okCount: 3,
    errorCount: 1,
    markCount: 0,
    firstAvgMs: 12,
    lastAvgMs: 26,
    driftMs: 14,
    driftPct: 116.67,
    fastestMs: 10,
    slowestMs: 30,
  });
  assert.equal(pressure['orderPdf.open'].driftPct, 8);

  const ranked = rankRepeatedMetricPressure(pressure, 2);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['export.copy', 'orderPdf.open']
  );
});

test('browser perf support summarizes mixed runtime outcomes canonically and ranks coverage risk', () => {
  const outcomeSummary = createRuntimeOutcomeCoverageSummary({
    'project.load': { count: 2, okCount: 1, errorCount: 1, markCount: 0 },
    'project.restoreLastSession': { count: 2, okCount: 1, errorCount: 0, markCount: 1 },
    'export.copy': { count: 3, okCount: 3, errorCount: 0, markCount: 0 },
  });

  assert.deepEqual(outcomeSummary['project.load'], {
    count: 2,
    okCount: 1,
    errorCount: 1,
    markCount: 0,
    nonOkCount: 1,
    observedStatuses: ['ok', 'error'],
    hasMixedOutcomes: true,
  });
  assert.deepEqual(outcomeSummary['project.restoreLastSession'].observedStatuses, ['ok', 'mark']);

  const ranked = rankRuntimeOutcomeCoverage(outcomeSummary, 3);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['project.load', 'project.restoreLastSession']
  );
});

test('browser perf support summarizes runtime status transitions canonically and baseline evaluation enforces recovery transitions', () => {
  const transitionSummary = createRuntimeStatusTransitionSummary([
    { name: 'project.load', durationMs: 20, status: 'ok' },
    { name: 'project.load', durationMs: 30, status: 'error' },
    { name: 'project.load', durationMs: 25, status: 'ok' },
    { name: 'project.restoreLastSession', durationMs: 18, status: 'ok' },
    { name: 'project.restoreLastSession', durationMs: 0, status: 'mark' },
    { name: 'project.restoreLastSession', durationMs: 22, status: 'ok' },
  ]);

  assert.deepEqual(transitionSummary['project.load'], {
    count: 3,
    transitionCount: 2,
    firstStatus: 'ok',
    lastStatus: 'ok',
    transitionCounts: { 'error->ok': 1, 'ok->error': 1 },
    observedTransitions: ['error->ok', 'ok->error'],
    destabilizationCount: 1,
    recoveryToOkCount: 1,
    errorRecoveryCount: 1,
    quietRecoveryCount: 0,
  });
  assert.deepEqual(transitionSummary['project.restoreLastSession'].transitionCounts, {
    'mark->ok': 1,
    'ok->mark': 1,
  });

  const ranked = rankRuntimeStatusTransitions(transitionSummary, 2);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['project.load', 'project.restoreLastSession']
  );

  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [
      { name: 'project.load', durationMs: 20, status: 'ok' },
      { name: 'project.load', durationMs: 30, status: 'error' },
      { name: 'project.load', durationMs: 25, status: 'ok' },
      { name: 'project.restoreLastSession', durationMs: 18, status: 'ok' },
      { name: 'project.restoreLastSession', durationMs: 0, status: 'mark' },
      { name: 'project.restoreLastSession', durationMs: 22, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 12, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 8, status: 'error' },
      { name: 'settingsBackup.import', durationMs: 11, status: 'ok' },
    ],
  };

  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    requiredRuntimeStatusTransitions: {
      'project.load': { 'ok->error': 1, 'error->ok': 1 },
      'project.restoreLastSession': { 'ok->mark': 1, 'mark->ok': 1 },
      'settingsBackup.import': { 'ok->error': 1, 'error->ok': 1 },
    },
  });

  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
      requiredRuntimeStatusTransitions: {
        'project.load': { 'ok->error': 1, 'error->ok': 1 },
        'project.restoreLastSession': { 'ok->mark': 1, 'mark->ok': 1 },
        'settingsBackup.import': { 'ok->error': 1, 'error->ok': 1 },
      },
    }),
    []
  );

  const broken = {
    ...clean,
    windowPerfEntries: [
      { name: 'project.load', durationMs: 20, status: 'ok' },
      { name: 'project.load', durationMs: 30, status: 'error' },
      { name: 'project.restoreLastSession', durationMs: 18, status: 'ok' },
      { name: 'project.restoreLastSession', durationMs: 0, status: 'mark' },
      { name: 'settingsBackup.import', durationMs: 12, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 8, status: 'error' },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
    requiredRuntimeStatusTransitions: {
      'project.load': { 'ok->error': 1, 'error->ok': 1 },
      'project.restoreLastSession': { 'ok->mark': 1, 'mark->ok': 1 },
      'settingsBackup.import': { 'ok->error': 1, 'error->ok': 1 },
    },
  });
  assert.ok(failures.some(item => /project\.load runtime status transition missing error->ok/.test(item)));
  assert.ok(
    failures.some(item => /project\.restoreLastSession runtime status transition missing mark->ok/.test(item))
  );
  assert.ok(
    failures.some(item => /settingsBackup\.import runtime status transition missing error->ok/.test(item))
  );
});

test('browser perf support summarizes runtime recovery proveout canonically and baseline evaluation enforces clean recovery windows', () => {
  const entries = [
    { name: 'project.load', durationMs: 20, status: 'ok' },
    { name: 'project.load', durationMs: 30, status: 'error' },
    { name: 'project.load', durationMs: 25, status: 'ok' },
    { name: 'project.load', durationMs: 24, status: 'ok' },
    { name: 'project.load', durationMs: 23, status: 'ok' },
    { name: 'settingsBackup.import', durationMs: 12, status: 'ok' },
    { name: 'settingsBackup.import', durationMs: 8, status: 'error' },
    { name: 'settingsBackup.import', durationMs: 11, status: 'ok' },
    { name: 'settingsBackup.import', durationMs: 10, status: 'ok' },
    { name: 'settingsBackup.import', durationMs: 9, status: 'ok' },
  ];

  const summary = createRuntimeRecoverySequenceSummary(entries);
  assert.deepEqual(summary['project.load'], {
    count: 5,
    disruptionCount: 1,
    recoveredCount: 1,
    stableRecoveryCount: 1,
    cleanRecoveryCount: 1,
    relapseCount: 0,
    unresolvedCount: 0,
    maxRecoverySpanEntries: 1,
    maxPostRecoveryOkStreak: 3,
    minPostRecoveryOkStreak: 3,
    firstStatus: 'ok',
    lastStatus: 'ok',
    observedRecoveryPaths: ['error->ok'],
  });

  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: entries,
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(baseline.requiredRuntimeRecoverySequences['project.load'], {
    recoveredCount: 1,
    stableRecoveryCount: 1,
    cleanRecoveryCount: 1,
    minPostRecoveryOkStreak: 3,
    maxRecoverySpanEntries: 1,
    maxRelapseCount: 0,
    requiredRecoveryPaths: ['error->ok'],
    unresolvedCount: 0,
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const broken = {
    ...clean,
    windowPerfEntries: [
      { name: 'project.load', durationMs: 20, status: 'ok' },
      { name: 'project.load', durationMs: 30, status: 'error' },
      { name: 'project.load', durationMs: 25, status: 'ok' },
      { name: 'project.load', durationMs: 31, status: 'ok' },
      { name: 'project.load', durationMs: 28, status: 'error' },
      { name: 'project.load', durationMs: 24, status: 'ok' },
      { name: 'project.load', durationMs: 23, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 12, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 8, status: 'error' },
      { name: 'settingsBackup.import', durationMs: 11, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 10, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 9, status: 'ok' },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(
    failures.some(item => /project\.load runtime recovery proveout missing clean recovery windows/.test(item))
  );
  assert.ok(
    failures.some(item =>
      /project\.load runtime recovery proveout relapsed before the clean window closed/.test(item)
    )
  );
});

test('browser perf support summarizes runtime recovery hangover canonically and baseline evaluation enforces hangover budgets', () => {
  const entries = [
    { name: 'project.load', durationMs: 10, status: 'ok' },
    { name: 'project.load', durationMs: 10, status: 'ok' },
    { name: 'project.load', durationMs: 4, status: 'error' },
    { name: 'project.load', durationMs: 20, status: 'ok' },
    { name: 'project.load', durationMs: 18, status: 'ok' },
    { name: 'project.load', durationMs: 11, status: 'ok' },
    { name: 'project.load', durationMs: 5, status: 'error' },
    { name: 'project.load', durationMs: 22, status: 'ok' },
    { name: 'project.load', durationMs: 21, status: 'ok' },
    { name: 'project.load', durationMs: 12, status: 'ok' },
  ];

  const summary = createRuntimeRecoveryHangoverSummary(entries);
  assert.deepEqual(summary['project.load'], {
    count: 10,
    disruptionCount: 2,
    recoveredCount: 2,
    steadyOkCount: 4,
    immediateRecoveryOkCount: 2,
    settlingOkCount: 2,
    baselineMedianMs: 10,
    p95ImmediateRecoveryOkMs: 22,
    maxImmediateRecoveryOkMs: 22,
    p95SettlingOkMs: 21,
    maxSettlingOkMs: 21,
    p95RecoveryWindowMs: 22,
    maxRecoveryWindowMs: 22,
    p95HangoverRatio: 2.2,
    maxHangoverRatio: 2.2,
    p95HangoverDeltaMs: 12,
    maxHangoverDeltaMs: 12,
    lingeringSettlingCount: 2,
  });

  const ranked = rankRuntimeRecoveryHangover(summary, 3);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['project.load']
  );

  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: entries,
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(createRuntimeRecoveryHangoverBudget(summary), baseline.runtimeRecoveryHangoverBudget);
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const broken = {
    ...clean,
    windowPerfEntries: [
      { name: 'project.load', durationMs: 10, status: 'ok' },
      { name: 'project.load', durationMs: 10, status: 'ok' },
      { name: 'project.load', durationMs: 4, status: 'error' },
      { name: 'project.load', durationMs: 50, status: 'ok' },
      { name: 'project.load', durationMs: 48, status: 'ok' },
      { name: 'project.load', durationMs: 11, status: 'ok' },
      { name: 'project.load', durationMs: 5, status: 'error' },
      { name: 'project.load', durationMs: 52, status: 'ok' },
      { name: 'project.load', durationMs: 49, status: 'ok' },
      { name: 'project.load', durationMs: 12, status: 'ok' },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(
    failures.some(item => /project\.load runtime recovery hangover p95 ratio exceeded budget/.test(item))
  );
  assert.ok(
    failures.some(item => /project\.load runtime recovery hangover max delta exceeded budget/.test(item))
  );
});

test('browser perf support summarizes runtime recovery debt canonically and baseline evaluation enforces debt budgets', () => {
  const entries = [
    { name: 'project.load', durationMs: 12, status: 'ok' },
    { name: 'project.load', durationMs: 8, status: 'error' },
    { name: 'project.load', durationMs: 14, status: 'ok' },
    { name: 'project.load', durationMs: 6, status: 'error' },
    { name: 'project.load', durationMs: 16, status: 'ok' },
    { name: 'project.restoreLastSession', durationMs: 0, status: 'mark' },
    { name: 'project.restoreLastSession', durationMs: 20, status: 'ok' },
    { name: 'settingsBackup.import', durationMs: 5, status: 'error' },
  ];

  const summary = createRuntimeRecoveryDebtSummary(entries);
  assert.deepEqual(summary['project.load'], {
    count: 5,
    disruptionCount: 2,
    recoveredCount: 2,
    unresolvedCount: 0,
    debtCount: 2,
    totalDebtMs: 44,
    averageDebtMs: 22,
    p95DebtMs: 22,
    minDebtMs: 22,
    maxDebtMs: 22,
    totalDebtEntries: 4,
    averageDebtEntries: 2,
    maxDebtEntries: 2,
    unresolvedDebtMs: 0,
  });
  assert.deepEqual(summary['project.restoreLastSession'], {
    count: 2,
    disruptionCount: 1,
    recoveredCount: 1,
    unresolvedCount: 0,
    debtCount: 1,
    totalDebtMs: 20,
    averageDebtMs: 20,
    p95DebtMs: 20,
    minDebtMs: 20,
    maxDebtMs: 20,
    totalDebtEntries: 2,
    averageDebtEntries: 2,
    maxDebtEntries: 2,
    unresolvedDebtMs: 0,
  });
  assert.deepEqual(summary['settingsBackup.import'], {
    count: 1,
    disruptionCount: 1,
    recoveredCount: 0,
    unresolvedCount: 1,
    debtCount: 1,
    totalDebtMs: 5,
    averageDebtMs: 5,
    p95DebtMs: 5,
    minDebtMs: 5,
    maxDebtMs: 5,
    totalDebtEntries: 1,
    averageDebtEntries: 1,
    maxDebtEntries: 1,
    unresolvedDebtMs: 5,
  });

  const ranked = rankRuntimeRecoveryDebt(summary, 3);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['settingsBackup.import', 'project.load', 'project.restoreLastSession']
  );

  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: entries,
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(createRuntimeRecoveryDebtBudgetMs(summary), baseline.runtimeRecoveryDebtBudgetMs);
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const broken = {
    ...clean,
    windowPerfEntries: [
      { name: 'project.load', durationMs: 12, status: 'ok' },
      { name: 'project.load', durationMs: 8, status: 'error' },
      { name: 'project.load', durationMs: 70, status: 'ok' },
      { name: 'project.load', durationMs: 6, status: 'error' },
      { name: 'project.load', durationMs: 71, status: 'ok' },
      { name: 'project.restoreLastSession', durationMs: 0, status: 'mark' },
      { name: 'project.restoreLastSession', durationMs: 20, status: 'ok' },
      { name: 'settingsBackup.import', durationMs: 5, status: 'error' },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /project\.load runtime recovery debt exceeded budget/.test(item)));
});

test('browser perf support summarizes state integrity checks canonically and baseline evaluation enforces them', () => {
  const summary = createStateIntegritySummary([
    {
      name: 'project.restore-last-session.saved-state',
      ok: true,
      expected: { projectName: 'Saved', savedColorValues: ['#111111', '#ffffff'] },
      actual: { savedColorValues: ['#111111', '#ffffff'], projectName: 'Saved' },
    },
    {
      name: 'pressure.loops.keep-user-state',
      ok: false,
      expected: { projectName: '', savedColorValues: ['#111111'] },
      actual: { projectName: '', savedColorValues: ['#111111', '#222222'] },
      message: 'Pressure loops mutated user state',
    },
  ]);

  assert.deepEqual(summary['project.restore-last-session.saved-state'], {
    ok: true,
    expectedText: '{"projectName":"Saved","savedColorValues":["#111111","#ffffff"]}',
    actualText: '{"projectName":"Saved","savedColorValues":["#111111","#ffffff"]}',
  });
  assert.equal(summary['pressure.loops.keep-user-state'].ok, false);
  assert.match(summary['pressure.loops.keep-user-state'].messageText || '', /mutated user state/);

  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    stateIntegrityChecks: [
      {
        name: 'pressure.loops.keep-user-state',
        ok: true,
        expected: { projectName: '', savedColorValues: [] },
        actual: { projectName: '', savedColorValues: [] },
      },
    ],
    windowPerfEntries: [],
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const broken = {
    ...clean,
    stateIntegrityChecks: [
      {
        name: 'pressure.loops.keep-user-state',
        ok: false,
        expected: { projectName: '', savedColorValues: [] },
        actual: { projectName: 'Mutated', savedColorValues: ['#123456'] },
      },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(
    failures.some(item => /State integrity check failed: pressure\.loops\.keep-user-state/.test(item))
  );
});

test('browser perf support baseline evaluation enforces sustained-use drift budgets for repeated metrics', () => {
  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [
      { name: 'export.copy', durationMs: 20, status: 'ok' },
      { name: 'export.copy', durationMs: 21, status: 'ok' },
      { name: 'export.copy', durationMs: 24, status: 'ok' },
      { name: 'export.copy', durationMs: 25, status: 'ok' },
    ],
  };

  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: { 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  const pass = evaluateBrowserPerfBaseline(clean, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: { 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.deepEqual(pass, []);

  const drifted = {
    ...clean,
    windowPerfEntries: [
      { name: 'export.copy', durationMs: 20, status: 'ok' },
      { name: 'export.copy', durationMs: 21, status: 'ok' },
      { name: 'export.copy', durationMs: 52, status: 'ok' },
      { name: 'export.copy', durationMs: 59, status: 'ok' },
    ],
  };
  const failures = evaluateBrowserPerfBaseline(drifted, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: { 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /export.copy sustained-use drift exceeded budget/.test(item)));
});

test('browser perf support baseline evaluation enforces mixed outcome coverage for resilience metrics', () => {
  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfSummary: {
      'project.load': { count: 2, okCount: 1, errorCount: 1, markCount: 0, p95Ms: 40 },
      'project.restoreLastSession': { count: 2, okCount: 1, errorCount: 0, markCount: 1, p95Ms: 35 },
      'settingsBackup.import': { count: 3, okCount: 2, errorCount: 1, markCount: 0, p95Ms: 30 },
    },
    windowPerfEntries: [],
  };

  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    requiredRuntimeOutcomeCoverage: {
      'project.load': { ok: 1, error: 1 },
      'project.restoreLastSession': { ok: 1, mark: 1 },
      'settingsBackup.import': { ok: 2, error: 1 },
    },
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
      requiredRuntimeOutcomeCoverage: {
        'project.load': { ok: 1, error: 1 },
        'project.restoreLastSession': { ok: 1, mark: 1 },
        'settingsBackup.import': { ok: 2, error: 1 },
      },
    }),
    []
  );

  const broken = {
    ...clean,
    windowPerfSummary: {
      'project.load': { count: 1, okCount: 1, errorCount: 0, markCount: 0, p95Ms: 40 },
      'project.restoreLastSession': { count: 2, okCount: 2, errorCount: 0, markCount: 0, p95Ms: 35 },
      'settingsBackup.import': { count: 2, okCount: 1, errorCount: 1, markCount: 0, p95Ms: 30 },
    },
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
    requiredRuntimeOutcomeCoverage: {
      'project.load': { ok: 1, error: 1 },
      'project.restoreLastSession': { ok: 1, mark: 1 },
      'settingsBackup.import': { ok: 2, error: 1 },
    },
  });
  assert.ok(failures.some(item => /project\.load runtime outcome coverage missing error status/.test(item)));
  assert.ok(
    failures.some(item =>
      /project\.restoreLastSession runtime outcome coverage missing mark status/.test(item)
    )
  );
  assert.ok(
    failures.some(item => /settingsBackup\.import runtime outcome coverage missing ok status/.test(item))
  );
});

test('browser perf support baseline evaluation enforces runtime issues, required metrics, counts, and budgets', () => {
  const clean = {
    userFlow: {
      'boot.app-shell': 200,
      'project.save-load.roundtrip': 450,
    },
    runtimeIssues: {
      pageErrors: [],
      consoleErrors: [],
    },
    projectActionEvents: [
      { action: 'save', ok: true, pending: false },
      { action: 'load', ok: true, pending: false },
    ],
    windowPerfSummary: {
      'project.save': { count: 2, okCount: 2, errorCount: 0, markCount: 0, p95Ms: 30 },
      'project.load': { count: 1, okCount: 1, errorCount: 0, markCount: 0, p95Ms: 35 },
    },
    windowPerfEntries: [],
  };

  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.save', 'project.load'],
    requiredRuntimeMetricMinimumCounts: { 'project.save': 2, 'project.load': 1 },
    requiredProjectActions: ['save', 'load'],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  const pass = evaluateBrowserPerfBaseline(clean, baseline, {
    requiredRuntimeMetrics: ['project.save', 'project.load'],
    requiredRuntimeMetricMinimumCounts: { 'project.save': 2, 'project.load': 1 },
    requiredProjectActions: ['save', 'load'],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: ['project.save', 'project.load'],
  });
  assert.deepEqual(pass, []);

  const noisy = {
    ...clean,
    runtimeIssues: {
      pageErrors: ['blocked'],
      consoleErrors: [],
    },
    projectActionEvents: [{ action: 'save', ok: false, pending: false, reason: 'error' }],
    windowPerfSummary: {
      'project.save': { count: 1, okCount: 0, errorCount: 1, markCount: 0, p95Ms: 999 },
    },
  };
  const failures = evaluateBrowserPerfBaseline(noisy, baseline, {
    requiredRuntimeMetrics: ['project.save', 'project.load'],
    requiredRuntimeMetricMinimumCounts: { 'project.save': 2, 'project.load': 1 },
    requiredProjectActions: ['save', 'load'],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: ['project.save'],
  });
  assert.ok(failures.some(item => /project.save runtime count below required coverage/.test(item)));
  assert.ok(failures.some(item => /Missing runtime perf metric: project.load/.test(item)));
  assert.ok(failures.some(item => /project.save runtime p95 exceeded budget/.test(item)));
  assert.ok(failures.some(item => /project.save recorded runtime errors/.test(item)));
  assert.ok(failures.some(item => /Missing project action event: load/.test(item)));
  assert.ok(failures.some(item => /Project action did not complete successfully: save/.test(item)));
  assert.ok(failures.some(item => /Runtime issues detected/.test(item)));
});

test('browser perf support groups runtime metrics into stable domains and ranks domain risk', () => {
  assert.equal(classifyRuntimeMetricDomain('export.copy'), 'export');
  assert.equal(classifyRuntimeMetricDomain('cloudSync.floatingSync.toggle'), 'cloud-sync');
  assert.equal(classifyRuntimeMetricDomain('mystery.metric'), 'other');

  const runtimeSummary = createPerfSummaryFromEntries([
    { name: 'export.copy', durationMs: 20, status: 'ok' },
    { name: 'export.copy', durationMs: 30, status: 'error', error: 'clipboard' },
    { name: 'orderPdf.open', durationMs: 60, status: 'ok' },
    { name: 'project.load', durationMs: 40, status: 'ok' },
  ]);
  const pressureSummary = createRepeatedMetricPressureSummary(
    [
      { name: 'export.copy', durationMs: 20, status: 'ok' },
      { name: 'export.copy', durationMs: 22, status: 'ok' },
      { name: 'export.copy', durationMs: 34, status: 'ok' },
      { name: 'export.copy', durationMs: 40, status: 'ok' },
      { name: 'orderPdf.open', durationMs: 50, status: 'ok' },
      { name: 'orderPdf.open', durationMs: 51, status: 'ok' },
      { name: 'orderPdf.open', durationMs: 52, status: 'ok' },
    ],
    { 'export.copy': 4, 'orderPdf.open': 3 }
  );
  const domains = createPerfDomainSummary(
    runtimeSummary,
    pressureSummary,
    ['export.copy', 'orderPdf.open', 'project.load', 'settingsBackup.import'],
    { 'export.copy': 4, 'orderPdf.open': 3, 'project.load': 1, 'settingsBackup.import': 1 }
  );

  assert.deepEqual(domains.export, {
    name: 'export',
    metricCount: 1,
    entryCount: 2,
    totalMs: 50,
    errorCount: 1,
    markCount: 0,
    maxP95Ms: 30,
    maxDurationMs: 30,
    pressureMetricCount: 1,
    worstDriftPct: 76.19,
    requiredMetricCount: 1,
    presentRequiredMetricCount: 1,
    missingRequiredMetricCount: 0,
    underfilledRequiredMetricCount: 1,
    metrics: ['export.copy'],
  });
  assert.equal(domains['settings-backup'].missingRequiredMetricCount, 1);

  const ranked = rankPerfDomains(domains, 3);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['export', 'settings-backup', 'order-pdf']
  );
});

test('browser perf support summarizes store write pressure and ranks noisy sources', () => {
  const stats = {
    commitCount: 9,
    noopSkipCount: 2,
    selectorListenerCount: 4,
    selectorNotifyCount: 18,
    sources: {
      'PATCH:actions.project.save:config+meta': {
        source: 'actions.project.save',
        type: 'PATCH',
        slices: ['config', 'meta'],
        count: 3,
        totalMs: 24,
        maxMs: 11,
        lastMs: 8,
        slowCount: 1,
      },
      'PATCH:actions.render.toggle:runtime': {
        source: 'actions.render.toggle',
        type: 'PATCH',
        slices: ['runtime'],
        count: 4,
        totalMs: 12,
        maxMs: 4,
        lastMs: 3,
        slowCount: 0,
      },
    },
  };

  assert.deepEqual(createStoreDebugSummary(stats), {
    commitCount: 9,
    noopSkipCount: 2,
    selectorListenerCount: 4,
    selectorNotifyCount: 18,
    sourceCount: 2,
    slowSourceCount: 1,
    totalSourceMs: 36,
    topSourceKey: 'PATCH:actions.project.save:config+meta',
    topSourceCount: 3,
    topSourceTotalMs: 24,
  });

  const rankedSources = rankStoreDebugSources(stats, 2);
  assert.deepEqual(
    rankedSources.map(item => item.key),
    ['PATCH:actions.project.save:config+meta', 'PATCH:actions.render.toggle:runtime']
  );

  const flowSummary = createStoreFlowPressureSummary([
    {
      name: 'project.save-load.roundtrip',
      durationMs: 440,
      before: {
        commitCount: 1,
        noopSkipCount: 0,
        selectorListenerCount: 4,
        selectorNotifyCount: 2,
        sources: {},
      },
      after: stats,
    },
  ]);
  assert.deepEqual(flowSummary['project.save-load.roundtrip'], {
    durationMs: 440,
    commitCount: 8,
    noopSkipCount: 2,
    selectorNotifyCount: 16,
    selectorListenerCount: 4,
    sourceCount: 2,
    slowSourceCount: 1,
    totalSourceMs: 36,
    topSources: ['PATCH:actions.project.save:config+meta', 'PATCH:actions.render.toggle:runtime'],
  });

  const rankedSteps = rankStoreFlowPressure(flowSummary, 1);
  assert.equal(rankedSteps[0].name, 'project.save-load.roundtrip');

  const budget = createStorePressureBudget(flowSummary);
  assert.deepEqual(budget['project.save-load.roundtrip'], {
    maxCommitCount: 15,
    maxSelectorNotifyCount: 32,
    maxTotalSourceMs: 69,
  });
});

test('browser perf support summarizes build scheduling pressure canonically', () => {
  const stats = {
    requestCount: 10,
    immediateRequestCount: 3,
    debouncedRequestCount: 7,
    executeCount: 7,
    executeImmediateCount: 2,
    executeDebouncedCount: 5,
    pendingOverwriteCount: 3,
    debouncedScheduleCount: 4,
    reusedDebouncedScheduleCount: 2,
    builderWaitScheduleCount: 1,
    staleDebouncedTimerFireCount: 1,
    staleBuilderWaitWakeupCount: 0,
    duplicatePendingSignatureCount: 2,
    skippedDuplicatePendingRequestCount: 2,
    skippedSatisfiedRequestCount: 1,
    repeatedExecuteCount: 1,
    skippedRepeatedExecuteCount: 1,
    lastRequestReason: 'apply-board-material',
    lastExecuteReason: 'apply-board-material',
    reasons: {
      'apply-board-material': {
        requestCount: 6,
        executeCount: 4,
        immediateRequestCount: 1,
        debouncedRequestCount: 5,
        executeImmediateCount: 1,
        executeDebouncedCount: 3,
      },
      'toggle-door-style': {
        requestCount: 4,
        executeCount: 3,
        immediateRequestCount: 2,
        debouncedRequestCount: 2,
        executeImmediateCount: 1,
        executeDebouncedCount: 2,
      },
    },
  };

  assert.deepEqual(createBuildSummary(stats), {
    requestCount: 10,
    executeCount: 7,
    immediateRequestCount: 3,
    debouncedRequestCount: 7,
    executeImmediateCount: 2,
    executeDebouncedCount: 5,
    pendingOverwriteCount: 3,
    suppressedRequestCount: 3,
    suppressedExecuteCount: 1,
    debouncedScheduleCount: 4,
    reusedDebouncedScheduleCount: 2,
    builderWaitScheduleCount: 1,
    staleWakeupCount: 1,
    reasonCount: 2,
    topReason: 'apply-board-material',
    topReasonRequestCount: 6,
    topReasonExecuteCount: 4,
  });

  const rankedReasons = rankBuildReasons(stats, 2);
  assert.deepEqual(
    rankedReasons.map(item => item.reason),
    ['apply-board-material', 'toggle-door-style']
  );

  const flowSummary = createBuildFlowPressureSummary([
    {
      name: 'cabinet-build-variants.profile-texture.configure',
      durationMs: 360,
      before: {
        requestCount: 2,
        immediateRequestCount: 1,
        debouncedRequestCount: 1,
        executeCount: 1,
        executeImmediateCount: 1,
        executeDebouncedCount: 0,
        pendingOverwriteCount: 0,
        debouncedScheduleCount: 1,
        reusedDebouncedScheduleCount: 0,
        builderWaitScheduleCount: 0,
        staleDebouncedTimerFireCount: 0,
        staleBuilderWaitWakeupCount: 0,
        duplicatePendingSignatureCount: 0,
        skippedDuplicatePendingRequestCount: 0,
        skippedSatisfiedRequestCount: 0,
        repeatedExecuteCount: 0,
        skippedRepeatedExecuteCount: 0,
        reasons: {},
      },
      after: stats,
    },
  ]);
  assert.deepEqual(flowSummary['cabinet-build-variants.profile-texture.configure'], {
    durationMs: 360,
    requestCount: 8,
    executeCount: 6,
    immediateRequestCount: 2,
    debouncedRequestCount: 6,
    executeImmediateCount: 1,
    executeDebouncedCount: 5,
    pendingOverwriteCount: 3,
    suppressedRequestCount: 3,
    suppressedExecuteCount: 1,
    debounceCount: 5,
    builderWaitScheduleCount: 1,
    staleWakeupCount: 1,
    topReasons: ['apply-board-material', 'toggle-door-style'],
  });

  const rankedSteps = rankBuildFlowPressure(flowSummary, 1);
  assert.equal(rankedSteps[0].name, 'cabinet-build-variants.profile-texture.configure');

  const budget = createBuildPressureBudget(flowSummary);
  assert.deepEqual(budget['cabinet-build-variants.profile-texture.configure'], {
    maxRequestCount: 14,
    maxExecuteCount: 10,
    maxPendingOverwriteCount: 6,
    maxSuppressedRequestCount: 6,
    maxDebounceCount: 8,
  });

  const journeySummary = createJourneyBuildPressureSummary([
    {
      name: 'cabinet-build-variants.profile-texture.configure',
      durationMs: 360,
      journey: 'cabinet-build-variants',
      before: {
        requestCount: 2,
        immediateRequestCount: 1,
        debouncedRequestCount: 1,
        executeCount: 1,
        executeImmediateCount: 1,
        executeDebouncedCount: 0,
        pendingOverwriteCount: 0,
        debouncedScheduleCount: 1,
        reusedDebouncedScheduleCount: 0,
        builderWaitScheduleCount: 0,
        staleDebouncedTimerFireCount: 0,
        staleBuilderWaitWakeupCount: 0,
        duplicatePendingSignatureCount: 0,
        skippedDuplicatePendingRequestCount: 0,
        skippedSatisfiedRequestCount: 0,
        repeatedExecuteCount: 0,
        skippedRepeatedExecuteCount: 0,
        reasons: {},
      },
      after: stats,
    },
    {
      name: 'cabinet-build-variants.option-burst',
      durationMs: 420,
      journey: 'cabinet-build-variants',
      before: {
        requestCount: 10,
        immediateRequestCount: 3,
        debouncedRequestCount: 7,
        executeCount: 7,
        executeImmediateCount: 2,
        executeDebouncedCount: 5,
        pendingOverwriteCount: 3,
        debouncedScheduleCount: 4,
        reusedDebouncedScheduleCount: 2,
        builderWaitScheduleCount: 1,
        staleDebouncedTimerFireCount: 1,
        staleBuilderWaitWakeupCount: 0,
        duplicatePendingSignatureCount: 2,
        skippedDuplicatePendingRequestCount: 2,
        skippedSatisfiedRequestCount: 1,
        repeatedExecuteCount: 1,
        skippedRepeatedExecuteCount: 1,
        reasons: {
          'apply-board-material': {
            requestCount: 6,
            executeCount: 4,
            immediateRequestCount: 1,
            debouncedRequestCount: 5,
            executeImmediateCount: 1,
            executeDebouncedCount: 3,
          },
          'toggle-door-style': {
            requestCount: 4,
            executeCount: 3,
            immediateRequestCount: 2,
            debouncedRequestCount: 2,
            executeImmediateCount: 1,
            executeDebouncedCount: 2,
          },
        },
      },
      after: {
        requestCount: 14,
        immediateRequestCount: 4,
        debouncedRequestCount: 10,
        executeCount: 10,
        executeImmediateCount: 2,
        executeDebouncedCount: 8,
        pendingOverwriteCount: 4,
        debouncedScheduleCount: 7,
        reusedDebouncedScheduleCount: 3,
        builderWaitScheduleCount: 2,
        staleDebouncedTimerFireCount: 1,
        staleBuilderWaitWakeupCount: 1,
        duplicatePendingSignatureCount: 2,
        skippedDuplicatePendingRequestCount: 3,
        skippedSatisfiedRequestCount: 1,
        repeatedExecuteCount: 1,
        skippedRepeatedExecuteCount: 2,
        reasons: {
          'apply-board-material': {
            requestCount: 8,
            executeCount: 6,
            immediateRequestCount: 1,
            debouncedRequestCount: 7,
            executeImmediateCount: 1,
            executeDebouncedCount: 5,
          },
          'toggle-door-style': {
            requestCount: 6,
            executeCount: 4,
            immediateRequestCount: 3,
            debouncedRequestCount: 3,
            executeImmediateCount: 1,
            executeDebouncedCount: 3,
          },
        },
      },
    },
  ]);
  assert.deepEqual(journeySummary['cabinet-build-variants'], {
    stepCount: 2,
    totalDurationMs: 780,
    requestCount: 12,
    executeCount: 9,
    immediateRequestCount: 3,
    debouncedRequestCount: 9,
    executeImmediateCount: 1,
    executeDebouncedCount: 8,
    pendingOverwriteCount: 4,
    suppressedRequestCount: 4,
    suppressedExecuteCount: 2,
    debounceCount: 9,
    builderWaitScheduleCount: 2,
    staleWakeupCount: 2,
    reasons: {
      'apply-board-material': {
        requestCount: 8,
        executeCount: 6,
        immediateRequestCount: 1,
        debouncedRequestCount: 7,
        executeImmediateCount: 1,
        executeDebouncedCount: 5,
      },
      'toggle-door-style': {
        requestCount: 6,
        executeCount: 4,
        immediateRequestCount: 3,
        debouncedRequestCount: 3,
        executeImmediateCount: 1,
        executeDebouncedCount: 3,
      },
    },
    steps: ['cabinet-build-variants.profile-texture.configure', 'cabinet-build-variants.option-burst'],
    topReasons: ['apply-board-material', 'toggle-door-style'],
  });
  const rankedJourneys = rankJourneyBuildPressure(journeySummary, 1);
  assert.equal(rankedJourneys[0].name, 'cabinet-build-variants');
});

test('browser perf support baseline evaluation enforces build pressure budgets', () => {
  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [],
    windowBuildFlowPressureSummary: {
      'cabinet-build-variants.option-burst': {
        durationMs: 420,
        requestCount: 8,
        executeCount: 6,
        immediateRequestCount: 2,
        debouncedRequestCount: 6,
        executeImmediateCount: 1,
        executeDebouncedCount: 5,
        pendingOverwriteCount: 3,
        suppressedRequestCount: 2,
        suppressedExecuteCount: 1,
        debounceCount: 5,
        builderWaitScheduleCount: 1,
        staleWakeupCount: 1,
        topReasons: ['apply-board-material'],
      },
    },
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(baseline.buildPressureBudget['cabinet-build-variants.option-burst'], {
    maxRequestCount: 14,
    maxExecuteCount: 10,
    maxPendingOverwriteCount: 6,
    maxSuppressedRequestCount: 4,
    maxDebounceCount: 8,
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: [],
      requiredRuntimeMetricMinimumCounts: {},
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const noisy = {
    ...clean,
    windowBuildFlowPressureSummary: {
      'cabinet-build-variants.option-burst': {
        durationMs: 420,
        requestCount: 18,
        executeCount: 13,
        immediateRequestCount: 2,
        debouncedRequestCount: 16,
        executeImmediateCount: 1,
        executeDebouncedCount: 12,
        pendingOverwriteCount: 9,
        suppressedRequestCount: 7,
        suppressedExecuteCount: 2,
        debounceCount: 11,
        builderWaitScheduleCount: 2,
        staleWakeupCount: 1,
        topReasons: ['apply-board-material'],
      },
    },
  };
  const failures = evaluateBrowserPerfBaseline(noisy, baseline, {
    requiredRuntimeMetrics: [],
    requiredRuntimeMetricMinimumCounts: {},
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /build request pressure exceeded budget/.test(item)));
  assert.ok(failures.some(item => /build execute pressure exceeded budget/.test(item)));
  assert.ok(failures.some(item => /build pending-overwrite pressure exceeded budget/.test(item)));
  assert.ok(failures.some(item => /suppressed build-request pressure exceeded budget/.test(item)));
  assert.ok(failures.some(item => /build debounce pressure exceeded budget/.test(item)));
});

test('browser perf support groups user journeys and creates journey budgets canonically', () => {
  const storeFlowSummary = {
    'cabinet-core.configure': {
      durationMs: 380,
      commitCount: 6,
      noopSkipCount: 1,
      selectorNotifyCount: 14,
      selectorListenerCount: 4,
      sourceCount: 2,
      slowSourceCount: 1,
      totalSourceMs: 28,
      topSources: ['PATCH:actions.structure.dimensions:config'],
    },
    'cabinet-core.mixed-edit-burst': {
      durationMs: 620,
      commitCount: 18,
      noopSkipCount: 0,
      selectorNotifyCount: 44,
      selectorListenerCount: 4,
      sourceCount: 3,
      slowSourceCount: 1,
      totalSourceMs: 71,
      topSources: ['PATCH:actions.design.savedColor:design', 'PATCH:actions.structure.dimensions:config'],
    },
    'project.save-load.roundtrip': {
      durationMs: 410,
      commitCount: 7,
      noopSkipCount: 0,
      selectorNotifyCount: 12,
      selectorListenerCount: 4,
      sourceCount: 2,
      slowSourceCount: 0,
      totalSourceMs: 25,
      topSources: ['PATCH:actions.project.save:config+meta'],
    },
  };

  const summary = createUserJourneySummary(
    [
      { name: 'cabinet-core.configure', durationMs: 380, journey: 'cabinet-core-authoring' },
      { name: 'cabinet-core.mixed-edit-burst', durationMs: 620, journey: 'cabinet-core-authoring' },
      { name: 'project.save-load.roundtrip', durationMs: 410, journey: 'project-roundtrip' },
    ],
    storeFlowSummary
  );

  assert.deepEqual(summary['cabinet-core-authoring'], {
    stepCount: 2,
    totalDurationMs: 1000,
    averageStepMs: 500,
    maxStepDurationMs: 620,
    commitCount: 24,
    selectorNotifyCount: 58,
    totalSourceMs: 99,
    slowSourceCount: 2,
    steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
    topSources: ['PATCH:actions.design.savedColor:design', 'PATCH:actions.structure.dimensions:config'],
  });
  assert.equal(summary['project-roundtrip'].commitCount, 7);

  const ranked = rankUserJourneys(summary, 2);
  assert.deepEqual(
    ranked.map(item => item.name),
    ['cabinet-core-authoring', 'project-roundtrip']
  );

  const budget = createUserJourneyBudget(summary);
  assert.deepEqual(budget['cabinet-core-authoring'], {
    maxTotalDurationMs: 1390,
    maxCommitCount: 38,
    maxSelectorNotifyCount: 91,
    maxTotalSourceMs: 159,
  });
});

test('browser perf support summarizes repeated journey store sources and diagnoses bottlenecks canonically', () => {
  const flowSteps = [
    {
      name: 'cabinet-core.configure',
      journey: 'cabinet-core-authoring',
      before: { commitCount: 0, selectorNotifyCount: 0, selectorListenerCount: 4, sources: {} },
      after: {
        commitCount: 6,
        selectorNotifyCount: 14,
        selectorListenerCount: 4,
        sources: {
          'PATCH:actions.structure.dimensions:config': {
            source: 'actions.structure.dimensions',
            type: 'PATCH',
            slices: ['config'],
            count: 4,
            totalMs: 18,
            maxMs: 8,
            lastMs: 6,
            slowCount: 0,
          },
        },
      },
    },
    {
      name: 'cabinet-core.mixed-edit-burst',
      journey: 'cabinet-core-authoring',
      before: {
        commitCount: 6,
        selectorNotifyCount: 14,
        selectorListenerCount: 4,
        sources: {
          'PATCH:actions.structure.dimensions:config': {
            source: 'actions.structure.dimensions',
            type: 'PATCH',
            slices: ['config'],
            count: 4,
            totalMs: 18,
            maxMs: 8,
            lastMs: 6,
            slowCount: 0,
          },
        },
      },
      after: {
        commitCount: 24,
        selectorNotifyCount: 58,
        selectorListenerCount: 4,
        sources: {
          'PATCH:actions.structure.dimensions:config': {
            source: 'actions.structure.dimensions',
            type: 'PATCH',
            slices: ['config'],
            count: 11,
            totalMs: 49,
            maxMs: 10,
            lastMs: 7,
            slowCount: 0,
          },
          'PATCH:actions.design.savedColor:design': {
            source: 'actions.design.savedColor',
            type: 'PATCH',
            slices: ['design'],
            count: 7,
            totalMs: 31,
            maxMs: 12,
            lastMs: 9,
            slowCount: 1,
          },
        },
      },
    },
  ];
  const storeFlowSummary = createStoreFlowPressureSummary(flowSteps);
  const journeySummary = createUserJourneySummary(
    [
      { name: 'cabinet-core.configure', durationMs: 380, journey: 'cabinet-core-authoring' },
      { name: 'cabinet-core.mixed-edit-burst', durationMs: 620, journey: 'cabinet-core-authoring' },
    ],
    storeFlowSummary
  );
  const journeySources = createJourneyStoreSourceSummary(flowSteps);
  assert.deepEqual(journeySources['cabinet-core-authoring']['PATCH:actions.structure.dimensions:config'], {
    key: 'PATCH:actions.structure.dimensions:config',
    source: 'actions.structure.dimensions',
    type: 'PATCH',
    slices: ['config'],
    count: 11,
    totalMs: 49,
    maxMs: 10,
    slowCount: 0,
    stepCount: 2,
    steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
  });
  const rankedSources = rankJourneyStoreSources(journeySources['cabinet-core-authoring'], 2);
  assert.deepEqual(
    rankedSources.map(item => item.key),
    ['PATCH:actions.structure.dimensions:config', 'PATCH:actions.design.savedColor:design']
  );

  const diagnosis = createUserJourneyDiagnosisSummary(journeySummary, storeFlowSummary, journeySources);
  assert.deepEqual(diagnosis['cabinet-core-authoring'], {
    stepCount: 2,
    burstyStepCount: 2,
    repeatedSourceCount: 1,
    dominantSourceSharePct: 61.25,
    primaryBottleneck: 'selector-fanout',
    totalDurationMs: 1000,
    totalSourceMs: 80,
    commitCount: 24,
    selectorNotifyCount: 58,
    topStepName: 'cabinet-core.mixed-edit-burst',
    topStepCommitCount: 18,
    topStepSelectorNotifyCount: 44,
    topStepTotalSourceMs: 62,
    topSourceKey: 'PATCH:actions.structure.dimensions:config',
    topSourceTotalMs: 49,
    topSourceStepCount: 2,
    topSources: ['PATCH:actions.structure.dimensions:config', 'PATCH:actions.design.savedColor:design'],
    burstySteps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
  });
  const rankedDiagnosis = rankUserJourneyDiagnosis(diagnosis, 1);
  assert.equal(rankedDiagnosis[0].name, 'cabinet-core-authoring');

  const budget = createUserJourneyDiagnosisBudget(diagnosis);
  assert.deepEqual(budget['cabinet-core-authoring'], {
    maxBurstyStepCount: 4,
    maxRepeatedSourceCount: 3,
    maxDominantSourceSharePct: 84,
  });
});

test('browser perf support baseline evaluation enforces journey diagnosis budgets', () => {
  const clean = {
    userFlow: {
      'cabinet-core.configure': 380,
      'cabinet-core.mixed-edit-burst': 620,
    },
    userFlowSteps: [
      { name: 'cabinet-core.configure', durationMs: 380, journey: 'cabinet-core-authoring' },
      { name: 'cabinet-core.mixed-edit-burst', durationMs: 620, journey: 'cabinet-core-authoring' },
    ],
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [{ name: 'project.load', durationMs: 20, status: 'ok' }],
    windowStoreFlowPressureSummary: {
      'cabinet-core.configure': {
        durationMs: 380,
        commitCount: 6,
        noopSkipCount: 0,
        selectorNotifyCount: 14,
        selectorListenerCount: 4,
        sourceCount: 1,
        slowSourceCount: 0,
        totalSourceMs: 18,
        topSources: ['PATCH:actions.structure.dimensions:config'],
      },
      'cabinet-core.mixed-edit-burst': {
        durationMs: 620,
        commitCount: 18,
        noopSkipCount: 0,
        selectorNotifyCount: 44,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 62,
        topSources: ['PATCH:actions.structure.dimensions:config', 'PATCH:actions.design.savedColor:design'],
      },
    },
    journeyStoreSourceSummary: {
      'cabinet-core-authoring': {
        'PATCH:actions.structure.dimensions:config': {
          key: 'PATCH:actions.structure.dimensions:config',
          source: 'actions.structure.dimensions',
          type: 'PATCH',
          slices: ['config'],
          count: 11,
          totalMs: 49,
          maxMs: 10,
          slowCount: 0,
          stepCount: 2,
          steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
        },
        'PATCH:actions.design.savedColor:design': {
          key: 'PATCH:actions.design.savedColor:design',
          source: 'actions.design.savedColor',
          type: 'PATCH',
          slices: ['design'],
          count: 7,
          totalMs: 31,
          maxMs: 12,
          slowCount: 1,
          stepCount: 1,
          steps: ['cabinet-core.mixed-edit-burst'],
        },
      },
    },
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: ['project.load'],
      requiredRuntimeDomains: ['project'],
      requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const bloated = {
    ...clean,
    userFlowSteps: clean.userFlowSteps.slice(),
    journeyStoreSourceSummary: {
      'cabinet-core-authoring': {
        'PATCH:actions.structure.dimensions:config': {
          key: 'PATCH:actions.structure.dimensions:config',
          source: 'actions.structure.dimensions',
          type: 'PATCH',
          slices: ['config'],
          count: 20,
          totalMs: 85,
          maxMs: 18,
          slowCount: 1,
          stepCount: 3,
          steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst', 'cabinet-core.post-check'],
        },
        'PATCH:actions.design.savedColor:design': {
          key: 'PATCH:actions.design.savedColor:design',
          source: 'actions.design.savedColor',
          type: 'PATCH',
          slices: ['design'],
          count: 10,
          totalMs: 40,
          maxMs: 15,
          slowCount: 2,
          stepCount: 2,
          steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
        },
        'PATCH:actions.render.sketch:runtime': {
          key: 'PATCH:actions.render.sketch:runtime',
          source: 'actions.render.sketch',
          type: 'PATCH',
          slices: ['runtime'],
          count: 6,
          totalMs: 33,
          maxMs: 14,
          slowCount: 1,
          stepCount: 2,
          steps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
        },
      },
    },
    userJourneyDiagnosisSummary: {
      'cabinet-core-authoring': {
        stepCount: 2,
        burstyStepCount: 5,
        repeatedSourceCount: 4,
        dominantSourceSharePct: 92,
        primaryBottleneck: 'source-hotspot',
        totalDurationMs: 1000,
        totalSourceMs: 158,
        commitCount: 24,
        selectorNotifyCount: 58,
        topStepName: 'cabinet-core.mixed-edit-burst',
        topStepCommitCount: 18,
        topStepSelectorNotifyCount: 44,
        topStepTotalSourceMs: 62,
        topSourceKey: 'PATCH:actions.structure.dimensions:config',
        topSourceTotalMs: 85,
        topSourceStepCount: 3,
        topSources: ['PATCH:actions.structure.dimensions:config'],
        burstySteps: ['cabinet-core.configure', 'cabinet-core.mixed-edit-burst'],
      },
    },
  };
  const failures = evaluateBrowserPerfBaseline(bloated, baseline, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /customer journey bursty-step count exceeded budget/.test(item)));
  assert.ok(failures.some(item => /customer journey repeated-source count exceeded budget/.test(item)));
  assert.ok(failures.some(item => /customer journey dominant-source share exceeded budget/.test(item)));
});

test('browser perf support baseline evaluation enforces required customer journey coverage', () => {
  const clean = {
    userFlow: {
      'project.save-load.roundtrip': 410,
      'project.restore-last-session': 290,
    },
    userFlowSteps: [
      { name: 'project.save-load.roundtrip', durationMs: 410, journey: 'project-roundtrip' },
      { name: 'project.restore-last-session', durationMs: 290, journey: 'project-roundtrip' },
    ],
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [{ name: 'project.load', durationMs: 20, status: 'ok' }],
    windowStoreFlowPressureSummary: {
      'project.save-load.roundtrip': {
        durationMs: 410,
        commitCount: 7,
        noopSkipCount: 0,
        selectorNotifyCount: 12,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 0,
        totalSourceMs: 25,
        topSources: ['PATCH:actions.project.save:config+meta'],
      },
      'project.restore-last-session': {
        durationMs: 290,
        commitCount: 4,
        noopSkipCount: 0,
        selectorNotifyCount: 8,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 0,
        totalSourceMs: 18,
        topSources: ['PATCH:actions.project.load:config+meta'],
      },
    },
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    requiredUserJourneys: ['project-roundtrip'],
    requiredUserJourneyMinimumStepCounts: { 'project-roundtrip': 2 },
  });
  assert.deepEqual(baseline.requiredUserJourneys, ['project-roundtrip']);
  assert.deepEqual(baseline.requiredUserJourneyMinimumStepCounts, { 'project-roundtrip': 2 });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: ['project.load'],
      requiredRuntimeDomains: ['project'],
      requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      requiredUserJourneys: ['project-roundtrip'],
      requiredUserJourneyMinimumStepCounts: { 'project-roundtrip': 2 },
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const broken = {
    ...clean,
    userFlow: {
      'project.save-load.roundtrip': 410,
    },
    userFlowSteps: [{ name: 'project.save-load.roundtrip', durationMs: 410, journey: 'project-roundtrip' }],
    windowStoreFlowPressureSummary: {
      'project.save-load.roundtrip': clean.windowStoreFlowPressureSummary['project.save-load.roundtrip'],
    },
  };
  const failures = evaluateBrowserPerfBaseline(broken, baseline, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    requiredUserJourneys: ['project-roundtrip'],
    requiredUserJourneyMinimumStepCounts: { 'project-roundtrip': 2 },
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /customer journey coverage below required minimum/.test(item)));
});

test('browser perf support baseline evaluation enforces customer journey budgets', () => {
  const clean = {
    userFlow: {
      'cabinet-core.configure': 380,
      'cabinet-core.mixed-edit-burst': 620,
    },
    userFlowSteps: [
      { name: 'cabinet-core.configure', durationMs: 380, journey: 'cabinet-core-authoring' },
      { name: 'cabinet-core.mixed-edit-burst', durationMs: 620, journey: 'cabinet-core-authoring' },
    ],
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [{ name: 'project.load', durationMs: 20, status: 'ok' }],
    windowStoreFlowPressureSummary: {
      'cabinet-core.configure': {
        durationMs: 380,
        commitCount: 6,
        noopSkipCount: 1,
        selectorNotifyCount: 14,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 28,
        topSources: ['PATCH:actions.structure.dimensions:config'],
      },
      'cabinet-core.mixed-edit-burst': {
        durationMs: 620,
        commitCount: 18,
        noopSkipCount: 0,
        selectorNotifyCount: 44,
        selectorListenerCount: 4,
        sourceCount: 3,
        slowSourceCount: 1,
        totalSourceMs: 71,
        topSources: ['PATCH:actions.design.savedColor:design'],
      },
    },
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: ['project.load'],
      requiredRuntimeDomains: ['project'],
      requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const bloated = {
    ...clean,
    userFlow: {
      'cabinet-core.configure': 520,
      'cabinet-core.mixed-edit-burst': 980,
    },
    userFlowSteps: [
      { name: 'cabinet-core.configure', durationMs: 520, journey: 'cabinet-core-authoring' },
      { name: 'cabinet-core.mixed-edit-burst', durationMs: 980, journey: 'cabinet-core-authoring' },
    ],
    windowStoreFlowPressureSummary: {
      'cabinet-core.configure': {
        durationMs: 520,
        commitCount: 10,
        noopSkipCount: 1,
        selectorNotifyCount: 22,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 48,
        topSources: ['PATCH:actions.structure.dimensions:config'],
      },
      'cabinet-core.mixed-edit-burst': {
        durationMs: 980,
        commitCount: 34,
        noopSkipCount: 0,
        selectorNotifyCount: 76,
        selectorListenerCount: 4,
        sourceCount: 3,
        slowSourceCount: 2,
        totalSourceMs: 122,
        topSources: ['PATCH:actions.design.savedColor:design'],
      },
    },
  };
  const failures = evaluateBrowserPerfBaseline(bloated, baseline, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /customer journey total exceeded budget/.test(item)));
  assert.ok(failures.some(item => /customer journey store commits exceeded budget/.test(item)));
  assert.ok(failures.some(item => /customer journey selector notifications exceeded budget/.test(item)));
  assert.ok(failures.some(item => /customer journey store source time exceeded budget/.test(item)));
});
test('browser perf support baseline evaluation enforces domain coverage and domain budgets', () => {
  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [
      { name: 'project.load', durationMs: 70, status: 'ok' },
      { name: 'export.copy', durationMs: 20, status: 'ok' },
      { name: 'export.copy', durationMs: 21, status: 'ok' },
      { name: 'export.copy', durationMs: 23, status: 'ok' },
      { name: 'export.copy', durationMs: 24, status: 'ok' },
    ],
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.load', 'export.copy'],
    requiredRuntimeDomains: ['project', 'export'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1, 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: ['project.load', 'export.copy'],
      requiredRuntimeDomains: ['project', 'export'],
      requiredRuntimeMetricMinimumCounts: { 'project.load': 1, 'export.copy': 4 },
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const missingDomain = {
    ...clean,
    windowPerfEntries: [{ name: 'project.load', durationMs: 40, status: 'ok' }],
  };
  const missingFailures = evaluateBrowserPerfBaseline(missingDomain, baseline, {
    requiredRuntimeMetrics: ['project.load', 'export.copy'],
    requiredRuntimeDomains: ['project', 'export'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1, 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(missingFailures.some(item => /Missing runtime domain coverage: export/.test(item)));

  const bloated = {
    ...clean,
    windowPerfEntries: [
      { name: 'project.load', durationMs: 70, status: 'ok' },
      { name: 'export.copy', durationMs: 80, status: 'ok' },
      { name: 'export.copy', durationMs: 82, status: 'ok' },
      { name: 'export.copy', durationMs: 84, status: 'ok' },
      { name: 'export.copy', durationMs: 86, status: 'ok' },
    ],
  };
  const bloatedFailures = evaluateBrowserPerfBaseline(bloated, baseline, {
    requiredRuntimeMetrics: ['project.load', 'export.copy'],
    requiredRuntimeDomains: ['project', 'export'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1, 'export.copy': 4 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(bloatedFailures.some(item => /export runtime domain total exceeded budget/.test(item)));
});

test('browser perf support baseline evaluation enforces store pressure budgets', () => {
  const clean = {
    userFlow: {},
    runtimeIssues: { pageErrors: [], consoleErrors: [] },
    projectActionEvents: [],
    windowPerfEntries: [{ name: 'project.load', durationMs: 20, status: 'ok' }],
    windowStoreFlowPressureSummary: {
      'project.save-load.roundtrip': {
        durationMs: 440,
        commitCount: 8,
        noopSkipCount: 2,
        selectorNotifyCount: 16,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 36,
        topSources: ['PATCH:actions.project.save:config+meta'],
      },
    },
  };
  const baseline = createBrowserPerfBaseline(clean, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
  });
  assert.deepEqual(
    evaluateBrowserPerfBaseline(clean, baseline, {
      requiredRuntimeMetrics: ['project.load'],
      requiredRuntimeDomains: ['project'],
      requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
      requiredProjectActions: [],
      requiredUserJourneys: [],
      requiredUserJourneyMinimumStepCounts: {},
      happyPathMetricsWithoutErrors: [],
    }),
    []
  );

  const bloated = {
    ...clean,
    windowStoreFlowPressureSummary: {
      'project.save-load.roundtrip': {
        durationMs: 440,
        commitCount: 16,
        noopSkipCount: 2,
        selectorNotifyCount: 33,
        selectorListenerCount: 4,
        sourceCount: 2,
        slowSourceCount: 1,
        totalSourceMs: 70,
        topSources: ['PATCH:actions.project.save:config+meta'],
      },
    },
  };
  const failures = evaluateBrowserPerfBaseline(bloated, baseline, {
    requiredRuntimeMetrics: ['project.load'],
    requiredRuntimeDomains: ['project'],
    requiredRuntimeMetricMinimumCounts: { 'project.load': 1 },
    requiredProjectActions: [],
    requiredUserJourneys: [],
    requiredUserJourneyMinimumStepCounts: {},
    happyPathMetricsWithoutErrors: [],
  });
  assert.ok(failures.some(item => /store commit burst exceeded budget/.test(item)));
  assert.ok(failures.some(item => /selector notification burst exceeded budget/.test(item)));
  assert.ok(failures.some(item => /store source time exceeded budget/.test(item)));
});
