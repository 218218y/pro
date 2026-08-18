import {
  createBrowserPerfUxTargetSummary,
  evaluateBrowserPerfUxEvidence,
} from './wp_browser_perf_ux_targets.js';
import {
  happyPathMetricsWithoutErrors,
  requiredProjectActions,
  requiredRuntimeMetricMinimumCounts,
  requiredRuntimeMetrics,
  requiredUserJourneys,
  requiredUserJourneyMinimumStepCounts,
} from '../tests/e2e/helpers/perf_contracts.js';

export const BROWSER_PERF_BASELINE_SCHEMA_VERSION = 24;
export const BROWSER_PERF_MIN_MATERIAL_DRIFT_MS = 20;
export const BROWSER_PERF_MIN_MATERIAL_DURATION_EXCESS_MS = 20;
export const BROWSER_PERF_MIN_MATERIAL_COUNT_EXCESS = 5;

const MEASUREMENT_PROFILE_KEYS = Object.freeze([
  'id',
  'label',
  'environmentKind',
  'buildPipeline',
  'serverKind',
  'observabilityMode',
  'pagePath',
]);

export function normalizeBrowserPerfMeasurementProfile(value) {
  if (!value || typeof value !== 'object') return null;
  const normalized = {};
  for (const key of MEASUREMENT_PROFILE_KEYS) {
    const field = typeof value[key] === 'string' ? value[key].trim() : '';
    if (!field) return null;
    normalized[key] = field;
  }
  return normalized;
}

function measurementProfilesMatch(left, right) {
  return MEASUREMENT_PROFILE_KEYS.every(key => left?.[key] === right?.[key]);
}

export function formatMs(value) {
  const n = Number.isFinite(value) ? Math.round(value) : 0;
  return `${n}ms`;
}

function exceedsMaterialDurationBudget(actualValue, budgetValue) {
  const actual = Number(actualValue) || 0;
  const budget = Number(budgetValue);
  return (
    Number.isFinite(budget) &&
    actual > budget &&
    actual - budget >= BROWSER_PERF_MIN_MATERIAL_DURATION_EXCESS_MS
  );
}

function exceedsMaterialCountBudget(actualValue, budgetValue) {
  const actual = Number(actualValue) || 0;
  const budget = Number(budgetValue);
  return (
    Number.isFinite(budget) && actual > budget && actual - budget >= BROWSER_PERF_MIN_MATERIAL_COUNT_EXCESS
  );
}

function roundDuration(value) {
  return Number.isFinite(value) ? Math.max(0, Number(Number(value).toFixed(2))) : 0;
}

function percentile(sortedValues, ratio) {
  if (!Array.isArray(sortedValues) || !sortedValues.length) return 0;
  const index = Math.min(sortedValues.length - 1, Math.max(0, Math.ceil(sortedValues.length * ratio) - 1));
  return sortedValues[index] || 0;
}

function normalizeDurationSamples(value) {
  return Array.isArray(value)
    ? value
        .map(item => (Number.isFinite(Number(item)) ? roundDuration(Number(item)) : null))
        .filter(item => item !== null)
    : [];
}

function createDurationSummary(samplesIn) {
  const samples = normalizeDurationSamples(samplesIn);
  const sorted = [...samples].sort((left, right) => left - right);
  const totalMs = roundDuration(samples.reduce((sum, value) => sum + value, 0));
  return {
    count: samples.length,
    totalMs,
    avgMs: samples.length ? roundDuration(totalMs / samples.length) : 0,
    p95Ms: sorted.length ? roundDuration(percentile(sorted, 0.95)) : 0,
    maxMs: sorted.length ? roundDuration(sorted[sorted.length - 1]) : 0,
    samplesMs: samples,
  };
}

const PERF_ENTRY_KINDS = new Set([
  'action',
  'phase',
  'interaction-wait',
  'render-settle',
  'browser-metric',
  'mark',
]);

function normalizePerfEntry(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name.trim() : null;
  const kind = typeof entry.kind === 'string' && PERF_ENTRY_KINDS.has(entry.kind) ? entry.kind : null;
  if (!name || !kind) return null;
  const status = entry.status === 'error' || entry.status === 'mark' ? entry.status : 'ok';
  const uxTotalMs = Number.isFinite(entry.uxTotalMs) ? Number(entry.uxTotalMs) : null;
  const codeExecutionMs = Number.isFinite(entry.codeExecutionMs) ? Number(entry.codeExecutionMs) : null;
  const interactionWaitMs = Number.isFinite(entry.interactionWaitMs) ? Number(entry.interactionWaitMs) : null;
  if (uxTotalMs === null || codeExecutionMs === null || interactionWaitMs === null) return null;
  return {
    id: typeof entry.id === 'string' ? entry.id : '',
    name,
    kind,
    status,
    uxTotalMs: roundDuration(uxTotalMs),
    codeExecutionMs: roundDuration(codeExecutionMs),
    interactionWaitMs: roundDuration(interactionWaitMs),
    ...(typeof entry.parentId === 'string' && entry.parentId ? { parentId: entry.parentId } : {}),
    ...(typeof entry.phase === 'string' && entry.phase ? { phase: entry.phase } : {}),
    ...(Number.isFinite(entry.metricValue) ? { metricValue: Number(entry.metricValue) } : {}),
    ...(typeof entry.metricUnit === 'string' ? { metricUnit: entry.metricUnit } : {}),
    error:
      typeof entry.error === 'string' && entry.error.trim()
        ? entry.error.trim()
        : entry.error == null
          ? undefined
          : String(entry.error),
  };
}

function summarizePerfEntries(entries) {
  const ux = createDurationSummary(entries.map(entry => entry.uxTotalMs));
  const code = createDurationSummary(entries.map(entry => entry.codeExecutionMs));
  const interaction = createDurationSummary(entries.map(entry => entry.interactionWaitMs));
  const count = entries.length;
  const okCount = entries.filter(entry => entry.status === 'ok').length;
  const errorCount = entries.filter(entry => entry.status === 'error').length;
  const markCount = entries.filter(entry => entry.status === 'mark').length;
  const kinds = Array.from(new Set(entries.map(entry => entry.kind))).sort((left, right) =>
    left.localeCompare(right)
  );
  const actionableCount = entries.filter(entry => entry.kind === 'action' || entry.kind === 'phase').length;
  const lastEntry = entries.length ? entries[entries.length - 1] : null;
  return {
    count,
    okCount,
    errorCount,
    markCount,
    actionableCount,
    kinds,
    errorRate: count > 0 ? roundDuration((errorCount / count) * 100) : 0,
    uxTotalMs: ux.totalMs,
    uxAverageMs: ux.avgMs,
    uxMinMs: ux.samplesMs.length ? Math.min(...ux.samplesMs) : 0,
    uxMaxMs: ux.maxMs,
    uxP50Ms: ux.samplesMs.length
      ? roundDuration(
          percentile(
            [...ux.samplesMs].sort((left, right) => left - right),
            0.5
          )
        )
      : 0,
    uxP95Ms: ux.p95Ms,
    codeExecutionTotalMs: code.totalMs,
    codeExecutionAverageMs: code.avgMs,
    codeExecutionMinMs: code.samplesMs.length ? Math.min(...code.samplesMs) : 0,
    codeExecutionMaxMs: code.maxMs,
    codeExecutionP50Ms: code.samplesMs.length
      ? roundDuration(
          percentile(
            [...code.samplesMs].sort((left, right) => left - right),
            0.5
          )
        )
      : 0,
    codeExecutionP95Ms: code.p95Ms,
    interactionWaitTotalMs: interaction.totalMs,
    interactionWaitAverageMs: interaction.avgMs,
    interactionWaitP95Ms: interaction.p95Ms,
    lastUxTotalMs: lastEntry ? roundDuration(lastEntry.uxTotalMs) : 0,
    lastCodeExecutionMs: lastEntry ? roundDuration(lastEntry.codeExecutionMs) : 0,
    lastInteractionWaitMs: lastEntry ? roundDuration(lastEntry.interactionWaitMs) : 0,
    lastStatus: lastEntry?.status || null,
    ...(lastEntry?.error ? { lastError: lastEntry.error } : {}),
  };
}

export function createBrowserMetricSummaryFromEntries(entries, metadata = {}) {
  const normalizedEntries = (Array.isArray(entries) ? entries : []).map(normalizePerfEntry).filter(Boolean);
  const metricValues = name =>
    normalizedEntries
      .filter(entry => entry.kind === 'browser-metric' && entry.name === name)
      .map(entry => entry.metricValue)
      .filter(Number.isFinite)
      .map(Number);
  const clsValues = metricValues('browser.cls');
  const lcpValues = metricValues('browser.lcp');
  const inpValues = metricValues('browser.inp');
  const longTaskSummary = createDurationSummary(metricValues('browser.longTask'));
  const renderSettleSummary = createDurationSummary(
    normalizedEntries
      .filter(entry => entry.kind === 'render-settle' && entry.name === 'render.settle')
      .map(entry => entry.uxTotalMs)
  );
  const source = metadata && typeof metadata === 'object' ? metadata : {};
  return {
    observerSupported: source.observerSupported === true,
    supportedEntryTypes: Array.isArray(source.supportedEntryTypes)
      ? Array.from(new Set(source.supportedEntryTypes.map(item => String(item || '')).filter(Boolean))).sort(
          (left, right) => left.localeCompare(right)
        )
      : [],
    cls: {
      value: clsValues.length ? roundDuration(Math.max(...clsValues)) : 0,
      entryCount: clsValues.length,
      lastUpdatedAt: roundDuration(Number(source.cls?.lastUpdatedAt) || 0),
    },
    lcp: {
      valueMs: lcpValues.length ? roundDuration(Math.max(...lcpValues)) : 0,
      entryCount: lcpValues.length,
      lastUpdatedAt: roundDuration(Number(source.lcp?.lastUpdatedAt) || 0),
    },
    inp: {
      valueMs: inpValues.length
        ? roundDuration(inpValues[inpValues.length - 1])
        : roundDuration(Number(source.inp?.valueMs) || 0),
      interactionCount: Math.max(0, Math.floor(Number(source.inp?.interactionCount) || 0)),
      observedInteractionCount: Math.max(0, Math.floor(Number(source.inp?.observedInteractionCount) || 0)),
      entryCount: inpValues.length || Math.max(0, Math.floor(Number(source.inp?.entryCount) || 0)),
      p98Rank: Math.max(0, Math.floor(Number(source.inp?.p98Rank) || 0)),
      interactionId: Math.max(0, Math.floor(Number(source.inp?.interactionId) || 0)),
      source:
        source.inp?.source === 'event' || source.inp?.source === 'first-input'
          ? source.inp.source
          : inpValues.length
            ? 'event'
            : 'none',
      lastUpdatedAt: roundDuration(Number(source.inp?.lastUpdatedAt) || 0),
    },
    longTasks: {
      count: longTaskSummary.count,
      totalMs: longTaskSummary.totalMs,
      maxMs: longTaskSummary.maxMs,
      p95Ms: longTaskSummary.p95Ms,
      lastUpdatedAt: roundDuration(Number(source.longTasks?.lastUpdatedAt) || 0),
    },
    renderSettle: {
      count: renderSettleSummary.count,
      totalMs: renderSettleSummary.totalMs,
      maxMs: renderSettleSummary.maxMs,
      p95Ms: renderSettleSummary.p95Ms,
      lastUpdatedAt: roundDuration(Number(source.renderSettle?.lastUpdatedAt) || 0),
    },
  };
}

export function createPerfSummaryFromEntries(entries) {
  const groups = new Map();
  for (const rawEntry of Array.isArray(entries) ? entries : []) {
    const entry = normalizePerfEntry(rawEntry);
    if (!entry) continue;
    if (!groups.has(entry.name)) groups.set(entry.name, []);
    groups.get(entry.name).push(entry);
  }
  const out = {};
  for (const [name, groupedEntries] of groups.entries()) out[name] = summarizePerfEntries(groupedEntries);
  return out;
}

function readRequiredMetricMinimumCounts(contracts = {}, baseline = null) {
  if (baseline && typeof baseline === 'object' && baseline.requiredRuntimeMetricMinimumCounts) {
    return baseline.requiredRuntimeMetricMinimumCounts;
  }
  return contracts.requiredRuntimeMetricMinimumCounts || requiredRuntimeMetricMinimumCounts;
}

function readRequiredUserJourneyNames(contracts = {}, baseline = null, summary = null) {
  if (baseline && typeof baseline === 'object' && Array.isArray(baseline.requiredUserJourneys)) {
    return baseline.requiredUserJourneys;
  }
  if (Array.isArray(contracts.requiredUserJourneys)) return contracts.requiredUserJourneys;
  if (Array.isArray(requiredUserJourneys) && requiredUserJourneys.length) return requiredUserJourneys;
  return Object.keys(summary || {}).sort((left, right) => left.localeCompare(right));
}

function readRequiredUserJourneyMinimumStepCounts(contracts = {}, baseline = null) {
  if (baseline && typeof baseline === 'object' && baseline.requiredUserJourneyMinimumStepCounts) {
    return baseline.requiredUserJourneyMinimumStepCounts;
  }
  return contracts.requiredUserJourneyMinimumStepCounts || requiredUserJourneyMinimumStepCounts || {};
}

function groupNormalizedPerfEntries(entries) {
  const groups = new Map();
  for (const rawEntry of Array.isArray(entries) ? entries : []) {
    const entry = normalizePerfEntry(rawEntry);
    if (!entry) continue;
    if (!groups.has(entry.name)) groups.set(entry.name, []);
    groups.get(entry.name).push(entry);
  }
  return groups;
}

function averageCodeExecution(entries) {
  if (!Array.isArray(entries) || !entries.length) return 0;
  const totalMs = entries.reduce(
    (sum, entry) => sum + (Number.isFinite(entry?.codeExecutionMs) ? Number(entry.codeExecutionMs) : 0),
    0
  );
  return roundDuration(totalMs / entries.length);
}

function readRepeatedMetricMinimumCount(name, minimumCounts) {
  const explicit = Number(minimumCounts?.[name]);
  if (Number.isFinite(explicit) && explicit >= 2) return Math.floor(explicit);
  return 3;
}

export function classifyRuntimeMetricDomain(name) {
  const value = typeof name === 'string' ? name.trim() : '';
  if (!value) return 'other';
  if (value.startsWith('boot.')) return 'boot';
  if (value.startsWith('project.')) return 'project';
  if (value.startsWith('structure.')) return 'structure';
  if (value.startsWith('design.')) return 'design';
  if (value.startsWith('export.')) return 'export';
  if (value.startsWith('render.')) return 'render';
  if (value.startsWith('cloudSync.')) return 'cloud-sync';
  if (value.startsWith('orderPdf.')) return 'order-pdf';
  if (value.startsWith('settingsBackup.')) return 'settings-backup';
  return 'other';
}

function createPerfDomainBucket(name) {
  return {
    name,
    metricCount: 0,
    entryCount: 0,
    uxTotalMs: 0,
    codeExecutionTotalMs: 0,
    interactionWaitTotalMs: 0,
    errorCount: 0,
    markCount: 0,
    maxCodeExecutionP95Ms: 0,
    maxCodeExecutionMs: 0,
    pressureMetricCount: 0,
    worstDriftPct: 0,
    requiredMetricCount: 0,
    presentRequiredMetricCount: 0,
    missingRequiredMetricCount: 0,
    underfilledRequiredMetricCount: 0,
    metrics: [],
  };
}

function getOrCreatePerfDomainBucket(summary, name) {
  if (!summary[name]) summary[name] = createPerfDomainBucket(name);
  return summary[name];
}

export function createPerfDomainSummary(
  runtimeSummary,
  pressureSummary,
  requiredMetrics = requiredRuntimeMetrics,
  minimumCounts = requiredRuntimeMetricMinimumCounts
) {
  const summary = {};
  const perfSummary = runtimeSummary && typeof runtimeSummary === 'object' ? runtimeSummary : {};
  const pressure = pressureSummary && typeof pressureSummary === 'object' ? pressureSummary : {};

  for (const name of Array.isArray(requiredMetrics) ? requiredMetrics : []) {
    const domain = classifyRuntimeMetricDomain(name);
    const bucket = getOrCreatePerfDomainBucket(summary, domain);
    const requiredCount = Number(minimumCounts?.[name]) || 1;
    const item = perfSummary[name];
    bucket.requiredMetricCount += 1;
    if (item?.count >= 1) bucket.presentRequiredMetricCount += 1;
    else bucket.missingRequiredMetricCount += 1;
    if (item && item.count > 0 && item.count < requiredCount) bucket.underfilledRequiredMetricCount += 1;
  }

  for (const [name, item] of Object.entries(perfSummary)) {
    const domain = classifyRuntimeMetricDomain(name);
    const bucket = getOrCreatePerfDomainBucket(summary, domain);
    bucket.metricCount += 1;
    bucket.entryCount += Number(item?.count) || 0;
    bucket.uxTotalMs = roundDuration(bucket.uxTotalMs + (Number(item?.uxTotalMs) || 0));
    bucket.codeExecutionTotalMs = roundDuration(
      bucket.codeExecutionTotalMs + (Number(item?.codeExecutionTotalMs) || 0)
    );
    bucket.interactionWaitTotalMs = roundDuration(
      bucket.interactionWaitTotalMs + (Number(item?.interactionWaitTotalMs) || 0)
    );
    bucket.errorCount += Number(item?.errorCount) || 0;
    bucket.markCount += Number(item?.markCount) || 0;
    bucket.maxCodeExecutionP95Ms = Math.max(
      bucket.maxCodeExecutionP95Ms,
      Number(item?.codeExecutionP95Ms) || 0
    );
    bucket.maxCodeExecutionMs = Math.max(bucket.maxCodeExecutionMs, Number(item?.codeExecutionMaxMs) || 0);
    bucket.metrics.push(name);
  }

  for (const [name, item] of Object.entries(pressure)) {
    const domain = classifyRuntimeMetricDomain(name);
    const bucket = getOrCreatePerfDomainBucket(summary, domain);
    bucket.pressureMetricCount += 1;
    bucket.worstDriftPct = Math.max(bucket.worstDriftPct, Number(item?.materialDriftPct) || 0);
  }

  for (const bucket of Object.values(summary)) {
    bucket.metrics = bucket.metrics.slice().sort((left, right) => left.localeCompare(right));
    bucket.uxTotalMs = roundDuration(bucket.uxTotalMs);
    bucket.codeExecutionTotalMs = roundDuration(bucket.codeExecutionTotalMs);
    bucket.interactionWaitTotalMs = roundDuration(bucket.interactionWaitTotalMs);
    bucket.maxCodeExecutionP95Ms = roundDuration(bucket.maxCodeExecutionP95Ms);
    bucket.maxCodeExecutionMs = roundDuration(bucket.maxCodeExecutionMs);
    bucket.worstDriftPct = roundDuration(bucket.worstDriftPct);
  }

  return summary;
}

export function rankPerfDomains(summary, limit = 5) {
  const rows = Object.values(summary || {})
    .map(item => ({
      name: item?.name || 'other',
      metricCount: Number(item?.metricCount) || 0,
      entryCount: Number(item?.entryCount) || 0,
      errorCount: Number(item?.errorCount) || 0,
      missingRequiredMetricCount: Number(item?.missingRequiredMetricCount) || 0,
      underfilledRequiredMetricCount: Number(item?.underfilledRequiredMetricCount) || 0,
      worstDriftPct: Number(item?.worstDriftPct) || 0,
      uxTotalMs: Number(item?.uxTotalMs) || 0,
      codeExecutionTotalMs: Number(item?.codeExecutionTotalMs) || 0,
      interactionWaitTotalMs: Number(item?.interactionWaitTotalMs) || 0,
      maxCodeExecutionP95Ms: Number(item?.maxCodeExecutionP95Ms) || 0,
    }))
    .filter(item => item.metricCount > 0 || item.missingRequiredMetricCount > 0)
    .sort((left, right) => {
      if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
      if (right.missingRequiredMetricCount !== left.missingRequiredMetricCount) {
        return right.missingRequiredMetricCount - left.missingRequiredMetricCount;
      }
      if (right.underfilledRequiredMetricCount !== left.underfilledRequiredMetricCount) {
        return right.underfilledRequiredMetricCount - left.underfilledRequiredMetricCount;
      }
      if (right.worstDriftPct !== left.worstDriftPct) return right.worstDriftPct - left.worstDriftPct;
      if (right.codeExecutionTotalMs !== left.codeExecutionTotalMs) {
        return right.codeExecutionTotalMs - left.codeExecutionTotalMs;
      }
      if (right.maxCodeExecutionP95Ms !== left.maxCodeExecutionP95Ms) {
        return right.maxCodeExecutionP95Ms - left.maxCodeExecutionP95Ms;
      }
      if (right.uxTotalMs !== left.uxTotalMs) return right.uxTotalMs - left.uxTotalMs;
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createRuntimeDomainCodeExecutionBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    const totalMs = Number.isFinite(item?.codeExecutionTotalMs) ? Number(item.codeExecutionTotalMs) : 0;
    budget[name] = Math.max(Math.ceil(totalMs * 1.35 + 50), 150);
  }
  return budget;
}

export function createRuntimeDomainDriftBudgetPct(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    const worstDriftPct = Number.isFinite(item?.worstDriftPct) ? Number(item.worstDriftPct) : 0;
    budget[name] = Math.max(Math.ceil(Math.max(worstDriftPct, 0) * 1.4 + 10), 45);
  }
  return budget;
}

function deriveRequiredRuntimeDomains(requiredMetricsList) {
  const domains = new Set();
  for (const name of Array.isArray(requiredMetricsList) ? requiredMetricsList : []) {
    const domain = classifyRuntimeMetricDomain(name);
    if (domain) domains.add(domain);
  }
  return Array.from(domains).sort((left, right) => left.localeCompare(right));
}

export function createRepeatedMetricPressureSummary(
  entries,
  minimumCounts = requiredRuntimeMetricMinimumCounts
) {
  const summary = {};
  const groups = groupNormalizedPerfEntries(entries);
  for (const [name, groupedEntries] of groups.entries()) {
    const actionableEntries = groupedEntries.filter(
      entry => entry.kind === 'action' || entry.kind === 'phase'
    );
    const minimumCount = readRepeatedMetricMinimumCount(name, minimumCounts);
    if (actionableEntries.length < minimumCount) continue;
    const halfCount = Math.max(1, Math.floor(actionableEntries.length / 2));
    const firstEntries = actionableEntries.slice(0, halfCount);
    const lastEntries = actionableEntries.slice(actionableEntries.length - halfCount);
    const firstAvgMs = averageCodeExecution(firstEntries);
    const lastAvgMs = averageCodeExecution(lastEntries);
    const driftMs = roundDuration(lastAvgMs - firstAvgMs);
    const driftPct = firstAvgMs > 0 ? roundDuration((driftMs / firstAvgMs) * 100) : 0;
    const okCount = actionableEntries.filter(entry => entry.status === 'ok').length;
    const errorCount = actionableEntries.filter(entry => entry.status === 'error').length;
    const markCount = actionableEntries.filter(entry => entry.status === 'mark').length;
    const driftComparable = errorCount === 0 && markCount === 0;
    const materialDriftPct = driftComparable && driftMs >= BROWSER_PERF_MIN_MATERIAL_DRIFT_MS ? driftPct : 0;
    const durations = actionableEntries
      .map(entry => (Number.isFinite(entry.codeExecutionMs) ? Number(entry.codeExecutionMs) : 0))
      .sort((left, right) => left - right);
    summary[name] = {
      count: actionableEntries.length,
      minimumCount,
      okCount,
      errorCount,
      markCount,
      firstAvgMs,
      lastAvgMs,
      driftMs,
      driftPct,
      driftComparable,
      materialDriftPct,
      fastestMs: durations.length ? roundDuration(durations[0]) : 0,
      slowestMs: durations.length ? roundDuration(durations[durations.length - 1]) : 0,
    };
  }
  return summary;
}

export function rankRepeatedMetricPressure(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      count: Number(item?.count) || 0,
      minimumCount: Number(item?.minimumCount) || 0,
      driftPct: Number(item?.driftPct) || 0,
      driftMs: Number(item?.driftMs) || 0,
      errorCount: Number(item?.errorCount) || 0,
      slowestMs: Number(item?.slowestMs) || 0,
    }))
    .filter(item => item.count >= item.minimumCount && item.minimumCount >= 2)
    .sort((left, right) => {
      if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
      if (right.driftPct !== left.driftPct) return right.driftPct - left.driftPct;
      if (right.driftMs !== left.driftMs) return right.driftMs - left.driftMs;
      if (right.slowestMs !== left.slowestMs) return right.slowestMs - left.slowestMs;
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createRuntimeDriftBudgetPct(pressureSummary) {
  const budget = {};
  for (const [name, item] of Object.entries(pressureSummary || {})) {
    const driftPct = Number.isFinite(item?.materialDriftPct) ? Number(item.materialDriftPct) : 0;
    budget[name] = Math.max(Math.ceil(Math.max(driftPct, 0) * 1.5 + 15), 45);
  }
  return budget;
}

function normalizeRuntimeDiagnosticEntry(value) {
  if (!value || typeof value !== 'object') return null;
  const ctx = value.ctx && typeof value.ctx === 'object' ? value.ctx : {};
  const error =
    value.err && typeof value.err === 'object'
      ? value.err
      : value.error && typeof value.error === 'object'
        ? value.error
        : {};
  const where = typeof ctx.where === 'string' && ctx.where.trim() ? ctx.where.trim() : '';
  const op = typeof ctx.op === 'string' && ctx.op.trim() ? ctx.op.trim() : '';
  const fatal = !!ctx.fatal;
  const message =
    typeof error.message === 'string' && error.message.trim()
      ? error.message.trim()
      : typeof value.message === 'string' && value.message.trim()
        ? value.message.trim()
        : '';
  const level =
    typeof value.kind === 'string' && value.kind.trim()
      ? value.kind.trim()
      : typeof value.level === 'string' && value.level.trim()
        ? value.level.trim()
        : 'report';
  const ts = typeof value.ts === 'string' && value.ts.trim() ? value.ts.trim() : '';
  const label = [where, op].filter(Boolean).join(':') || 'unknown';
  return { ts, level, fatal, where, op, message, label };
}

export function createRuntimeIssueSummary(runtimeIssues) {
  const pageErrors = Array.isArray(runtimeIssues?.pageErrors)
    ? runtimeIssues.pageErrors.map(value => String(value || '')).filter(Boolean)
    : [];
  const consoleErrors = Array.isArray(runtimeIssues?.consoleErrors)
    ? runtimeIssues.consoleErrors.map(value => String(value || '')).filter(Boolean)
    : [];
  const diagnostics = Array.isArray(runtimeIssues?.diagnostics)
    ? runtimeIssues.diagnostics.map(normalizeRuntimeDiagnosticEntry).filter(Boolean)
    : [];
  return {
    pageErrors,
    consoleErrors,
    diagnostics,
    diagnosticsCount: diagnostics.length,
    totalCount: pageErrors.length + consoleErrors.length,
  };
}

function normalizeStoreDebugSourceEntry(name, entry) {
  if (!entry || typeof entry !== 'object') return null;
  const source = typeof entry.source === 'string' && entry.source.trim() ? entry.source.trim() : null;
  const type = typeof entry.type === 'string' && entry.type.trim() ? entry.type.trim() : 'PATCH';
  const slices = Array.isArray(entry.slices)
    ? entry.slices.map(value => String(value || '').trim()).filter(Boolean)
    : [];
  const count = Number.isFinite(entry.count) ? Math.max(0, Math.floor(Number(entry.count))) : 0;
  const totalMs = roundDuration(Number(entry.totalMs) || 0);
  const maxMs = roundDuration(Number(entry.maxMs) || 0);
  const lastMs = roundDuration(Number(entry.lastMs) || 0);
  const slowCount = Number.isFinite(entry.slowCount) ? Math.max(0, Math.floor(Number(entry.slowCount))) : 0;
  const noBuildCount = Number.isFinite(entry.noBuildCount)
    ? Math.max(0, Math.floor(Number(entry.noBuildCount)))
    : 0;
  const lastUpdatedAt = Number.isFinite(entry.lastUpdatedAt) ? Math.max(0, Number(entry.lastUpdatedAt)) : 0;
  return {
    key: typeof name === 'string' && name.trim() ? name.trim() : `${type}:${source || 'unknown'}`,
    source,
    type,
    slices,
    count,
    noBuildCount,
    totalMs,
    maxMs,
    lastMs,
    slowCount,
    lastUpdatedAt,
  };
}

function normalizeStoreDebugStats(stats) {
  const rawSources =
    stats && typeof stats === 'object' && stats.sources && typeof stats.sources === 'object'
      ? stats.sources
      : {};
  const sources = {};
  for (const [name, entry] of Object.entries(rawSources)) {
    const normalized = normalizeStoreDebugSourceEntry(name, entry);
    if (!normalized) continue;
    sources[normalized.key] = normalized;
  }
  return {
    commitCount: Number.isFinite(stats?.commitCount) ? Math.max(0, Math.floor(Number(stats.commitCount))) : 0,
    noopSkipCount: Number.isFinite(stats?.noopSkipCount)
      ? Math.max(0, Math.floor(Number(stats.noopSkipCount)))
      : 0,
    noBuildCount: Number.isFinite(stats?.noBuildCount)
      ? Math.max(0, Math.floor(Number(stats.noBuildCount)))
      : 0,
    selectorListenerCount: Number.isFinite(stats?.selectorListenerCount)
      ? Math.max(0, Math.floor(Number(stats.selectorListenerCount)))
      : 0,
    selectorNotifyCount: Number.isFinite(stats?.selectorNotifyCount)
      ? Math.max(0, Math.floor(Number(stats.selectorNotifyCount)))
      : 0,
    sources,
  };
}

function subtractStoreDebugStats(after, before) {
  const next = normalizeStoreDebugStats(after);
  const prev = normalizeStoreDebugStats(before);
  const sourceKeys = new Set([...Object.keys(prev.sources), ...Object.keys(next.sources)]);
  const sources = {};
  for (const key of sourceKeys) {
    const afterEntry = next.sources[key] || null;
    const beforeEntry = prev.sources[key] || null;
    const count = Math.max(0, (afterEntry?.count || 0) - (beforeEntry?.count || 0));
    const noBuildCount = Math.max(0, (afterEntry?.noBuildCount || 0) - (beforeEntry?.noBuildCount || 0));
    const totalMs = roundDuration(Math.max(0, (afterEntry?.totalMs || 0) - (beforeEntry?.totalMs || 0)));
    const slowCount = Math.max(0, (afterEntry?.slowCount || 0) - (beforeEntry?.slowCount || 0));
    if (count < 1 && noBuildCount < 1 && totalMs <= 0 && slowCount < 1) continue;
    sources[key] = {
      key,
      source: afterEntry?.source || beforeEntry?.source || null,
      type: afterEntry?.type || beforeEntry?.type || 'PATCH',
      slices: Array.isArray(afterEntry?.slices)
        ? afterEntry.slices.slice()
        : Array.isArray(beforeEntry?.slices)
          ? beforeEntry.slices.slice()
          : [],
      count,
      noBuildCount,
      totalMs,
      maxMs: roundDuration(afterEntry?.maxMs || beforeEntry?.maxMs || 0),
      lastMs: roundDuration(afterEntry?.lastMs || beforeEntry?.lastMs || 0),
      slowCount,
      lastUpdatedAt: Number(afterEntry?.lastUpdatedAt || beforeEntry?.lastUpdatedAt || 0),
    };
  }
  return {
    commitCount: Math.max(0, next.commitCount - prev.commitCount),
    noopSkipCount: Math.max(0, next.noopSkipCount - prev.noopSkipCount),
    noBuildCount: Math.max(0, next.noBuildCount - prev.noBuildCount),
    selectorNotifyCount: Math.max(0, next.selectorNotifyCount - prev.selectorNotifyCount),
    selectorListenerCount: next.selectorListenerCount,
    sources,
  };
}

export function createStoreDebugSummary(stats) {
  const normalized = normalizeStoreDebugStats(stats);
  const sourceRows = Object.values(normalized.sources);
  const totalSourceMs = roundDuration(
    sourceRows.reduce((sum, item) => sum + (Number(item?.totalMs) || 0), 0)
  );
  const slowSourceCount = sourceRows.filter(item => (Number(item?.slowCount) || 0) > 0).length;
  const topSource =
    sourceRows.slice().sort((left, right) => {
      if ((right.totalMs || 0) !== (left.totalMs || 0)) return (right.totalMs || 0) - (left.totalMs || 0);
      if ((right.count || 0) !== (left.count || 0)) return (right.count || 0) - (left.count || 0);
      return String(left.key || '').localeCompare(String(right.key || ''));
    })[0] || null;
  return {
    commitCount: normalized.commitCount,
    noopSkipCount: normalized.noopSkipCount,
    noBuildCount: normalized.noBuildCount,
    selectorListenerCount: normalized.selectorListenerCount,
    selectorNotifyCount: normalized.selectorNotifyCount,
    sourceCount: sourceRows.length,
    slowSourceCount,
    totalSourceMs,
    ...(topSource
      ? {
          topSourceKey: topSource.key,
          topSourceCount: Number(topSource.count) || 0,
          topSourceTotalMs: roundDuration(Number(topSource.totalMs) || 0),
        }
      : {}),
  };
}

export function rankStoreDebugSources(stats, limit = 5) {
  const normalized = normalizeStoreDebugStats(stats);
  return Object.values(normalized.sources)
    .map(item => ({
      key: item.key,
      source: item.source || 'unknown',
      type: item.type || 'PATCH',
      slices: Array.isArray(item.slices) ? item.slices.slice() : [],
      count: Number(item.count) || 0,
      noBuildCount: Number(item.noBuildCount) || 0,
      totalMs: Number(item.totalMs) || 0,
      maxMs: Number(item.maxMs) || 0,
      lastMs: Number(item.lastMs) || 0,
      slowCount: Number(item.slowCount) || 0,
    }))
    .filter(item => item.count > 0 || item.totalMs > 0)
    .sort((left, right) => {
      if (right.totalMs !== left.totalMs) return right.totalMs - left.totalMs;
      if (right.count !== left.count) return right.count - left.count;
      if (right.slowCount !== left.slowCount) return right.slowCount - left.slowCount;
      if (right.maxMs !== left.maxMs) return right.maxMs - left.maxMs;
      return left.key.localeCompare(right.key);
    })
    .slice(0, Math.max(1, limit));
}

export function createStoreFlowPressureSummary(steps) {
  const summary = {};
  for (const rawStep of Array.isArray(steps) ? steps : []) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const name = typeof rawStep.name === 'string' && rawStep.name.trim() ? rawStep.name.trim() : null;
    if (!name) continue;
    const delta = subtractStoreDebugStats(rawStep.after || null, rawStep.before || null);
    const rankedSources = rankStoreDebugSources(delta, 3);
    summary[name] = {
      durationMs: roundDuration(Number(rawStep.durationMs) || 0),
      commitCount: delta.commitCount,
      noopSkipCount: delta.noopSkipCount,
      noBuildCount: delta.noBuildCount,
      selectorNotifyCount: delta.selectorNotifyCount,
      selectorListenerCount: delta.selectorListenerCount,
      sourceCount: Object.keys(delta.sources).length,
      slowSourceCount: Object.values(delta.sources).filter(item => (Number(item?.slowCount) || 0) > 0).length,
      totalSourceMs: roundDuration(
        Object.values(delta.sources).reduce((sum, item) => sum + (Number(item?.totalMs) || 0), 0)
      ),
      topSources: rankedSources.map(item => item.key),
    };
  }
  return summary;
}

export function rankStoreFlowPressure(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      durationMs: Number(item?.durationMs) || 0,
      commitCount: Number(item?.commitCount) || 0,
      noopSkipCount: Number(item?.noopSkipCount) || 0,
      noBuildCount: Number(item?.noBuildCount) || 0,
      selectorNotifyCount: Number(item?.selectorNotifyCount) || 0,
      sourceCount: Number(item?.sourceCount) || 0,
      slowSourceCount: Number(item?.slowSourceCount) || 0,
      totalSourceMs: Number(item?.totalSourceMs) || 0,
      topSources: Array.isArray(item?.topSources) ? item.topSources.slice() : [],
    }))
    .filter(item => item.commitCount > 0 || item.selectorNotifyCount > 0 || item.totalSourceMs > 0)
    .sort((left, right) => {
      if (right.commitCount !== left.commitCount) return right.commitCount - left.commitCount;
      if (right.selectorNotifyCount !== left.selectorNotifyCount)
        return right.selectorNotifyCount - left.selectorNotifyCount;
      if (right.totalSourceMs !== left.totalSourceMs) return right.totalSourceMs - left.totalSourceMs;
      if (right.slowSourceCount !== left.slowSourceCount) return right.slowSourceCount - left.slowSourceCount;
      if (right.durationMs !== left.durationMs) return right.durationMs - left.durationMs;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, limit));
}

export function createStorePressureBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    budget[name] = {
      maxCommitCount: Math.max(Math.ceil((Number(item?.commitCount) || 0) * 1.5 + 3), 6),
      maxSelectorNotifyCount: Math.max(Math.ceil((Number(item?.selectorNotifyCount) || 0) * 1.35 + 10), 20),
      maxTotalSourceMs: Math.max(Math.ceil((Number(item?.totalSourceMs) || 0) * 1.5 + 15), 30),
    };
  }
  return budget;
}

function normalizeBuildReasonStats(reasons) {
  const out = {};
  const raw = reasons && typeof reasons === 'object' ? reasons : {};
  for (const [name, item] of Object.entries(raw)) {
    const key = typeof name === 'string' && name.trim() ? name.trim() : null;
    if (!key) continue;
    out[key] = {
      requestCount: Number.isFinite(item?.requestCount)
        ? Math.max(0, Math.floor(Number(item.requestCount)))
        : 0,
      executeCount: Number.isFinite(item?.executeCount)
        ? Math.max(0, Math.floor(Number(item.executeCount)))
        : 0,
      immediateRequestCount: Number.isFinite(item?.immediateRequestCount)
        ? Math.max(0, Math.floor(Number(item.immediateRequestCount)))
        : 0,
      debouncedRequestCount: Number.isFinite(item?.debouncedRequestCount)
        ? Math.max(0, Math.floor(Number(item.debouncedRequestCount)))
        : 0,
      forceRequestCount: Number.isFinite(item?.forceRequestCount)
        ? Math.max(0, Math.floor(Number(item.forceRequestCount)))
        : 0,
      immediateForceRequestCount: Number.isFinite(item?.immediateForceRequestCount)
        ? Math.max(0, Math.floor(Number(item.immediateForceRequestCount)))
        : 0,
      immediateNonForceRequestCount: Number.isFinite(item?.immediateNonForceRequestCount)
        ? Math.max(0, Math.floor(Number(item.immediateNonForceRequestCount)))
        : 0,
      debouncedForceRequestCount: Number.isFinite(item?.debouncedForceRequestCount)
        ? Math.max(0, Math.floor(Number(item.debouncedForceRequestCount)))
        : 0,
      debouncedNonForceRequestCount: Number.isFinite(item?.debouncedNonForceRequestCount)
        ? Math.max(0, Math.floor(Number(item.debouncedNonForceRequestCount)))
        : 0,
      executeImmediateCount: Number.isFinite(item?.executeImmediateCount)
        ? Math.max(0, Math.floor(Number(item.executeImmediateCount)))
        : 0,
      executeDebouncedCount: Number.isFinite(item?.executeDebouncedCount)
        ? Math.max(0, Math.floor(Number(item.executeDebouncedCount)))
        : 0,
      executeForceCount: Number.isFinite(item?.executeForceCount)
        ? Math.max(0, Math.floor(Number(item.executeForceCount)))
        : 0,
      executeImmediateForceCount: Number.isFinite(item?.executeImmediateForceCount)
        ? Math.max(0, Math.floor(Number(item.executeImmediateForceCount)))
        : 0,
      executeImmediateNonForceCount: Number.isFinite(item?.executeImmediateNonForceCount)
        ? Math.max(0, Math.floor(Number(item.executeImmediateNonForceCount)))
        : 0,
      executeDebouncedForceCount: Number.isFinite(item?.executeDebouncedForceCount)
        ? Math.max(0, Math.floor(Number(item.executeDebouncedForceCount)))
        : 0,
      executeDebouncedNonForceCount: Number.isFinite(item?.executeDebouncedNonForceCount)
        ? Math.max(0, Math.floor(Number(item.executeDebouncedNonForceCount)))
        : 0,
      executeSuccessCount: Number.isFinite(item?.executeSuccessCount)
        ? Math.max(0, Math.floor(Number(item.executeSuccessCount)))
        : 0,
      executeFailureCount: Number.isFinite(item?.executeFailureCount)
        ? Math.max(0, Math.floor(Number(item.executeFailureCount)))
        : 0,
      executeDurationTotalMs: roundDuration(Number(item?.executeDurationTotalMs) || 0),
      executeDurationAvgMs: roundDuration(Number(item?.executeDurationAvgMs) || 0),
      executeDurationP95Ms: roundDuration(Number(item?.executeDurationP95Ms) || 0),
      executeDurationMaxMs: roundDuration(Number(item?.executeDurationMaxMs) || 0),
      executeDurationSamplesMs: normalizeDurationSamples(item?.executeDurationSamplesMs),
      lastExecuteStatus:
        typeof item?.lastExecuteStatus === 'string' && item.lastExecuteStatus.trim()
          ? item.lastExecuteStatus.trim()
          : null,
    };
  }
  return out;
}

function normalizeBuildDebugStats(stats) {
  return {
    requestCount: Number.isFinite(stats?.requestCount)
      ? Math.max(0, Math.floor(Number(stats.requestCount)))
      : 0,
    immediateRequestCount: Number.isFinite(stats?.immediateRequestCount)
      ? Math.max(0, Math.floor(Number(stats.immediateRequestCount)))
      : 0,
    debouncedRequestCount: Number.isFinite(stats?.debouncedRequestCount)
      ? Math.max(0, Math.floor(Number(stats.debouncedRequestCount)))
      : 0,
    forceRequestCount: Number.isFinite(stats?.forceRequestCount)
      ? Math.max(0, Math.floor(Number(stats.forceRequestCount)))
      : 0,
    immediateForceRequestCount: Number.isFinite(stats?.immediateForceRequestCount)
      ? Math.max(0, Math.floor(Number(stats.immediateForceRequestCount)))
      : 0,
    immediateNonForceRequestCount: Number.isFinite(stats?.immediateNonForceRequestCount)
      ? Math.max(0, Math.floor(Number(stats.immediateNonForceRequestCount)))
      : 0,
    debouncedForceRequestCount: Number.isFinite(stats?.debouncedForceRequestCount)
      ? Math.max(0, Math.floor(Number(stats.debouncedForceRequestCount)))
      : 0,
    debouncedNonForceRequestCount: Number.isFinite(stats?.debouncedNonForceRequestCount)
      ? Math.max(0, Math.floor(Number(stats.debouncedNonForceRequestCount)))
      : 0,
    executeCount: Number.isFinite(stats?.executeCount)
      ? Math.max(0, Math.floor(Number(stats.executeCount)))
      : 0,
    executeImmediateCount: Number.isFinite(stats?.executeImmediateCount)
      ? Math.max(0, Math.floor(Number(stats.executeImmediateCount)))
      : 0,
    executeDebouncedCount: Number.isFinite(stats?.executeDebouncedCount)
      ? Math.max(0, Math.floor(Number(stats.executeDebouncedCount)))
      : 0,
    executeForceCount: Number.isFinite(stats?.executeForceCount)
      ? Math.max(0, Math.floor(Number(stats.executeForceCount)))
      : 0,
    executeImmediateForceCount: Number.isFinite(stats?.executeImmediateForceCount)
      ? Math.max(0, Math.floor(Number(stats.executeImmediateForceCount)))
      : 0,
    executeImmediateNonForceCount: Number.isFinite(stats?.executeImmediateNonForceCount)
      ? Math.max(0, Math.floor(Number(stats.executeImmediateNonForceCount)))
      : 0,
    executeDebouncedForceCount: Number.isFinite(stats?.executeDebouncedForceCount)
      ? Math.max(0, Math.floor(Number(stats.executeDebouncedForceCount)))
      : 0,
    executeDebouncedNonForceCount: Number.isFinite(stats?.executeDebouncedNonForceCount)
      ? Math.max(0, Math.floor(Number(stats.executeDebouncedNonForceCount)))
      : 0,
    pendingOverwriteCount: Number.isFinite(stats?.pendingOverwriteCount)
      ? Math.max(0, Math.floor(Number(stats.pendingOverwriteCount)))
      : 0,
    debouncedScheduleCount: Number.isFinite(stats?.debouncedScheduleCount)
      ? Math.max(0, Math.floor(Number(stats.debouncedScheduleCount)))
      : 0,
    reusedDebouncedScheduleCount: Number.isFinite(stats?.reusedDebouncedScheduleCount)
      ? Math.max(0, Math.floor(Number(stats.reusedDebouncedScheduleCount)))
      : 0,
    builderWaitScheduleCount: Number.isFinite(stats?.builderWaitScheduleCount)
      ? Math.max(0, Math.floor(Number(stats.builderWaitScheduleCount)))
      : 0,
    staleDebouncedTimerFireCount: Number.isFinite(stats?.staleDebouncedTimerFireCount)
      ? Math.max(0, Math.floor(Number(stats.staleDebouncedTimerFireCount)))
      : 0,
    staleBuilderWaitWakeupCount: Number.isFinite(stats?.staleBuilderWaitWakeupCount)
      ? Math.max(0, Math.floor(Number(stats.staleBuilderWaitWakeupCount)))
      : 0,
    duplicatePendingSignatureCount: Number.isFinite(stats?.duplicatePendingSignatureCount)
      ? Math.max(0, Math.floor(Number(stats.duplicatePendingSignatureCount)))
      : 0,
    skippedDuplicatePendingRequestCount: Number.isFinite(stats?.skippedDuplicatePendingRequestCount)
      ? Math.max(0, Math.floor(Number(stats.skippedDuplicatePendingRequestCount)))
      : 0,
    skippedSatisfiedRequestCount: Number.isFinite(stats?.skippedSatisfiedRequestCount)
      ? Math.max(0, Math.floor(Number(stats.skippedSatisfiedRequestCount)))
      : 0,
    repeatedExecuteCount: Number.isFinite(stats?.repeatedExecuteCount)
      ? Math.max(0, Math.floor(Number(stats.repeatedExecuteCount)))
      : 0,
    skippedRepeatedExecuteCount: Number.isFinite(stats?.skippedRepeatedExecuteCount)
      ? Math.max(0, Math.floor(Number(stats.skippedRepeatedExecuteCount)))
      : 0,
    executeSuccessCount: Number.isFinite(stats?.executeSuccessCount)
      ? Math.max(0, Math.floor(Number(stats.executeSuccessCount)))
      : 0,
    executeFailureCount: Number.isFinite(stats?.executeFailureCount)
      ? Math.max(0, Math.floor(Number(stats.executeFailureCount)))
      : 0,
    executeDurationTotalMs: roundDuration(Number(stats?.executeDurationTotalMs) || 0),
    executeDurationAvgMs: roundDuration(Number(stats?.executeDurationAvgMs) || 0),
    executeDurationP95Ms: roundDuration(Number(stats?.executeDurationP95Ms) || 0),
    executeDurationMaxMs: roundDuration(Number(stats?.executeDurationMaxMs) || 0),
    executeDurationSamplesMs: normalizeDurationSamples(stats?.executeDurationSamplesMs),
    executeImmediateDurationTotalMs: roundDuration(Number(stats?.executeImmediateDurationTotalMs) || 0),
    executeImmediateDurationAvgMs: roundDuration(Number(stats?.executeImmediateDurationAvgMs) || 0),
    executeImmediateDurationP95Ms: roundDuration(Number(stats?.executeImmediateDurationP95Ms) || 0),
    executeImmediateDurationMaxMs: roundDuration(Number(stats?.executeImmediateDurationMaxMs) || 0),
    executeImmediateDurationSamplesMs: normalizeDurationSamples(stats?.executeImmediateDurationSamplesMs),
    executeDebouncedDurationTotalMs: roundDuration(Number(stats?.executeDebouncedDurationTotalMs) || 0),
    executeDebouncedDurationAvgMs: roundDuration(Number(stats?.executeDebouncedDurationAvgMs) || 0),
    executeDebouncedDurationP95Ms: roundDuration(Number(stats?.executeDebouncedDurationP95Ms) || 0),
    executeDebouncedDurationMaxMs: roundDuration(Number(stats?.executeDebouncedDurationMaxMs) || 0),
    executeDebouncedDurationSamplesMs: normalizeDurationSamples(stats?.executeDebouncedDurationSamplesMs),
    executeForceDurationTotalMs: roundDuration(Number(stats?.executeForceDurationTotalMs) || 0),
    executeForceDurationAvgMs: roundDuration(Number(stats?.executeForceDurationAvgMs) || 0),
    executeForceDurationP95Ms: roundDuration(Number(stats?.executeForceDurationP95Ms) || 0),
    executeForceDurationMaxMs: roundDuration(Number(stats?.executeForceDurationMaxMs) || 0),
    executeForceDurationSamplesMs: normalizeDurationSamples(stats?.executeForceDurationSamplesMs),
    executeNonForceDurationTotalMs: roundDuration(Number(stats?.executeNonForceDurationTotalMs) || 0),
    executeNonForceDurationAvgMs: roundDuration(Number(stats?.executeNonForceDurationAvgMs) || 0),
    executeNonForceDurationP95Ms: roundDuration(Number(stats?.executeNonForceDurationP95Ms) || 0),
    executeNonForceDurationMaxMs: roundDuration(Number(stats?.executeNonForceDurationMaxMs) || 0),
    executeNonForceDurationSamplesMs: normalizeDurationSamples(stats?.executeNonForceDurationSamplesMs),
    lastRequestReason:
      typeof stats?.lastRequestReason === 'string' && stats.lastRequestReason.trim()
        ? stats.lastRequestReason.trim()
        : null,
    lastExecuteReason:
      typeof stats?.lastExecuteReason === 'string' && stats.lastExecuteReason.trim()
        ? stats.lastExecuteReason.trim()
        : null,
    lastExecuteStatus:
      typeof stats?.lastExecuteStatus === 'string' && stats.lastExecuteStatus.trim()
        ? stats.lastExecuteStatus.trim()
        : null,
    reasons: normalizeBuildReasonStats(stats?.reasons),
  };
}

function subtractBuildDebugStats(after, before) {
  const next = normalizeBuildDebugStats(after);
  const prev = normalizeBuildDebugStats(before);
  const reasonNames = new Set([...Object.keys(next.reasons), ...Object.keys(prev.reasons)]);
  const reasons = {};
  for (const name of reasonNames) {
    const nextItem = next.reasons[name] || null;
    const prevItem = prev.reasons[name] || null;
    const requestCount = Math.max(0, (nextItem?.requestCount || 0) - (prevItem?.requestCount || 0));
    const executeCount = Math.max(0, (nextItem?.executeCount || 0) - (prevItem?.executeCount || 0));
    const immediateRequestCount = Math.max(
      0,
      (nextItem?.immediateRequestCount || 0) - (prevItem?.immediateRequestCount || 0)
    );
    const debouncedRequestCount = Math.max(
      0,
      (nextItem?.debouncedRequestCount || 0) - (prevItem?.debouncedRequestCount || 0)
    );
    const forceRequestCount = Math.max(
      0,
      (nextItem?.forceRequestCount || 0) - (prevItem?.forceRequestCount || 0)
    );
    const immediateForceRequestCount = Math.max(
      0,
      (nextItem?.immediateForceRequestCount || 0) - (prevItem?.immediateForceRequestCount || 0)
    );
    const immediateNonForceRequestCount = Math.max(
      0,
      (nextItem?.immediateNonForceRequestCount || 0) - (prevItem?.immediateNonForceRequestCount || 0)
    );
    const debouncedForceRequestCount = Math.max(
      0,
      (nextItem?.debouncedForceRequestCount || 0) - (prevItem?.debouncedForceRequestCount || 0)
    );
    const debouncedNonForceRequestCount = Math.max(
      0,
      (nextItem?.debouncedNonForceRequestCount || 0) - (prevItem?.debouncedNonForceRequestCount || 0)
    );
    const executeImmediateCount = Math.max(
      0,
      (nextItem?.executeImmediateCount || 0) - (prevItem?.executeImmediateCount || 0)
    );
    const executeDebouncedCount = Math.max(
      0,
      (nextItem?.executeDebouncedCount || 0) - (prevItem?.executeDebouncedCount || 0)
    );
    const executeForceCount = Math.max(
      0,
      (nextItem?.executeForceCount || 0) - (prevItem?.executeForceCount || 0)
    );
    const executeImmediateForceCount = Math.max(
      0,
      (nextItem?.executeImmediateForceCount || 0) - (prevItem?.executeImmediateForceCount || 0)
    );
    const executeImmediateNonForceCount = Math.max(
      0,
      (nextItem?.executeImmediateNonForceCount || 0) - (prevItem?.executeImmediateNonForceCount || 0)
    );
    const executeDebouncedForceCount = Math.max(
      0,
      (nextItem?.executeDebouncedForceCount || 0) - (prevItem?.executeDebouncedForceCount || 0)
    );
    const executeDebouncedNonForceCount = Math.max(
      0,
      (nextItem?.executeDebouncedNonForceCount || 0) - (prevItem?.executeDebouncedNonForceCount || 0)
    );
    if (
      requestCount < 1 &&
      executeCount < 1 &&
      immediateRequestCount < 1 &&
      debouncedRequestCount < 1 &&
      forceRequestCount < 1 &&
      immediateForceRequestCount < 1 &&
      immediateNonForceRequestCount < 1 &&
      debouncedForceRequestCount < 1 &&
      debouncedNonForceRequestCount < 1 &&
      executeImmediateCount < 1 &&
      executeDebouncedCount < 1 &&
      executeForceCount < 1 &&
      executeImmediateForceCount < 1 &&
      executeImmediateNonForceCount < 1 &&
      executeDebouncedForceCount < 1 &&
      executeDebouncedNonForceCount < 1
    ) {
      continue;
    }
    reasons[name] = {
      requestCount,
      executeCount,
      immediateRequestCount,
      debouncedRequestCount,
      forceRequestCount,
      immediateForceRequestCount,
      immediateNonForceRequestCount,
      debouncedForceRequestCount,
      debouncedNonForceRequestCount,
      executeImmediateCount,
      executeDebouncedCount,
      executeForceCount,
      executeImmediateForceCount,
      executeImmediateNonForceCount,
      executeDebouncedForceCount,
      executeDebouncedNonForceCount,
    };
  }
  return {
    requestCount: Math.max(0, next.requestCount - prev.requestCount),
    immediateRequestCount: Math.max(0, next.immediateRequestCount - prev.immediateRequestCount),
    debouncedRequestCount: Math.max(0, next.debouncedRequestCount - prev.debouncedRequestCount),
    forceRequestCount: Math.max(0, next.forceRequestCount - prev.forceRequestCount),
    immediateForceRequestCount: Math.max(
      0,
      next.immediateForceRequestCount - prev.immediateForceRequestCount
    ),
    immediateNonForceRequestCount: Math.max(
      0,
      next.immediateNonForceRequestCount - prev.immediateNonForceRequestCount
    ),
    debouncedForceRequestCount: Math.max(
      0,
      next.debouncedForceRequestCount - prev.debouncedForceRequestCount
    ),
    debouncedNonForceRequestCount: Math.max(
      0,
      next.debouncedNonForceRequestCount - prev.debouncedNonForceRequestCount
    ),
    executeCount: Math.max(0, next.executeCount - prev.executeCount),
    executeImmediateCount: Math.max(0, next.executeImmediateCount - prev.executeImmediateCount),
    executeDebouncedCount: Math.max(0, next.executeDebouncedCount - prev.executeDebouncedCount),
    executeForceCount: Math.max(0, next.executeForceCount - prev.executeForceCount),
    executeImmediateForceCount: Math.max(
      0,
      next.executeImmediateForceCount - prev.executeImmediateForceCount
    ),
    executeImmediateNonForceCount: Math.max(
      0,
      next.executeImmediateNonForceCount - prev.executeImmediateNonForceCount
    ),
    executeDebouncedForceCount: Math.max(
      0,
      next.executeDebouncedForceCount - prev.executeDebouncedForceCount
    ),
    executeDebouncedNonForceCount: Math.max(
      0,
      next.executeDebouncedNonForceCount - prev.executeDebouncedNonForceCount
    ),
    pendingOverwriteCount: Math.max(0, next.pendingOverwriteCount - prev.pendingOverwriteCount),
    debouncedScheduleCount: Math.max(0, next.debouncedScheduleCount - prev.debouncedScheduleCount),
    reusedDebouncedScheduleCount: Math.max(
      0,
      next.reusedDebouncedScheduleCount - prev.reusedDebouncedScheduleCount
    ),
    builderWaitScheduleCount: Math.max(0, next.builderWaitScheduleCount - prev.builderWaitScheduleCount),
    staleDebouncedTimerFireCount: Math.max(
      0,
      next.staleDebouncedTimerFireCount - prev.staleDebouncedTimerFireCount
    ),
    staleBuilderWaitWakeupCount: Math.max(
      0,
      next.staleBuilderWaitWakeupCount - prev.staleBuilderWaitWakeupCount
    ),
    duplicatePendingSignatureCount: Math.max(
      0,
      next.duplicatePendingSignatureCount - prev.duplicatePendingSignatureCount
    ),
    skippedDuplicatePendingRequestCount: Math.max(
      0,
      next.skippedDuplicatePendingRequestCount - prev.skippedDuplicatePendingRequestCount
    ),
    skippedSatisfiedRequestCount: Math.max(
      0,
      next.skippedSatisfiedRequestCount - prev.skippedSatisfiedRequestCount
    ),
    repeatedExecuteCount: Math.max(0, next.repeatedExecuteCount - prev.repeatedExecuteCount),
    skippedRepeatedExecuteCount: Math.max(
      0,
      next.skippedRepeatedExecuteCount - prev.skippedRepeatedExecuteCount
    ),
    lastRequestReason: next.lastRequestReason || prev.lastRequestReason || null,
    lastExecuteReason: next.lastExecuteReason || prev.lastExecuteReason || null,
    reasons,
  };
}

export function createBuildSummary(stats) {
  const normalized = normalizeBuildDebugStats(stats);
  const rankedReasons = rankBuildReasons(normalized, 1);
  const topReason = rankedReasons[0] || null;
  const executeDuration = createDurationSummary(normalized.executeDurationSamplesMs);
  const immediateDuration = createDurationSummary(normalized.executeImmediateDurationSamplesMs);
  const debouncedDuration = createDurationSummary(normalized.executeDebouncedDurationSamplesMs);
  const forceDuration = createDurationSummary(normalized.executeForceDurationSamplesMs);
  const nonForceDuration = createDurationSummary(normalized.executeNonForceDurationSamplesMs);
  const suppressedRequestCount =
    normalized.skippedDuplicatePendingRequestCount + normalized.skippedSatisfiedRequestCount;
  const suppressedExecuteCount = normalized.skippedRepeatedExecuteCount;
  const staleWakeupCount = normalized.staleDebouncedTimerFireCount + normalized.staleBuilderWaitWakeupCount;
  return {
    requestCount: normalized.requestCount,
    executeCount: normalized.executeCount,
    immediateRequestCount: normalized.immediateRequestCount,
    debouncedRequestCount: normalized.debouncedRequestCount,
    forceRequestCount: normalized.forceRequestCount,
    immediateForceRequestCount: normalized.immediateForceRequestCount,
    immediateNonForceRequestCount: normalized.immediateNonForceRequestCount,
    debouncedForceRequestCount: normalized.debouncedForceRequestCount,
    debouncedNonForceRequestCount: normalized.debouncedNonForceRequestCount,
    executeImmediateCount: normalized.executeImmediateCount,
    executeDebouncedCount: normalized.executeDebouncedCount,
    executeForceCount: normalized.executeForceCount,
    executeImmediateForceCount: normalized.executeImmediateForceCount,
    executeImmediateNonForceCount: normalized.executeImmediateNonForceCount,
    executeDebouncedForceCount: normalized.executeDebouncedForceCount,
    executeDebouncedNonForceCount: normalized.executeDebouncedNonForceCount,
    pendingOverwriteCount: normalized.pendingOverwriteCount,
    suppressedRequestCount,
    suppressedExecuteCount,
    debouncedScheduleCount: normalized.debouncedScheduleCount,
    reusedDebouncedScheduleCount: normalized.reusedDebouncedScheduleCount,
    builderWaitScheduleCount: normalized.builderWaitScheduleCount,
    staleWakeupCount,
    reasonCount: Object.keys(normalized.reasons).length,
    executeSuccessCount: normalized.executeSuccessCount,
    executeFailureCount: normalized.executeFailureCount,
    executeDurationCount: executeDuration.count,
    executeDurationTotalMs: executeDuration.totalMs,
    executeDurationAvgMs: executeDuration.avgMs,
    executeDurationP95Ms: executeDuration.p95Ms,
    executeDurationMaxMs: executeDuration.maxMs,
    executeImmediateDurationCount: immediateDuration.count,
    executeImmediateDurationAvgMs: immediateDuration.avgMs,
    executeImmediateDurationP95Ms: immediateDuration.p95Ms,
    executeImmediateDurationMaxMs: immediateDuration.maxMs,
    executeDebouncedDurationCount: debouncedDuration.count,
    executeDebouncedDurationAvgMs: debouncedDuration.avgMs,
    executeDebouncedDurationP95Ms: debouncedDuration.p95Ms,
    executeDebouncedDurationMaxMs: debouncedDuration.maxMs,
    executeForceDurationCount: forceDuration.count,
    executeForceDurationAvgMs: forceDuration.avgMs,
    executeForceDurationP95Ms: forceDuration.p95Ms,
    executeForceDurationMaxMs: forceDuration.maxMs,
    executeNonForceDurationCount: nonForceDuration.count,
    executeNonForceDurationAvgMs: nonForceDuration.avgMs,
    executeNonForceDurationP95Ms: nonForceDuration.p95Ms,
    executeNonForceDurationMaxMs: nonForceDuration.maxMs,
    lastExecuteStatus: normalized.lastExecuteStatus,
    ...(topReason
      ? {
          topReason: topReason.reason,
          topReasonRequestCount: topReason.requestCount,
          topReasonExecuteCount: topReason.executeCount,
        }
      : {}),
  };
}

export function rankBuildReasons(stats, limit = 5) {
  const normalized = normalizeBuildDebugStats(stats);
  return Object.entries(normalized.reasons)
    .map(([reason, item]) => ({
      reason,
      requestCount: Number(item?.requestCount) || 0,
      executeCount: Number(item?.executeCount) || 0,
      immediateRequestCount: Number(item?.immediateRequestCount) || 0,
      debouncedRequestCount: Number(item?.debouncedRequestCount) || 0,
      forceRequestCount: Number(item?.forceRequestCount) || 0,
      immediateForceRequestCount: Number(item?.immediateForceRequestCount) || 0,
      immediateNonForceRequestCount: Number(item?.immediateNonForceRequestCount) || 0,
      debouncedForceRequestCount: Number(item?.debouncedForceRequestCount) || 0,
      debouncedNonForceRequestCount: Number(item?.debouncedNonForceRequestCount) || 0,
      executeImmediateCount: Number(item?.executeImmediateCount) || 0,
      executeDebouncedCount: Number(item?.executeDebouncedCount) || 0,
      executeForceCount: Number(item?.executeForceCount) || 0,
      executeImmediateForceCount: Number(item?.executeImmediateForceCount) || 0,
      executeImmediateNonForceCount: Number(item?.executeImmediateNonForceCount) || 0,
      executeDebouncedForceCount: Number(item?.executeDebouncedForceCount) || 0,
      executeDebouncedNonForceCount: Number(item?.executeDebouncedNonForceCount) || 0,
      executeSuccessCount: Number(item?.executeSuccessCount) || 0,
      executeFailureCount: Number(item?.executeFailureCount) || 0,
      executeDurationTotalMs: roundDuration(Number(item?.executeDurationTotalMs) || 0),
      executeDurationAvgMs: roundDuration(Number(item?.executeDurationAvgMs) || 0),
      executeDurationP95Ms: roundDuration(Number(item?.executeDurationP95Ms) || 0),
      executeDurationMaxMs: roundDuration(Number(item?.executeDurationMaxMs) || 0),
      executeDurationCount: normalizeDurationSamples(item?.executeDurationSamplesMs).length,
    }))
    .filter(item => item.requestCount > 0 || item.executeCount > 0)
    .sort((left, right) => {
      if (right.executeCount !== left.executeCount) return right.executeCount - left.executeCount;
      if (right.requestCount !== left.requestCount) return right.requestCount - left.requestCount;
      if (right.debouncedRequestCount !== left.debouncedRequestCount) {
        return right.debouncedRequestCount - left.debouncedRequestCount;
      }
      return left.reason.localeCompare(right.reason);
    })
    .slice(0, Math.max(1, limit));
}

export function rankBuildSlowReasons(stats, limit = 5) {
  const normalized = normalizeBuildDebugStats(stats);
  return Object.entries(normalized.reasons)
    .map(([reason, item]) => {
      const duration = createDurationSummary(item?.executeDurationSamplesMs);
      return {
        reason,
        executeCount: Number(item?.executeCount) || 0,
        executeSuccessCount: Number(item?.executeSuccessCount) || 0,
        executeFailureCount: Number(item?.executeFailureCount) || 0,
        executeDurationCount: duration.count,
        executeDurationTotalMs: duration.totalMs,
        executeDurationAvgMs: duration.avgMs,
        executeDurationP95Ms: duration.p95Ms,
        executeDurationMaxMs: duration.maxMs,
      };
    })
    .filter(item => item.executeDurationCount > 0)
    .sort((left, right) => {
      if (right.executeDurationP95Ms !== left.executeDurationP95Ms) {
        return right.executeDurationP95Ms - left.executeDurationP95Ms;
      }
      if (right.executeDurationMaxMs !== left.executeDurationMaxMs) {
        return right.executeDurationMaxMs - left.executeDurationMaxMs;
      }
      if (right.executeDurationAvgMs !== left.executeDurationAvgMs) {
        return right.executeDurationAvgMs - left.executeDurationAvgMs;
      }
      if (right.executeDurationTotalMs !== left.executeDurationTotalMs) {
        return right.executeDurationTotalMs - left.executeDurationTotalMs;
      }
      return left.reason.localeCompare(right.reason);
    })
    .slice(0, Math.max(1, limit));
}

export function createBuildFlowPressureSummary(steps) {
  const summary = {};
  for (const rawStep of Array.isArray(steps) ? steps : []) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const name = typeof rawStep.name === 'string' && rawStep.name.trim() ? rawStep.name.trim() : null;
    if (!name) continue;
    const delta = subtractBuildDebugStats(rawStep.after || null, rawStep.before || null);
    const topReasons = rankBuildReasons(delta, 3).map(item => item.reason);
    const suppressedRequestCount =
      delta.skippedDuplicatePendingRequestCount + delta.skippedSatisfiedRequestCount;
    const suppressedExecuteCount = delta.skippedRepeatedExecuteCount;
    const debounceCount = delta.debouncedScheduleCount + delta.reusedDebouncedScheduleCount;
    const staleWakeupCount = delta.staleDebouncedTimerFireCount + delta.staleBuilderWaitWakeupCount;
    summary[name] = {
      durationMs: roundDuration(Number(rawStep.durationMs) || 0),
      requestCount: delta.requestCount,
      executeCount: delta.executeCount,
      immediateRequestCount: delta.immediateRequestCount,
      debouncedRequestCount: delta.debouncedRequestCount,
      forceRequestCount: delta.forceRequestCount,
      immediateForceRequestCount: delta.immediateForceRequestCount,
      immediateNonForceRequestCount: delta.immediateNonForceRequestCount,
      debouncedForceRequestCount: delta.debouncedForceRequestCount,
      debouncedNonForceRequestCount: delta.debouncedNonForceRequestCount,
      executeImmediateCount: delta.executeImmediateCount,
      executeDebouncedCount: delta.executeDebouncedCount,
      executeForceCount: delta.executeForceCount,
      executeImmediateForceCount: delta.executeImmediateForceCount,
      executeImmediateNonForceCount: delta.executeImmediateNonForceCount,
      executeDebouncedForceCount: delta.executeDebouncedForceCount,
      executeDebouncedNonForceCount: delta.executeDebouncedNonForceCount,
      pendingOverwriteCount: delta.pendingOverwriteCount,
      suppressedRequestCount,
      suppressedExecuteCount,
      debounceCount,
      builderWaitScheduleCount: delta.builderWaitScheduleCount,
      staleWakeupCount,
      topReasons,
    };
  }
  return summary;
}

export function rankBuildFlowPressure(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      durationMs: Number(item?.durationMs) || 0,
      requestCount: Number(item?.requestCount) || 0,
      executeCount: Number(item?.executeCount) || 0,
      immediateRequestCount: Number(item?.immediateRequestCount) || 0,
      debouncedRequestCount: Number(item?.debouncedRequestCount) || 0,
      forceRequestCount: Number(item?.forceRequestCount) || 0,
      immediateForceRequestCount: Number(item?.immediateForceRequestCount) || 0,
      immediateNonForceRequestCount: Number(item?.immediateNonForceRequestCount) || 0,
      debouncedForceRequestCount: Number(item?.debouncedForceRequestCount) || 0,
      debouncedNonForceRequestCount: Number(item?.debouncedNonForceRequestCount) || 0,
      executeImmediateCount: Number(item?.executeImmediateCount) || 0,
      executeDebouncedCount: Number(item?.executeDebouncedCount) || 0,
      executeForceCount: Number(item?.executeForceCount) || 0,
      executeImmediateForceCount: Number(item?.executeImmediateForceCount) || 0,
      executeImmediateNonForceCount: Number(item?.executeImmediateNonForceCount) || 0,
      executeDebouncedForceCount: Number(item?.executeDebouncedForceCount) || 0,
      executeDebouncedNonForceCount: Number(item?.executeDebouncedNonForceCount) || 0,
      pendingOverwriteCount: Number(item?.pendingOverwriteCount) || 0,
      suppressedRequestCount: Number(item?.suppressedRequestCount) || 0,
      suppressedExecuteCount: Number(item?.suppressedExecuteCount) || 0,
      debounceCount: Number(item?.debounceCount) || 0,
      builderWaitScheduleCount: Number(item?.builderWaitScheduleCount) || 0,
      staleWakeupCount: Number(item?.staleWakeupCount) || 0,
      topReasons: Array.isArray(item?.topReasons) ? item.topReasons.slice() : [],
    }))
    .filter(
      item =>
        item.requestCount > 0 ||
        item.executeCount > 0 ||
        item.pendingOverwriteCount > 0 ||
        item.suppressedRequestCount > 0 ||
        item.debounceCount > 0
    )
    .sort((left, right) => {
      if (right.executeCount !== left.executeCount) return right.executeCount - left.executeCount;
      if (right.requestCount !== left.requestCount) return right.requestCount - left.requestCount;
      if (right.pendingOverwriteCount !== left.pendingOverwriteCount) {
        return right.pendingOverwriteCount - left.pendingOverwriteCount;
      }
      if (right.suppressedRequestCount !== left.suppressedRequestCount) {
        return right.suppressedRequestCount - left.suppressedRequestCount;
      }
      if (right.debounceCount !== left.debounceCount) return right.debounceCount - left.debounceCount;
      if (right.durationMs !== left.durationMs) return right.durationMs - left.durationMs;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, limit));
}

export function createBuildPressureBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    budget[name] = {
      maxRequestCount: Math.max(Math.ceil((Number(item?.requestCount) || 0) * 1.5 + 2), 4),
      maxExecuteCount: Math.max(Math.ceil((Number(item?.executeCount) || 0) * 1.4 + 1), 2),
      maxPendingOverwriteCount: Math.max(Math.ceil((Number(item?.pendingOverwriteCount) || 0) * 1.5 + 1), 1),
      maxSuppressedRequestCount: Math.max(
        Math.ceil((Number(item?.suppressedRequestCount) || 0) * 1.5 + 1),
        1
      ),
      maxDebounceCount: Math.max(Math.ceil((Number(item?.debounceCount) || 0) * 1.4 + 1), 1),
    };
  }
  return budget;
}

export function createJourneyBuildPressureSummary(steps) {
  const summary = {};
  for (const rawStep of Array.isArray(steps) ? steps : []) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const journeyName = normalizeUserFlowJourneyName(
      rawStep.journey || inferUserFlowJourneyName(rawStep.name)
    );
    const stepName = typeof rawStep.name === 'string' && rawStep.name.trim() ? rawStep.name.trim() : null;
    if (!stepName) continue;
    const delta = subtractBuildDebugStats(rawStep.after || null, rawStep.before || null);
    const debounceCount = delta.debouncedScheduleCount + delta.reusedDebouncedScheduleCount;
    if (!summary[journeyName]) {
      summary[journeyName] = {
        stepCount: 0,
        totalDurationMs: 0,
        requestCount: 0,
        executeCount: 0,
        immediateRequestCount: 0,
        debouncedRequestCount: 0,
        forceRequestCount: 0,
        immediateForceRequestCount: 0,
        immediateNonForceRequestCount: 0,
        debouncedForceRequestCount: 0,
        debouncedNonForceRequestCount: 0,
        executeImmediateCount: 0,
        executeDebouncedCount: 0,
        executeForceCount: 0,
        executeImmediateForceCount: 0,
        executeImmediateNonForceCount: 0,
        executeDebouncedForceCount: 0,
        executeDebouncedNonForceCount: 0,
        pendingOverwriteCount: 0,
        suppressedRequestCount: 0,
        suppressedExecuteCount: 0,
        debounceCount: 0,
        builderWaitScheduleCount: 0,
        staleWakeupCount: 0,
        reasons: {},
        steps: [],
      };
    }
    const bucket = summary[journeyName];
    bucket.stepCount += 1;
    bucket.totalDurationMs = roundDuration(bucket.totalDurationMs + (Number(rawStep.durationMs) || 0));
    bucket.requestCount += delta.requestCount;
    bucket.executeCount += delta.executeCount;
    bucket.immediateRequestCount += delta.immediateRequestCount;
    bucket.debouncedRequestCount += delta.debouncedRequestCount;
    bucket.forceRequestCount += delta.forceRequestCount;
    bucket.immediateForceRequestCount += delta.immediateForceRequestCount;
    bucket.immediateNonForceRequestCount += delta.immediateNonForceRequestCount;
    bucket.debouncedForceRequestCount += delta.debouncedForceRequestCount;
    bucket.debouncedNonForceRequestCount += delta.debouncedNonForceRequestCount;
    bucket.executeImmediateCount += delta.executeImmediateCount;
    bucket.executeDebouncedCount += delta.executeDebouncedCount;
    bucket.executeForceCount += delta.executeForceCount;
    bucket.executeImmediateForceCount += delta.executeImmediateForceCount;
    bucket.executeImmediateNonForceCount += delta.executeImmediateNonForceCount;
    bucket.executeDebouncedForceCount += delta.executeDebouncedForceCount;
    bucket.executeDebouncedNonForceCount += delta.executeDebouncedNonForceCount;
    bucket.pendingOverwriteCount += delta.pendingOverwriteCount;
    bucket.suppressedRequestCount +=
      delta.skippedDuplicatePendingRequestCount + delta.skippedSatisfiedRequestCount;
    bucket.suppressedExecuteCount += delta.skippedRepeatedExecuteCount;
    bucket.debounceCount += debounceCount;
    bucket.builderWaitScheduleCount += delta.builderWaitScheduleCount;
    bucket.staleWakeupCount += delta.staleDebouncedTimerFireCount + delta.staleBuilderWaitWakeupCount;
    bucket.steps.push(stepName);
    for (const [reason, reasonItem] of Object.entries(delta.reasons || {})) {
      if (!bucket.reasons[reason]) {
        bucket.reasons[reason] = {
          requestCount: 0,
          executeCount: 0,
          immediateRequestCount: 0,
          debouncedRequestCount: 0,
          forceRequestCount: 0,
          immediateForceRequestCount: 0,
          immediateNonForceRequestCount: 0,
          debouncedForceRequestCount: 0,
          debouncedNonForceRequestCount: 0,
          executeImmediateCount: 0,
          executeDebouncedCount: 0,
          executeForceCount: 0,
          executeImmediateForceCount: 0,
          executeImmediateNonForceCount: 0,
          executeDebouncedForceCount: 0,
          executeDebouncedNonForceCount: 0,
        };
      }
      const reasonBucket = bucket.reasons[reason];
      reasonBucket.requestCount += Number(reasonItem?.requestCount) || 0;
      reasonBucket.executeCount += Number(reasonItem?.executeCount) || 0;
      reasonBucket.immediateRequestCount += Number(reasonItem?.immediateRequestCount) || 0;
      reasonBucket.debouncedRequestCount += Number(reasonItem?.debouncedRequestCount) || 0;
      reasonBucket.forceRequestCount += Number(reasonItem?.forceRequestCount) || 0;
      reasonBucket.immediateForceRequestCount += Number(reasonItem?.immediateForceRequestCount) || 0;
      reasonBucket.immediateNonForceRequestCount += Number(reasonItem?.immediateNonForceRequestCount) || 0;
      reasonBucket.debouncedForceRequestCount += Number(reasonItem?.debouncedForceRequestCount) || 0;
      reasonBucket.debouncedNonForceRequestCount += Number(reasonItem?.debouncedNonForceRequestCount) || 0;
      reasonBucket.executeImmediateCount += Number(reasonItem?.executeImmediateCount) || 0;
      reasonBucket.executeDebouncedCount += Number(reasonItem?.executeDebouncedCount) || 0;
      reasonBucket.executeForceCount += Number(reasonItem?.executeForceCount) || 0;
      reasonBucket.executeImmediateForceCount += Number(reasonItem?.executeImmediateForceCount) || 0;
      reasonBucket.executeImmediateNonForceCount += Number(reasonItem?.executeImmediateNonForceCount) || 0;
      reasonBucket.executeDebouncedForceCount += Number(reasonItem?.executeDebouncedForceCount) || 0;
      reasonBucket.executeDebouncedNonForceCount += Number(reasonItem?.executeDebouncedNonForceCount) || 0;
    }
  }
  for (const bucket of Object.values(summary)) {
    bucket.totalDurationMs = roundDuration(bucket.totalDurationMs);
    bucket.topReasons = rankBuildReasons(bucket, 3).map(item => item.reason);
  }
  return summary;
}

export function rankJourneyBuildPressure(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      stepCount: Number(item?.stepCount) || 0,
      totalDurationMs: Number(item?.totalDurationMs) || 0,
      requestCount: Number(item?.requestCount) || 0,
      executeCount: Number(item?.executeCount) || 0,
      immediateForceRequestCount: Number(item?.immediateForceRequestCount) || 0,
      immediateNonForceRequestCount: Number(item?.immediateNonForceRequestCount) || 0,
      debouncedForceRequestCount: Number(item?.debouncedForceRequestCount) || 0,
      debouncedNonForceRequestCount: Number(item?.debouncedNonForceRequestCount) || 0,
      forceRequestCount: Number(item?.forceRequestCount) || 0,
      executeForceCount: Number(item?.executeForceCount) || 0,
      pendingOverwriteCount: Number(item?.pendingOverwriteCount) || 0,
      suppressedRequestCount: Number(item?.suppressedRequestCount) || 0,
      debounceCount: Number(item?.debounceCount) || 0,
      topReasons: Array.isArray(item?.topReasons) ? item.topReasons.slice() : [],
    }))
    .filter(item => item.stepCount > 0)
    .sort((left, right) => {
      if (right.executeCount !== left.executeCount) return right.executeCount - left.executeCount;
      if (right.requestCount !== left.requestCount) return right.requestCount - left.requestCount;
      if (right.pendingOverwriteCount !== left.pendingOverwriteCount) {
        return right.pendingOverwriteCount - left.pendingOverwriteCount;
      }
      if (right.debounceCount !== left.debounceCount) return right.debounceCount - left.debounceCount;
      if (right.totalDurationMs !== left.totalDurationMs) return right.totalDurationMs - left.totalDurationMs;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, limit));
}

export function createJourneyStoreSourceSummary(steps) {
  const summary = {};
  for (const rawStep of Array.isArray(steps) ? steps : []) {
    if (!rawStep || typeof rawStep !== 'object') continue;
    const journeyName = normalizeUserFlowJourneyName(
      rawStep.journey || inferUserFlowJourneyName(rawStep.name)
    );
    const stepName = typeof rawStep.name === 'string' && rawStep.name.trim() ? rawStep.name.trim() : null;
    if (!stepName) continue;
    const delta = subtractStoreDebugStats(rawStep.after || null, rawStep.before || null);
    if (!summary[journeyName]) summary[journeyName] = {};
    for (const item of Object.values(delta.sources || {})) {
      const key = typeof item?.key === 'string' && item.key.trim() ? item.key.trim() : null;
      if (!key) continue;
      if (!summary[journeyName][key]) {
        summary[journeyName][key] = {
          key,
          source: item.source || 'unknown',
          type: item.type || 'PATCH',
          slices: Array.isArray(item.slices) ? item.slices.slice() : [],
          count: 0,
          totalMs: 0,
          maxMs: 0,
          slowCount: 0,
          stepCount: 0,
          steps: [],
        };
      }
      const bucket = summary[journeyName][key];
      bucket.count += Number(item.count) || 0;
      bucket.totalMs = roundDuration(bucket.totalMs + (Number(item.totalMs) || 0));
      bucket.maxMs = Math.max(bucket.maxMs, Number(item.maxMs) || 0);
      bucket.slowCount += Number(item.slowCount) || 0;
      bucket.stepCount += 1;
      bucket.steps.push(stepName);
    }
  }
  for (const journeySources of Object.values(summary)) {
    for (const item of Object.values(journeySources)) {
      item.totalMs = roundDuration(item.totalMs);
      item.maxMs = roundDuration(item.maxMs);
      item.steps = item.steps.slice().sort((left, right) => left.localeCompare(right));
    }
  }
  return summary;
}

export function rankJourneyStoreSources(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([key, item]) => ({
      key,
      source: item?.source || 'unknown',
      type: item?.type || 'PATCH',
      slices: Array.isArray(item?.slices) ? item.slices.slice() : [],
      count: Number(item?.count) || 0,
      totalMs: Number(item?.totalMs) || 0,
      maxMs: Number(item?.maxMs) || 0,
      slowCount: Number(item?.slowCount) || 0,
      stepCount: Number(item?.stepCount) || 0,
      steps: Array.isArray(item?.steps) ? item.steps.slice() : [],
    }))
    .filter(item => item.count > 0 || item.totalMs > 0 || item.stepCount > 0)
    .sort((left, right) => {
      if (right.totalMs !== left.totalMs) return right.totalMs - left.totalMs;
      if (right.stepCount !== left.stepCount) return right.stepCount - left.stepCount;
      if (right.count !== left.count) return right.count - left.count;
      if (right.slowCount !== left.slowCount) return right.slowCount - left.slowCount;
      return left.key.localeCompare(right.key);
    })
    .slice(0, Math.max(1, limit));
}

export function createUserJourneyDiagnosisSummary(
  journeySummary,
  storeFlowSummary = {},
  journeyStoreSourceSummary = {}
) {
  const summary = {};
  const journeys = journeySummary && typeof journeySummary === 'object' ? journeySummary : {};
  const flowSummary = storeFlowSummary && typeof storeFlowSummary === 'object' ? storeFlowSummary : {};
  const journeySources =
    journeyStoreSourceSummary && typeof journeyStoreSourceSummary === 'object'
      ? journeyStoreSourceSummary
      : {};
  for (const [name, item] of Object.entries(journeys)) {
    const stepNames = Array.isArray(item?.steps) ? item.steps.slice() : [];
    const stepRows = stepNames
      .map(stepName => ({ name: stepName, ...(flowSummary[stepName] || {}) }))
      .filter(step => step.name);
    const burstyStepRows = stepRows.filter(step => {
      const commitCount = Number(step.commitCount) || 0;
      const selectorNotifyCount = Number(step.selectorNotifyCount) || 0;
      const totalSourceMs = Number(step.totalSourceMs) || 0;
      return commitCount >= 6 || selectorNotifyCount >= 18 || totalSourceMs >= 20;
    });
    const topStep =
      stepRows.slice().sort((left, right) => {
        if ((right.commitCount || 0) !== (left.commitCount || 0))
          return (right.commitCount || 0) - (left.commitCount || 0);
        if ((right.selectorNotifyCount || 0) !== (left.selectorNotifyCount || 0)) {
          return (right.selectorNotifyCount || 0) - (left.selectorNotifyCount || 0);
        }
        if ((right.totalSourceMs || 0) !== (left.totalSourceMs || 0))
          return (right.totalSourceMs || 0) - (left.totalSourceMs || 0);
        if ((right.durationMs || 0) !== (left.durationMs || 0))
          return (right.durationMs || 0) - (left.durationMs || 0);
        return String(left.name || '').localeCompare(String(right.name || ''));
      })[0] || null;
    const rankedSources = rankJourneyStoreSources(journeySources[name], 3);
    const topSource = rankedSources[0] || null;
    const repeatedSourceCount = rankedSources.filter(source => (Number(source.stepCount) || 0) >= 2).length;
    const dominantSourceSharePct =
      Number(item?.totalSourceMs) > 0 && topSource
        ? roundDuration(Math.min(100, ((Number(topSource.totalMs) || 0) / Number(item.totalSourceMs)) * 100))
        : 0;
    const commitCount = Number(item?.commitCount) || 0;
    const selectorNotifyCount = Number(item?.selectorNotifyCount) || 0;
    const totalDurationMs = Number(item?.totalDurationMs) || 0;
    let primaryBottleneck = 'balanced';
    if (
      commitCount >= Math.max(10, selectorNotifyCount * 0.5) &&
      commitCount >= (Number(item?.stepCount) || 0) * 2
    ) {
      primaryBottleneck = 'store-churn';
    } else if (selectorNotifyCount >= Math.max(20, commitCount * 1.75)) {
      primaryBottleneck = 'selector-fanout';
    } else if (dominantSourceSharePct >= 45 && (Number(topSource?.stepCount) || 0) >= 2) {
      primaryBottleneck = 'source-hotspot';
    } else if (totalDurationMs >= Math.max(250, (Number(item?.totalSourceMs) || 0) * 3)) {
      primaryBottleneck = 'duration-heavy';
    }
    summary[name] = {
      stepCount: Number(item?.stepCount) || 0,
      burstyStepCount: burstyStepRows.length,
      repeatedSourceCount,
      dominantSourceSharePct,
      primaryBottleneck,
      totalDurationMs: roundDuration(totalDurationMs),
      totalSourceMs: roundDuration(Number(item?.totalSourceMs) || 0),
      commitCount,
      selectorNotifyCount,
      ...(topStep
        ? {
            topStepName: topStep.name,
            topStepCommitCount: Number(topStep.commitCount) || 0,
            topStepSelectorNotifyCount: Number(topStep.selectorNotifyCount) || 0,
            topStepTotalSourceMs: roundDuration(Number(topStep.totalSourceMs) || 0),
          }
        : {}),
      ...(topSource
        ? {
            topSourceKey: topSource.key,
            topSourceTotalMs: roundDuration(Number(topSource.totalMs) || 0),
            topSourceStepCount: Number(topSource.stepCount) || 0,
          }
        : {}),
      topSources: rankedSources.map(source => source.key),
      burstySteps: burstyStepRows.map(step => step.name).sort((left, right) => left.localeCompare(right)),
    };
  }
  return summary;
}

export function rankUserJourneyDiagnosis(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      stepCount: Number(item?.stepCount) || 0,
      burstyStepCount: Number(item?.burstyStepCount) || 0,
      repeatedSourceCount: Number(item?.repeatedSourceCount) || 0,
      dominantSourceSharePct: Number(item?.dominantSourceSharePct) || 0,
      primaryBottleneck: item?.primaryBottleneck || 'balanced',
      totalDurationMs: Number(item?.totalDurationMs) || 0,
      totalSourceMs: Number(item?.totalSourceMs) || 0,
      commitCount: Number(item?.commitCount) || 0,
      selectorNotifyCount: Number(item?.selectorNotifyCount) || 0,
      topStepName: item?.topStepName || null,
      topSourceKey: item?.topSourceKey || null,
      topSources: Array.isArray(item?.topSources) ? item.topSources.slice() : [],
      burstySteps: Array.isArray(item?.burstySteps) ? item.burstySteps.slice() : [],
    }))
    .filter(item => item.stepCount > 0)
    .sort((left, right) => {
      if (right.burstyStepCount !== left.burstyStepCount) return right.burstyStepCount - left.burstyStepCount;
      if (right.repeatedSourceCount !== left.repeatedSourceCount)
        return right.repeatedSourceCount - left.repeatedSourceCount;
      if (right.dominantSourceSharePct !== left.dominantSourceSharePct) {
        return right.dominantSourceSharePct - left.dominantSourceSharePct;
      }
      if (right.totalSourceMs !== left.totalSourceMs) return right.totalSourceMs - left.totalSourceMs;
      if (right.totalDurationMs !== left.totalDurationMs) return right.totalDurationMs - left.totalDurationMs;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, limit));
}

export function createUserJourneyDiagnosisBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    budget[name] = {
      maxBurstyStepCount: Math.max(Math.ceil((Number(item?.burstyStepCount) || 0) * 1.4 + 1), 2),
      maxRepeatedSourceCount: Math.max(Math.ceil((Number(item?.repeatedSourceCount) || 0) * 1.35 + 1), 2),
      maxDominantSourceSharePct: Math.min(
        100,
        Math.max(Math.ceil((Number(item?.dominantSourceSharePct) || 0) * 1.2 + 10), 55)
      ),
    };
  }
  return budget;
}

function normalizeUserFlowJourneyName(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : 'uncategorized';
}

function inferUserFlowJourneyName(stepName) {
  const name = typeof stepName === 'string' ? stepName.trim() : '';
  if (!name) return 'uncategorized';
  if (name.startsWith('boot.') || name.startsWith('tab.settings.open')) return 'boot-and-shell';
  if (name.startsWith('render.') || name.startsWith('cabinet-core.')) {
    return 'cabinet-core-authoring';
  }
  if (name.startsWith('export.')) return 'export-authoring';
  if (name.startsWith('settings.visual.')) return 'cabinet-core-authoring';
  if (name.startsWith('cloud-sync.')) return 'cloud-sync-controls';
  if (name.startsWith('order-pdf.')) return 'order-pdf-lifecycle';
  if (name.startsWith('settings-backup.')) return 'settings-backup-resilience';
  if (
    name.startsWith('project.load.invalid') ||
    name.startsWith('project.restore-last-session.missing-autosave')
  ) {
    return 'project-recovery-proveout';
  }
  if (
    name.startsWith('project.save-load.') ||
    name.startsWith('project.reset-default.') ||
    name === 'project.restore-last-session'
  ) {
    return 'project-roundtrip';
  }
  if (name.startsWith('project.')) return 'project-recovery-proveout';
  return 'uncategorized';
}

function normalizeUserFlowSteps(steps, fallbackFlow = {}) {
  if (Array.isArray(steps) && steps.length) {
    return steps
      .map(rawStep => {
        if (!rawStep || typeof rawStep !== 'object') return null;
        const name = typeof rawStep.name === 'string' && rawStep.name.trim() ? rawStep.name.trim() : null;
        if (!name) return null;
        return {
          name,
          durationMs: roundDuration(Number(rawStep.durationMs) || 0),
          journey: normalizeUserFlowJourneyName(rawStep.journey || inferUserFlowJourneyName(name)),
          tags: Array.isArray(rawStep.tags)
            ? rawStep.tags.map(value => String(value || '').trim()).filter(Boolean)
            : [],
        };
      })
      .filter(Boolean);
  }
  return Object.entries(fallbackFlow || {}).map(([name, durationMs]) => ({
    name,
    durationMs: roundDuration(Number(durationMs) || 0),
    journey: normalizeUserFlowJourneyName(inferUserFlowJourneyName(name)),
    tags: [],
  }));
}

export function createUserJourneySummary(steps, storeFlowSummary = {}, fallbackFlow = {}) {
  const summary = {};
  for (const step of normalizeUserFlowSteps(steps, fallbackFlow)) {
    const journeyName = step.journey;
    if (!summary[journeyName]) {
      summary[journeyName] = {
        stepCount: 0,
        totalDurationMs: 0,
        averageStepMs: 0,
        maxStepDurationMs: 0,
        commitCount: 0,
        selectorNotifyCount: 0,
        totalSourceMs: 0,
        slowSourceCount: 0,
        steps: [],
        topSources: [],
      };
    }
    const bucket = summary[journeyName];
    const pressure =
      storeFlowSummary && typeof storeFlowSummary === 'object' ? storeFlowSummary[step.name] || {} : {};
    bucket.stepCount += 1;
    bucket.totalDurationMs = roundDuration(bucket.totalDurationMs + step.durationMs);
    bucket.maxStepDurationMs = Math.max(bucket.maxStepDurationMs, step.durationMs);
    bucket.commitCount += Number(pressure?.commitCount) || 0;
    bucket.selectorNotifyCount += Number(pressure?.selectorNotifyCount) || 0;
    bucket.totalSourceMs = roundDuration(bucket.totalSourceMs + (Number(pressure?.totalSourceMs) || 0));
    bucket.slowSourceCount += Number(pressure?.slowSourceCount) || 0;
    bucket.steps.push(step.name);
    const sourceSet = new Set(bucket.topSources);
    for (const source of Array.isArray(pressure?.topSources) ? pressure.topSources : []) {
      const normalizedSource = String(source || '').trim();
      if (!normalizedSource) continue;
      sourceSet.add(normalizedSource);
    }
    bucket.topSources = Array.from(sourceSet)
      .sort((left, right) => left.localeCompare(right))
      .slice(0, 5);
  }

  for (const bucket of Object.values(summary)) {
    bucket.averageStepMs =
      bucket.stepCount > 0 ? roundDuration(bucket.totalDurationMs / bucket.stepCount) : 0;
    bucket.steps = bucket.steps.slice().sort((left, right) => left.localeCompare(right));
    bucket.totalDurationMs = roundDuration(bucket.totalDurationMs);
    bucket.maxStepDurationMs = roundDuration(bucket.maxStepDurationMs);
    bucket.totalSourceMs = roundDuration(bucket.totalSourceMs);
  }

  return summary;
}

export function rankUserJourneys(summary, limit = 5) {
  return Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      stepCount: Number(item?.stepCount) || 0,
      totalDurationMs: Number(item?.totalDurationMs) || 0,
      averageStepMs: Number(item?.averageStepMs) || 0,
      maxStepDurationMs: Number(item?.maxStepDurationMs) || 0,
      commitCount: Number(item?.commitCount) || 0,
      selectorNotifyCount: Number(item?.selectorNotifyCount) || 0,
      totalSourceMs: Number(item?.totalSourceMs) || 0,
      slowSourceCount: Number(item?.slowSourceCount) || 0,
      topSources: Array.isArray(item?.topSources) ? item.topSources.slice() : [],
    }))
    .filter(item => item.stepCount > 0)
    .sort((left, right) => {
      if (right.commitCount !== left.commitCount) return right.commitCount - left.commitCount;
      if (right.selectorNotifyCount !== left.selectorNotifyCount) {
        return right.selectorNotifyCount - left.selectorNotifyCount;
      }
      if (right.totalSourceMs !== left.totalSourceMs) return right.totalSourceMs - left.totalSourceMs;
      if (right.totalDurationMs !== left.totalDurationMs) return right.totalDurationMs - left.totalDurationMs;
      if (right.maxStepDurationMs !== left.maxStepDurationMs)
        return right.maxStepDurationMs - left.maxStepDurationMs;
      return left.name.localeCompare(right.name);
    })
    .slice(0, Math.max(1, limit));
}

export function createUserJourneyBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    budget[name] = {
      maxTotalDurationMs: Math.max(Math.ceil((Number(item?.totalDurationMs) || 0) * 1.35 + 40), 150),
      maxCommitCount: Math.max(Math.ceil((Number(item?.commitCount) || 0) * 1.4 + 4), 8),
      maxSelectorNotifyCount: Math.max(Math.ceil((Number(item?.selectorNotifyCount) || 0) * 1.35 + 12), 20),
      maxTotalSourceMs: Math.max(Math.ceil((Number(item?.totalSourceMs) || 0) * 1.4 + 20), 35),
    };
  }
  return budget;
}

export function createProjectActionSummary(events) {
  const groups = {};
  for (const event of Array.isArray(events) ? events : []) {
    if (!event || typeof event !== 'object') continue;
    const action = typeof event.action === 'string' && event.action.trim() ? event.action.trim() : 'unknown';
    if (!groups[action]) {
      groups[action] = {
        count: 0,
        okCount: 0,
        failureCount: 0,
        pendingCount: 0,
        lastReason: undefined,
      };
    }
    const bucket = groups[action];
    bucket.count += 1;
    if (event.ok === true) bucket.okCount += 1;
    else bucket.failureCount += 1;
    if (event.pending === true) bucket.pendingCount += 1;
    if (typeof event.reason === 'string' && event.reason.trim()) bucket.lastReason = event.reason.trim();
  }
  return groups;
}

function sortSerializableValue(value) {
  if (Array.isArray(value)) return value.map(item => sortSerializableValue(item));
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const out = {};
    for (const key of keys) out[key] = sortSerializableValue(value[key]);
    return out;
  }
  return value;
}

function stableValueText(value) {
  if (typeof value === 'undefined') return 'undefined';
  try {
    return JSON.stringify(sortSerializableValue(value));
  } catch {
    return String(value);
  }
}

export function createRuntimeStatusTransitionSummary(entries) {
  const summary = {};
  const groups = groupNormalizedPerfEntries(entries);
  for (const [name, groupedEntries] of groups.entries()) {
    if (!Array.isArray(groupedEntries) || groupedEntries.length < 2) continue;
    const transitionCounts = {};
    for (let index = 1; index < groupedEntries.length; index += 1) {
      const previousStatus = groupedEntries[index - 1]?.status || 'ok';
      const nextStatus = groupedEntries[index]?.status || 'ok';
      const key = `${previousStatus}->${nextStatus}`;
      transitionCounts[key] = (transitionCounts[key] || 0) + 1;
    }
    const observedTransitions = Object.keys(transitionCounts).sort((left, right) =>
      left.localeCompare(right)
    );
    summary[name] = {
      count: groupedEntries.length,
      transitionCount: Math.max(0, groupedEntries.length - 1),
      firstStatus: groupedEntries[0]?.status || null,
      lastStatus: groupedEntries[groupedEntries.length - 1]?.status || null,
      transitionCounts: sortSerializableValue(transitionCounts),
      observedTransitions,
      destabilizationCount: (transitionCounts['ok->error'] || 0) + (transitionCounts['ok->mark'] || 0),
      recoveryToOkCount: (transitionCounts['error->ok'] || 0) + (transitionCounts['mark->ok'] || 0),
      errorRecoveryCount: transitionCounts['error->ok'] || 0,
      quietRecoveryCount: transitionCounts['mark->ok'] || 0,
    };
  }
  return summary;
}

function deriveRequiredRuntimeStatusTransitions(entries) {
  const summary = createRuntimeStatusTransitionSummary(entries);
  const required = {};
  for (const [name, item] of Object.entries(summary)) {
    const transitions =
      item?.transitionCounts && typeof item.transitionCounts === 'object' ? item.transitionCounts : {};
    const derived = {};
    for (const key of ['ok->error', 'error->ok', 'ok->mark', 'mark->ok']) {
      if ((Number(transitions[key]) || 0) > 0) derived[key] = 1;
    }
    if (Object.keys(derived).length) required[name] = derived;
  }
  return required;
}

function readRequiredRuntimeStatusTransitions(contracts = {}, baseline = null, entries = null) {
  if (baseline && typeof baseline === 'object' && baseline.requiredRuntimeStatusTransitions) {
    return baseline.requiredRuntimeStatusTransitions;
  }
  if (contracts && typeof contracts === 'object' && contracts.requiredRuntimeStatusTransitions) {
    return contracts.requiredRuntimeStatusTransitions;
  }
  return deriveRequiredRuntimeStatusTransitions(entries);
}

export function rankRuntimeStatusTransitions(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      count: Number(item?.count) || 0,
      transitionCount: Number(item?.transitionCount) || 0,
      observedTransitions: Array.isArray(item?.observedTransitions) ? item.observedTransitions.slice() : [],
      destabilizationCount: Number(item?.destabilizationCount) || 0,
      recoveryToOkCount: Number(item?.recoveryToOkCount) || 0,
      errorRecoveryCount: Number(item?.errorRecoveryCount) || 0,
      quietRecoveryCount: Number(item?.quietRecoveryCount) || 0,
      lastStatus: item?.lastStatus || null,
    }))
    .filter(item => item.transitionCount > 0 && (item.destabilizationCount > 0 || item.recoveryToOkCount > 0))
    .sort((left, right) => {
      if (right.destabilizationCount !== left.destabilizationCount) {
        return right.destabilizationCount - left.destabilizationCount;
      }
      if (right.recoveryToOkCount !== left.recoveryToOkCount) {
        return right.recoveryToOkCount - left.recoveryToOkCount;
      }
      if ((left.lastStatus === 'ok') !== (right.lastStatus === 'ok')) {
        return Number(right.lastStatus === 'ok') - Number(left.lastStatus === 'ok');
      }
      if (right.transitionCount !== left.transitionCount) return right.transitionCount - left.transitionCount;
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

const CLEAN_RECOVERY_OK_STREAK = 3;

function finalizeRecoveredEpisode(item, episode) {
  if (!item || !episode || episode.recovered !== true) return;
  const streak = Math.max(0, Number(episode.postRecoveryOkStreak) || 0);
  item.maxPostRecoveryOkStreak = Math.max(item.maxPostRecoveryOkStreak, streak);
  item.minPostRecoveryOkStreak =
    item.minPostRecoveryOkStreak > 0 ? Math.min(item.minPostRecoveryOkStreak, streak) : streak;
  if (streak >= 2) item.stableRecoveryCount += 1;
  if (streak >= CLEAN_RECOVERY_OK_STREAK) item.cleanRecoveryCount += 1;
}

export function createRuntimeRecoverySequenceSummary(entries) {
  const summary = {};
  const groups = groupNormalizedPerfEntries(entries);
  for (const [name, groupedEntries] of groups.entries()) {
    if (!Array.isArray(groupedEntries) || groupedEntries.length < 2) continue;
    const item = {
      count: groupedEntries.length,
      disruptionCount: 0,
      recoveredCount: 0,
      stableRecoveryCount: 0,
      cleanRecoveryCount: 0,
      relapseCount: 0,
      unresolvedCount: 0,
      maxRecoverySpanEntries: 0,
      maxPostRecoveryOkStreak: 0,
      minPostRecoveryOkStreak: 0,
      firstStatus: groupedEntries[0]?.status || null,
      lastStatus: groupedEntries[groupedEntries.length - 1]?.status || null,
      observedRecoveryPaths: [],
    };
    const observedRecoveryPaths = new Set();
    let openEpisode = null;
    let recoveredEpisode = null;
    for (let index = 0; index < groupedEntries.length; index += 1) {
      const status = groupedEntries[index]?.status || 'ok';
      if (status === 'ok') {
        if (openEpisode) {
          const recoveryPath = `${openEpisode.firstNonOkStatus}->ok`;
          observedRecoveryPaths.add(recoveryPath);
          item.recoveredCount += 1;
          item.maxRecoverySpanEntries = Math.max(item.maxRecoverySpanEntries, index - openEpisode.startIndex);
          recoveredEpisode = {
            ...openEpisode,
            recovered: true,
            postRecoveryOkStreak: 1,
          };
          openEpisode = null;
          continue;
        }
        if (recoveredEpisode) {
          recoveredEpisode.postRecoveryOkStreak += 1;
        }
        continue;
      }

      if (recoveredEpisode) {
        if ((Number(recoveredEpisode.postRecoveryOkStreak) || 0) < CLEAN_RECOVERY_OK_STREAK)
          item.relapseCount += 1;
        finalizeRecoveredEpisode(item, recoveredEpisode);
        recoveredEpisode = null;
      }
      if (!openEpisode) {
        item.disruptionCount += 1;
        openEpisode = {
          startIndex: index,
          firstNonOkStatus: status,
        };
      }
    }

    if (recoveredEpisode) finalizeRecoveredEpisode(item, recoveredEpisode);
    if (openEpisode) item.unresolvedCount += 1;
    item.observedRecoveryPaths = Array.from(observedRecoveryPaths).sort((left, right) =>
      left.localeCompare(right)
    );

    if (item.disruptionCount > 0 || item.recoveredCount > 0 || item.unresolvedCount > 0) {
      summary[name] = item;
    }
  }
  return summary;
}

export function createRuntimeRecoveryDebtSummary(entries) {
  const summary = {};
  const groups = groupNormalizedPerfEntries(entries);
  for (const [name, groupedEntries] of groups.entries()) {
    if (!Array.isArray(groupedEntries) || !groupedEntries.length) continue;
    const debtDurations = [];
    const debtSpans = [];
    let disruptionCount = 0;
    let recoveredCount = 0;
    let unresolvedCount = 0;
    let unresolvedDebtMs = 0;
    let openEpisode = null;

    for (let index = 0; index < groupedEntries.length; index += 1) {
      const entry = groupedEntries[index] || {};
      const status = entry.status || 'ok';
      const durationMs = Number.isFinite(entry.codeExecutionMs) ? Number(entry.codeExecutionMs) : 0;
      if (!openEpisode) {
        if (status !== 'ok') {
          disruptionCount += 1;
          openEpisode = {
            startIndex: index,
            totalMs: roundDuration(durationMs),
            spanEntries: 1,
          };
        }
        continue;
      }

      openEpisode.totalMs = roundDuration(openEpisode.totalMs + durationMs);
      openEpisode.spanEntries += 1;
      if (status === 'ok') {
        recoveredCount += 1;
        debtDurations.push(roundDuration(openEpisode.totalMs));
        debtSpans.push(Math.max(1, openEpisode.spanEntries));
        openEpisode = null;
      }
    }

    if (openEpisode) {
      unresolvedCount += 1;
      unresolvedDebtMs = roundDuration(openEpisode.totalMs);
      debtDurations.push(roundDuration(openEpisode.totalMs));
      debtSpans.push(Math.max(1, openEpisode.spanEntries));
    }

    if (disruptionCount < 1 && recoveredCount < 1 && unresolvedCount < 1) continue;
    const sortedDurations = debtDurations.slice().sort((left, right) => left - right);
    const totalDebtMs = roundDuration(sortedDurations.reduce((sum, value) => sum + value, 0));
    const debtCount = debtDurations.length;
    const maxDebtMs = debtCount > 0 ? roundDuration(sortedDurations[sortedDurations.length - 1]) : 0;
    const minDebtMs = debtCount > 0 ? roundDuration(sortedDurations[0]) : 0;
    const totalDebtEntries = debtSpans.reduce((sum, value) => sum + value, 0);
    const maxDebtEntries = debtSpans.length ? Math.max(...debtSpans) : 0;
    summary[name] = {
      count: groupedEntries.length,
      disruptionCount,
      recoveredCount,
      unresolvedCount,
      debtCount,
      totalDebtMs,
      averageDebtMs: debtCount > 0 ? roundDuration(totalDebtMs / debtCount) : 0,
      p95DebtMs: debtCount > 0 ? roundDuration(percentile(sortedDurations, 0.95)) : 0,
      minDebtMs,
      maxDebtMs,
      totalDebtEntries,
      averageDebtEntries: debtCount > 0 ? roundDuration(totalDebtEntries / debtCount) : 0,
      maxDebtEntries,
      unresolvedDebtMs,
    };
  }
  return summary;
}

export function rankRuntimeRecoveryDebt(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      disruptionCount: Number(item?.disruptionCount) || 0,
      recoveredCount: Number(item?.recoveredCount) || 0,
      unresolvedCount: Number(item?.unresolvedCount) || 0,
      debtCount: Number(item?.debtCount) || 0,
      totalDebtMs: Number(item?.totalDebtMs) || 0,
      p95DebtMs: Number(item?.p95DebtMs) || 0,
      maxDebtMs: Number(item?.maxDebtMs) || 0,
      maxDebtEntries: Number(item?.maxDebtEntries) || 0,
    }))
    .filter(item => item.debtCount > 0 || item.unresolvedCount > 0)
    .sort((left, right) => {
      if (right.unresolvedCount !== left.unresolvedCount) return right.unresolvedCount - left.unresolvedCount;
      if (right.maxDebtMs !== left.maxDebtMs) return right.maxDebtMs - left.maxDebtMs;
      if (right.p95DebtMs !== left.p95DebtMs) return right.p95DebtMs - left.p95DebtMs;
      if (right.totalDebtMs !== left.totalDebtMs) return right.totalDebtMs - left.totalDebtMs;
      if (right.maxDebtEntries !== left.maxDebtEntries) return right.maxDebtEntries - left.maxDebtEntries;
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createRuntimeRecoveryDebtBudgetMs(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    const maxDebtMs = Number.isFinite(item?.maxDebtMs) ? Number(item.maxDebtMs) : 0;
    budget[name] = Math.max(Math.ceil(maxDebtMs * 1.45 + 25), 40);
  }
  return budget;
}

function roundRatio(value) {
  return Number.isFinite(value) ? Math.max(0, Number(Number(value).toFixed(2))) : 0;
}

export function createRuntimeRecoveryHangoverSummary(entries) {
  const summary = {};
  const groups = groupNormalizedPerfEntries(entries);
  for (const [name, groupedEntries] of groups.entries()) {
    if (!Array.isArray(groupedEntries) || groupedEntries.length < 2) continue;
    const steadyOkDurations = [];
    const immediateRecoveryDurations = [];
    const settlingRecoveryDurations = [];
    let disruptionCount = 0;
    let recoveredCount = 0;
    let lingeringSettlingCount = 0;
    let openEpisode = false;
    let okSinceRecovery = 0;

    for (const entry of groupedEntries) {
      const status = entry?.status || 'ok';
      const durationMs = Number.isFinite(entry?.codeExecutionMs) ? Number(entry.codeExecutionMs) : 0;
      if (status !== 'ok') {
        disruptionCount += openEpisode ? 0 : 1;
        openEpisode = true;
        okSinceRecovery = 0;
        continue;
      }

      if (openEpisode) {
        recoveredCount += 1;
        immediateRecoveryDurations.push(roundDuration(durationMs));
        openEpisode = false;
        okSinceRecovery = 1;
        continue;
      }

      if (okSinceRecovery === 1) {
        settlingRecoveryDurations.push(roundDuration(durationMs));
        okSinceRecovery = 2;
        continue;
      }

      steadyOkDurations.push(roundDuration(durationMs));
      if (okSinceRecovery > 1) okSinceRecovery += 1;
    }

    const baselineDurations = steadyOkDurations.length
      ? steadyOkDurations.slice()
      : settlingRecoveryDurations.length
        ? settlingRecoveryDurations.slice()
        : immediateRecoveryDurations.slice();
    if (
      !baselineDurations.length &&
      !immediateRecoveryDurations.length &&
      !settlingRecoveryDurations.length
    ) {
      continue;
    }
    const sortedBaseline = baselineDurations.slice().sort((left, right) => left - right);
    const baselineMedianMs = sortedBaseline.length ? roundDuration(percentile(sortedBaseline, 0.5)) : 0;
    const recoveryWindowDurations = immediateRecoveryDurations.concat(settlingRecoveryDurations);
    const sortedRecoveryWindow = recoveryWindowDurations.slice().sort((left, right) => left - right);
    const sortedImmediate = immediateRecoveryDurations.slice().sort((left, right) => left - right);
    const sortedSettling = settlingRecoveryDurations.slice().sort((left, right) => left - right);
    const p95ImmediateRecoveryOkMs = sortedImmediate.length
      ? roundDuration(percentile(sortedImmediate, 0.95))
      : 0;
    const maxImmediateRecoveryOkMs = sortedImmediate.length
      ? roundDuration(sortedImmediate[sortedImmediate.length - 1])
      : 0;
    const p95SettlingOkMs = sortedSettling.length ? roundDuration(percentile(sortedSettling, 0.95)) : 0;
    const maxSettlingOkMs = sortedSettling.length
      ? roundDuration(sortedSettling[sortedSettling.length - 1])
      : 0;
    const p95RecoveryWindowMs = sortedRecoveryWindow.length
      ? roundDuration(percentile(sortedRecoveryWindow, 0.95))
      : 0;
    const maxRecoveryWindowMs = sortedRecoveryWindow.length
      ? roundDuration(sortedRecoveryWindow[sortedRecoveryWindow.length - 1])
      : 0;
    const denominator = baselineMedianMs > 0 ? baselineMedianMs : 1;
    const p95HangoverRatio = roundRatio(p95RecoveryWindowMs / denominator);
    const maxHangoverRatio = roundRatio(maxRecoveryWindowMs / denominator);
    const p95HangoverDeltaMs = roundDuration(Math.max(0, p95RecoveryWindowMs - baselineMedianMs));
    const maxHangoverDeltaMs = roundDuration(Math.max(0, maxRecoveryWindowMs - baselineMedianMs));

    if (baselineMedianMs > 0 && sortedSettling.length) {
      const threshold = baselineMedianMs * 1.25;
      lingeringSettlingCount = sortedSettling.filter(value => value > threshold).length;
    }

    if (disruptionCount < 1 && recoveredCount < 1) continue;
    summary[name] = {
      count: groupedEntries.length,
      disruptionCount,
      recoveredCount,
      steadyOkCount: steadyOkDurations.length,
      immediateRecoveryOkCount: immediateRecoveryDurations.length,
      settlingOkCount: settlingRecoveryDurations.length,
      baselineMedianMs,
      p95ImmediateRecoveryOkMs,
      maxImmediateRecoveryOkMs,
      p95SettlingOkMs,
      maxSettlingOkMs,
      p95RecoveryWindowMs,
      maxRecoveryWindowMs,
      p95HangoverRatio,
      maxHangoverRatio,
      p95HangoverDeltaMs,
      maxHangoverDeltaMs,
      lingeringSettlingCount,
    };
  }
  return summary;
}

export function rankRuntimeRecoveryHangover(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      disruptionCount: Number(item?.disruptionCount) || 0,
      recoveredCount: Number(item?.recoveredCount) || 0,
      p95HangoverRatio: Number(item?.p95HangoverRatio) || 0,
      maxHangoverRatio: Number(item?.maxHangoverRatio) || 0,
      p95HangoverDeltaMs: Number(item?.p95HangoverDeltaMs) || 0,
      maxHangoverDeltaMs: Number(item?.maxHangoverDeltaMs) || 0,
      lingeringSettlingCount: Number(item?.lingeringSettlingCount) || 0,
    }))
    .filter(item => item.recoveredCount > 0)
    .sort((left, right) => {
      if (right.lingeringSettlingCount !== left.lingeringSettlingCount) {
        return right.lingeringSettlingCount - left.lingeringSettlingCount;
      }
      if (right.maxHangoverRatio !== left.maxHangoverRatio) {
        return right.maxHangoverRatio - left.maxHangoverRatio;
      }
      if (right.p95HangoverRatio !== left.p95HangoverRatio) {
        return right.p95HangoverRatio - left.p95HangoverRatio;
      }
      if (right.maxHangoverDeltaMs !== left.maxHangoverDeltaMs) {
        return right.maxHangoverDeltaMs - left.maxHangoverDeltaMs;
      }
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createRuntimeRecoveryHangoverBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    const p95HangoverRatio = Number.isFinite(item?.p95HangoverRatio) ? Number(item.p95HangoverRatio) : 0;
    const maxHangoverRatio = Number.isFinite(item?.maxHangoverRatio) ? Number(item.maxHangoverRatio) : 0;
    const p95HangoverDeltaMs = Number.isFinite(item?.p95HangoverDeltaMs)
      ? Number(item.p95HangoverDeltaMs)
      : 0;
    const maxHangoverDeltaMs = Number.isFinite(item?.maxHangoverDeltaMs)
      ? Number(item.maxHangoverDeltaMs)
      : 0;
    const lingeringSettlingCount = Number.isFinite(item?.lingeringSettlingCount)
      ? Number(item.lingeringSettlingCount)
      : 0;
    budget[name] = {
      maxP95HangoverRatio: Math.max(roundRatio(p95HangoverRatio * 1.35 + 0.15), 1.15),
      maxMaxHangoverRatio: Math.max(roundRatio(maxHangoverRatio * 1.25 + 0.2), 1.2),
      maxP95HangoverDeltaMs: Math.max(Math.ceil(p95HangoverDeltaMs * 1.35 + 15), 15),
      maxMaxHangoverDeltaMs: Math.max(Math.ceil(maxHangoverDeltaMs * 1.25 + 20), 20),
      maxLingeringSettlingCount: Math.max(lingeringSettlingCount + 1, 1),
    };
  }
  return budget;
}

function deriveRequiredRuntimeRecoverySequences(entries) {
  const summary = createRuntimeRecoverySequenceSummary(entries);
  const required = {};
  for (const [name, item] of Object.entries(summary)) {
    if ((item.disruptionCount || 0) < 1 || (item.recoveredCount || 0) < 1) continue;
    const requirement = {
      recoveredCount: 1,
      unresolvedCount: 0,
      maxRecoverySpanEntries: Math.max(1, Number(item.maxRecoverySpanEntries) || 1),
    };
    if ((item.maxPostRecoveryOkStreak || 0) >= 2) {
      requirement.stableRecoveryCount = 1;
      requirement.minPostRecoveryOkStreak = 2;
    }
    if ((item.maxPostRecoveryOkStreak || 0) >= CLEAN_RECOVERY_OK_STREAK) {
      requirement.cleanRecoveryCount = 1;
      requirement.minPostRecoveryOkStreak = CLEAN_RECOVERY_OK_STREAK;
      requirement.maxRelapseCount = 0;
    }
    if (Array.isArray(item.observedRecoveryPaths) && item.observedRecoveryPaths.length) {
      requirement.requiredRecoveryPaths = item.observedRecoveryPaths.slice();
    }
    required[name] = requirement;
  }
  return required;
}

function readRequiredRuntimeRecoverySequences(contracts = {}, baseline = null, entries = null) {
  if (baseline && typeof baseline === 'object' && baseline.requiredRuntimeRecoverySequences) {
    return baseline.requiredRuntimeRecoverySequences;
  }
  if (contracts && typeof contracts === 'object' && contracts.requiredRuntimeRecoverySequences) {
    return contracts.requiredRuntimeRecoverySequences;
  }
  return deriveRequiredRuntimeRecoverySequences(entries);
}

export function rankRuntimeRecoverySequences(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      count: Number(item?.count) || 0,
      disruptionCount: Number(item?.disruptionCount) || 0,
      recoveredCount: Number(item?.recoveredCount) || 0,
      stableRecoveryCount: Number(item?.stableRecoveryCount) || 0,
      cleanRecoveryCount: Number(item?.cleanRecoveryCount) || 0,
      relapseCount: Number(item?.relapseCount) || 0,
      unresolvedCount: Number(item?.unresolvedCount) || 0,
      maxRecoverySpanEntries: Number(item?.maxRecoverySpanEntries) || 0,
      maxPostRecoveryOkStreak: Number(item?.maxPostRecoveryOkStreak) || 0,
      lastStatus: item?.lastStatus || null,
    }))
    .filter(item => item.disruptionCount > 0 || item.recoveredCount > 0 || item.unresolvedCount > 0)
    .sort((left, right) => {
      if (right.unresolvedCount !== left.unresolvedCount) return right.unresolvedCount - left.unresolvedCount;
      if (right.disruptionCount !== left.disruptionCount) return right.disruptionCount - left.disruptionCount;
      if (left.recoveredCount !== right.recoveredCount) return left.recoveredCount - right.recoveredCount;
      if (right.relapseCount !== left.relapseCount) {
        return right.relapseCount - left.relapseCount;
      }
      if (left.cleanRecoveryCount !== right.cleanRecoveryCount) {
        return left.cleanRecoveryCount - right.cleanRecoveryCount;
      }
      if (left.stableRecoveryCount !== right.stableRecoveryCount) {
        return left.stableRecoveryCount - right.stableRecoveryCount;
      }
      if (right.maxRecoverySpanEntries !== left.maxRecoverySpanEntries) {
        return right.maxRecoverySpanEntries - left.maxRecoverySpanEntries;
      }
      if (left.maxPostRecoveryOkStreak !== right.maxPostRecoveryOkStreak) {
        return left.maxPostRecoveryOkStreak - right.maxPostRecoveryOkStreak;
      }
      if ((left.lastStatus === 'ok') !== (right.lastStatus === 'ok')) {
        return Number(left.lastStatus === 'ok') - Number(right.lastStatus === 'ok');
      }
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createRuntimeOutcomeCoverageSummary(runtimeSummary) {
  const perfSummary = runtimeSummary && typeof runtimeSummary === 'object' ? runtimeSummary : {};
  const summary = {};
  for (const [name, item] of Object.entries(perfSummary)) {
    const okCount = Number(item?.okCount) || 0;
    const errorCount = Number(item?.errorCount) || 0;
    const markCount = Number(item?.markCount) || 0;
    const observedStatuses = [];
    if (okCount > 0) observedStatuses.push('ok');
    if (errorCount > 0) observedStatuses.push('error');
    if (markCount > 0) observedStatuses.push('mark');
    summary[name] = {
      count: Number(item?.count) || okCount + errorCount + markCount,
      okCount,
      errorCount,
      markCount,
      nonOkCount: errorCount + markCount,
      observedStatuses,
      hasMixedOutcomes: observedStatuses.length > 1,
    };
  }
  return summary;
}

function deriveRequiredRuntimeOutcomeCoverage(runtimeSummary) {
  const summary = createRuntimeOutcomeCoverageSummary(runtimeSummary);
  const coverage = {};
  for (const [name, item] of Object.entries(summary)) {
    if ((item.errorCount || 0) < 1 && (item.markCount || 0) < 1) continue;
    const required = {};
    if ((item.okCount || 0) > 0) required.ok = 1;
    if ((item.errorCount || 0) > 0) required.error = 1;
    if ((item.markCount || 0) > 0) required.mark = 1;
    if (Object.keys(required).length) coverage[name] = required;
  }
  return coverage;
}

function readRequiredRuntimeOutcomeCoverage(contracts = {}, baseline = null, runtimeSummary = null) {
  if (baseline && typeof baseline === 'object' && baseline.requiredRuntimeOutcomeCoverage) {
    return baseline.requiredRuntimeOutcomeCoverage;
  }
  if (contracts && typeof contracts === 'object' && contracts.requiredRuntimeOutcomeCoverage) {
    return contracts.requiredRuntimeOutcomeCoverage;
  }
  return deriveRequiredRuntimeOutcomeCoverage(runtimeSummary);
}

export function rankRuntimeOutcomeCoverage(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      count: Number(item?.count) || 0,
      okCount: Number(item?.okCount) || 0,
      errorCount: Number(item?.errorCount) || 0,
      markCount: Number(item?.markCount) || 0,
      nonOkCount: Number(item?.nonOkCount) || 0,
      observedStatuses: Array.isArray(item?.observedStatuses) ? item.observedStatuses.slice() : [],
      hasMixedOutcomes: item?.hasMixedOutcomes === true,
    }))
    .filter(item => item.count > 0 && (item.nonOkCount > 0 || item.hasMixedOutcomes))
    .sort((left, right) => {
      if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
      if (right.markCount !== left.markCount) return right.markCount - left.markCount;
      if (Number(right.hasMixedOutcomes) !== Number(left.hasMixedOutcomes)) {
        return Number(right.hasMixedOutcomes) - Number(left.hasMixedOutcomes);
      }
      if (right.nonOkCount !== left.nonOkCount) return right.nonOkCount - left.nonOkCount;
      if (right.count !== left.count) return right.count - left.count;
      return left.name.localeCompare(right.name);
    });
  return rows.slice(0, Math.max(1, limit));
}

export function createStateIntegritySummary(checks) {
  const summary = {};
  for (const rawCheck of Array.isArray(checks) ? checks : []) {
    if (!rawCheck || typeof rawCheck !== 'object') continue;
    const name = typeof rawCheck.name === 'string' && rawCheck.name.trim() ? rawCheck.name.trim() : null;
    if (!name) continue;
    summary[name] = {
      ok: rawCheck.ok !== false,
      expectedText: stableValueText(rawCheck.expected),
      actualText: stableValueText(rawCheck.actual),
      ...(typeof rawCheck.detail === 'undefined' ? {} : { detailText: stableValueText(rawCheck.detail) }),
      ...(typeof rawCheck.message === 'string' && rawCheck.message.trim()
        ? { messageText: rawCheck.message.trim() }
        : {}),
    };
  }
  return summary;
}

export function rankBrowserPerfHotspots(summary, limit = 5) {
  const rows = Object.entries(summary || {})
    .map(([name, item]) => ({
      name,
      count: Number(item?.count) || 0,
      actionableCount: Number(item?.actionableCount) || 0,
      errorCount: Number(item?.errorCount) || 0,
      codeExecutionTotalMs: Number(item?.codeExecutionTotalMs) || 0,
      codeExecutionP95Ms: Number(item?.codeExecutionP95Ms) || 0,
      codeExecutionMaxMs: Number(item?.codeExecutionMaxMs) || 0,
      uxTotalMs: Number(item?.uxTotalMs) || 0,
      interactionWaitTotalMs: Number(item?.interactionWaitTotalMs) || 0,
    }))
    .filter(item => item.actionableCount > 0)
    .sort((left, right) => {
      if (right.errorCount !== left.errorCount) return right.errorCount - left.errorCount;
      if (right.codeExecutionTotalMs !== left.codeExecutionTotalMs) {
        return right.codeExecutionTotalMs - left.codeExecutionTotalMs;
      }
      if (right.codeExecutionP95Ms !== left.codeExecutionP95Ms) {
        return right.codeExecutionP95Ms - left.codeExecutionP95Ms;
      }
      if (right.codeExecutionMaxMs !== left.codeExecutionMaxMs) {
        return right.codeExecutionMaxMs - left.codeExecutionMaxMs;
      }
      if (right.count !== left.count) return right.count - left.count;
      return left.name.localeCompare(right.name);
    });

  return rows.slice(0, Math.max(1, limit));
}

const SAVED_COLOR_PHASES = [
  { op: 'add', total: 'design.savedColor.add', dialog: 'design.savedColor.add.prompt' },
  { op: 'delete', total: 'design.savedColor.delete', dialog: 'design.savedColor.delete.confirm' },
];

function readPerfField(summary, name, field) {
  const item = summary && summary[name];
  return Number.isFinite(Number(item?.[field])) ? Number(item[field]) : 0;
}

function readPerfUxAverage(summary, name) {
  return readPerfField(summary, name, 'uxAverageMs');
}

function readPerfUxP95(summary, name) {
  return readPerfField(summary, name, 'uxP95Ms');
}

function readPerfCodeAverage(summary, name) {
  return readPerfField(summary, name, 'codeExecutionAverageMs');
}

function readPerfCodeP95(summary, name) {
  return readPerfField(summary, name, 'codeExecutionP95Ms');
}

function readPerfInteractionAverage(summary, name) {
  return readPerfField(summary, name, 'interactionWaitAverageMs');
}

function readPerfInteractionP95(summary, name) {
  return readPerfField(summary, name, 'interactionWaitP95Ms');
}

function readPerfCount(summary, name) {
  return readPerfField(summary, name, 'count');
}

function readSavedColorPhaseBottleneck(dialogAvgMs, codeAvgMs, storageAvgMs, patchAvgMs) {
  if (dialogAvgMs >= Math.max(100, codeAvgMs * 3)) return 'feedback-wait';
  if (storageAvgMs >= Math.max(25, patchAvgMs * 2, codeAvgMs * 0.5)) return 'storage';
  if (patchAvgMs >= Math.max(25, storageAvgMs * 2, codeAvgMs * 0.5)) return 'patch';
  if (codeAvgMs > 0) return 'app-pipeline';
  return 'none';
}

export function createSavedColorPhaseBreakdown(summary) {
  return SAVED_COLOR_PHASES.map(phase => {
    const uxTotalAvgMs = readPerfUxAverage(summary, phase.total);
    const interactionWaitAvgMs = readPerfInteractionAverage(summary, phase.dialog);
    const prepareAvgMs = readPerfCodeAverage(summary, `${phase.total}.prepare`);
    const orderAvgMs = readPerfCodeAverage(summary, `${phase.total}.order`);
    const mutationAvgMs = readPerfCodeAverage(summary, `${phase.total}.mutation`);
    const patchAvgMs = readPerfCodeAverage(summary, `${phase.total}.patch`);
    const storageAvgMs = readPerfCodeAverage(summary, `${phase.total}.storage`);
    const codeExecutionAvgMs = readPerfCodeAverage(summary, phase.total);
    return {
      op: phase.op,
      count: readPerfCount(summary, phase.total),
      uxTotalAvgMs,
      uxTotalP95Ms: readPerfUxP95(summary, phase.total),
      interactionWaitAvgMs,
      interactionWaitP95Ms: readPerfInteractionP95(summary, phase.dialog),
      codeExecutionAvgMs,
      codeExecutionP95Ms: readPerfCodeP95(summary, phase.total),
      prepareAvgMs,
      orderAvgMs,
      mutationAvgMs,
      patchAvgMs,
      storageAvgMs,
      bottleneck: readSavedColorPhaseBottleneck(
        interactionWaitAvgMs,
        codeExecutionAvgMs,
        storageAvgMs,
        patchAvgMs
      ),
    };
  }).filter(item => item.count > 0);
}

function readSettingsBackupImportBottleneck({
  confirmAvgMs,
  readFileAvgMs,
  parseAvgMs,
  modelsMergeAvgMs,
  colorsAvgMs,
  modelsFinalizeAvgMs,
  storageWriteAvgMs,
  codeAvgMs,
}) {
  if (confirmAvgMs >= Math.max(100, codeAvgMs * 2)) return 'confirm-wait';
  if (storageWriteAvgMs >= Math.max(25, codeAvgMs * 0.5)) return 'storage';
  if (modelsMergeAvgMs >= Math.max(25, codeAvgMs * 0.5)) return 'models-merge';
  if (colorsAvgMs >= Math.max(25, codeAvgMs * 0.5)) return 'colors-merge';
  if (modelsFinalizeAvgMs >= Math.max(25, codeAvgMs * 0.5)) return 'models-refresh';
  if (readFileAvgMs >= Math.max(25, codeAvgMs * 0.5)) return 'file-read';
  if (parseAvgMs >= Math.max(10, codeAvgMs * 0.5)) return 'parse';
  if (codeAvgMs > 0) return 'app-pipeline';
  return 'none';
}

export function createSettingsBackupImportPhaseBreakdown(summary) {
  const total = 'settingsBackup.import';
  const count = readPerfCount(summary, total);
  if (count <= 0) return [];

  const phaseMetricCount = [
    'settingsBackup.import.confirm',
    'settingsBackup.import.readFile',
    'settingsBackup.import.parse',
    'settingsBackup.import.models.merge',
    'settingsBackup.import.colors',
    'settingsBackup.import.models.finalize',
    'settingsBackup.import.storage.write',
  ].reduce((sum, name) => sum + readPerfCount(summary, name), 0);
  if (phaseMetricCount <= 0) return [];

  const uxTotalAvgMs = readPerfUxAverage(summary, total);
  const confirmAvgMs = readPerfInteractionAverage(summary, 'settingsBackup.import.confirm');
  const readFileAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.readFile');
  const parseAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.parse');
  const modelsMergeAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.models.merge');
  const colorsAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.colors');
  const modelsFinalizeAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.models.finalize');
  const storageWriteAvgMs = readPerfCodeAverage(summary, 'settingsBackup.import.storage.write');
  const codeExecutionAvgMs = readPerfCodeAverage(summary, total);
  const row = {
    op: 'import',
    count,
    uxTotalAvgMs,
    uxTotalP95Ms: readPerfUxP95(summary, total),
    confirmAvgMs,
    confirmP95Ms: readPerfInteractionP95(summary, 'settingsBackup.import.confirm'),
    codeExecutionAvgMs,
    codeExecutionP95Ms: readPerfCodeP95(summary, total),
    readFileAvgMs,
    parseAvgMs,
    modelsMergeAvgMs,
    colorsAvgMs,
    modelsFinalizeAvgMs,
    storageWriteAvgMs,
    storageWriteCount: readPerfCount(summary, 'settingsBackup.import.storage.write'),
  };
  return [
    {
      ...row,
      bottleneck: readSettingsBackupImportBottleneck({ ...row, codeAvgMs: codeExecutionAvgMs }),
    },
  ];
}

export function summarizeBrowserPerfResult(result, contracts = {}) {
  const requiredMetrics = Array.isArray(contracts.requiredRuntimeMetrics)
    ? contracts.requiredRuntimeMetrics
    : requiredRuntimeMetrics;
  const perfSummary =
    result.windowPerfSummary && Object.keys(result.windowPerfSummary).length
      ? result.windowPerfSummary
      : createPerfSummaryFromEntries(result.windowPerfEntries);
  const minimumCounts = readRequiredMetricMinimumCounts(contracts);
  const pressureSummary =
    result.windowPerfPressureSummary && Object.keys(result.windowPerfPressureSummary).length
      ? result.windowPerfPressureSummary
      : createRepeatedMetricPressureSummary(result.windowPerfEntries, minimumCounts);
  const domainSummary =
    result.windowPerfDomainSummary && Object.keys(result.windowPerfDomainSummary).length
      ? result.windowPerfDomainSummary
      : createPerfDomainSummary(perfSummary, pressureSummary, requiredMetrics, minimumCounts);
  const keyNames = Object.keys(perfSummary).sort();
  const presentRequiredMetrics = requiredMetrics.filter(
    name => perfSummary[name] && perfSummary[name].count > 0
  );
  const issueSummary = createRuntimeIssueSummary(result.runtimeIssues);
  const projectActionSummary = createProjectActionSummary(result.projectActionEvents);
  const outcomeSummary =
    result.windowPerfOutcomeSummary && Object.keys(result.windowPerfOutcomeSummary).length
      ? result.windowPerfOutcomeSummary
      : createRuntimeOutcomeCoverageSummary(perfSummary);
  const requiredOutcomeCoverage = readRequiredRuntimeOutcomeCoverage(contracts, null, perfSummary);
  const transitionSummary =
    result.windowPerfTransitionSummary && Object.keys(result.windowPerfTransitionSummary).length
      ? result.windowPerfTransitionSummary
      : createRuntimeStatusTransitionSummary(result.windowPerfEntries);
  const requiredStatusTransitions = readRequiredRuntimeStatusTransitions(
    contracts,
    null,
    result.windowPerfEntries
  );
  const recoverySequenceSummary =
    result.windowPerfRecoverySequenceSummary && Object.keys(result.windowPerfRecoverySequenceSummary).length
      ? result.windowPerfRecoverySequenceSummary
      : createRuntimeRecoverySequenceSummary(result.windowPerfEntries);
  const recoveryDebtSummary =
    result.windowPerfRecoveryDebtSummary && Object.keys(result.windowPerfRecoveryDebtSummary).length
      ? result.windowPerfRecoveryDebtSummary
      : createRuntimeRecoveryDebtSummary(result.windowPerfEntries);
  const recoveryHangoverSummary =
    result.windowPerfRecoveryHangoverSummary && Object.keys(result.windowPerfRecoveryHangoverSummary).length
      ? result.windowPerfRecoveryHangoverSummary
      : createRuntimeRecoveryHangoverSummary(result.windowPerfEntries);
  const requiredRecoverySequences = readRequiredRuntimeRecoverySequences(
    contracts,
    null,
    result.windowPerfEntries
  );
  const stateIntegritySummary =
    result.stateIntegritySummary && Object.keys(result.stateIntegritySummary).length
      ? result.stateIntegritySummary
      : createStateIntegritySummary(result.stateIntegrityChecks);
  const storeDebugSummary =
    result.windowStoreDebugSummary && Object.keys(result.windowStoreDebugSummary).length
      ? result.windowStoreDebugSummary
      : createStoreDebugSummary(result.windowStoreDebugStats);
  const storeTopSources = Array.isArray(result.windowStoreDebugTopSources)
    ? result.windowStoreDebugTopSources
    : rankStoreDebugSources(result.windowStoreDebugStats);
  const storeFlowSummary =
    result.windowStoreFlowPressureSummary && Object.keys(result.windowStoreFlowPressureSummary).length
      ? result.windowStoreFlowPressureSummary
      : createStoreFlowPressureSummary(result.windowStoreDebugFlowSteps);
  const buildDebugSummary =
    result.windowBuildDebugSummary && Object.keys(result.windowBuildDebugSummary).length
      ? result.windowBuildDebugSummary
      : createBuildSummary(result.windowBuildDebugStats);
  const buildTopReasons = Array.isArray(result.windowBuildDebugTopReasons)
    ? result.windowBuildDebugTopReasons
    : rankBuildReasons(result.windowBuildDebugStats);
  const buildSlowReasons = rankBuildSlowReasons(result.windowBuildDebugStats);
  const buildFlowSummary =
    result.windowBuildFlowPressureSummary && Object.keys(result.windowBuildFlowPressureSummary).length
      ? result.windowBuildFlowPressureSummary
      : createBuildFlowPressureSummary(result.windowBuildDebugFlowSteps);
  const journeyBuildPressureSummary =
    result.journeyBuildPressureSummary && Object.keys(result.journeyBuildPressureSummary).length
      ? result.journeyBuildPressureSummary
      : createJourneyBuildPressureSummary(result.windowBuildDebugFlowSteps);
  const userJourneySummary =
    result.userJourneySummary && Object.keys(result.userJourneySummary).length
      ? result.userJourneySummary
      : createUserJourneySummary(result.userFlowSteps, storeFlowSummary, result.userFlow);
  const journeyStoreSourceSummary =
    result.journeyStoreSourceSummary && Object.keys(result.journeyStoreSourceSummary).length
      ? result.journeyStoreSourceSummary
      : createJourneyStoreSourceSummary(result.windowStoreDebugFlowSteps);
  const userJourneyDiagnosisSummary =
    result.userJourneyDiagnosisSummary && Object.keys(result.userJourneyDiagnosisSummary).length
      ? result.userJourneyDiagnosisSummary
      : createUserJourneyDiagnosisSummary(userJourneySummary, storeFlowSummary, journeyStoreSourceSummary);
  const hotspots = rankBrowserPerfHotspots(perfSummary);
  const pressureRows = rankRepeatedMetricPressure(pressureSummary);
  const domainRows = rankPerfDomains(domainSummary);
  const outcomeRows = rankRuntimeOutcomeCoverage(outcomeSummary);
  const transitionRows = rankRuntimeStatusTransitions(transitionSummary);
  const recoveryRows = rankRuntimeRecoverySequences(recoverySequenceSummary);
  const recoveryDebtRows = rankRuntimeRecoveryDebt(recoveryDebtSummary);
  const recoveryHangoverRows = rankRuntimeRecoveryHangover(recoveryHangoverSummary);
  const storeFlowRows = rankStoreFlowPressure(storeFlowSummary);
  const buildFlowRows = rankBuildFlowPressure(buildFlowSummary);
  const journeyBuildRows = rankJourneyBuildPressure(journeyBuildPressureSummary);
  const userJourneyRows = rankUserJourneys(userJourneySummary);
  const userJourneyDiagnosisRows = rankUserJourneyDiagnosis(userJourneyDiagnosisSummary);
  const requiredJourneyNames = readRequiredUserJourneyNames(contracts, null, userJourneySummary);
  const requiredJourneyMinimumCounts = readRequiredUserJourneyMinimumStepCounts(contracts, null);
  const actionNames = Object.keys(projectActionSummary).sort();
  const stateIntegrityNames = Object.keys(stateIntegritySummary).sort();
  const measurementProfile = normalizeBrowserPerfMeasurementProfile(result.measurementProfile);
  const reportTitle =
    measurementProfile?.id === 'release'
      ? '# Release browser perf + E2E baseline'
      : '# Dev browser perf + E2E regression baseline';
  const lines = [
    reportTitle,
    '',
    `Generated: ${result.generatedAt}`,
    `Measurement profile: ${measurementProfile?.id || 'unknown'} (${measurementProfile?.label || 'unclassified'})`,
    `Pipeline: ${measurementProfile?.buildPipeline || 'unknown'} -> ${measurementProfile?.serverKind || 'unknown'} -> Chromium`,
    `Page: ${measurementProfile?.pagePath || 'unknown'}; observability mode: ${measurementProfile?.observabilityMode || 'unknown'}`,
    '',
    '## User flow timings',
    '',
  ];
  for (const [name, durationMs] of Object.entries(result.userFlow || {})) {
    lines.push(`- ${name}: ${formatMs(durationMs)}`);
  }
  lines.push('', '## Runtime health', '');
  lines.push(`Page errors: ${issueSummary.pageErrors.length}`);
  lines.push(`Console errors: ${issueSummary.consoleErrors.length}`);
  lines.push(`Diagnostics reports: ${issueSummary.diagnosticsCount || 0}`);
  if (Number.isFinite(result.clipboardWrites)) {
    lines.push(`Clipboard writes: ${Math.max(0, Math.round(result.clipboardWrites))}`);
  }
  if (issueSummary.pageErrors.length) {
    lines.push('', '### Page errors', '');
    for (const item of issueSummary.pageErrors) lines.push(`- ${item}`);
  }
  if (issueSummary.consoleErrors.length) {
    lines.push('', '### Console errors', '');
    for (const item of issueSummary.consoleErrors) lines.push(`- ${item}`);
  }
  if (issueSummary.diagnostics.length) {
    lines.push('', '### Diagnostics reports', '');
    for (const item of issueSummary.diagnostics.slice(-20)) {
      lines.push(
        `- ${item.label}: ${item.message || 'reported'}${item.fatal ? ' [fatal]' : ''}${item.ts ? ` (${item.ts})` : ''}`
      );
    }
  }
  lines.push('', '## Project action events', '');
  if (!actionNames.length) {
    lines.push('- none recorded');
  } else {
    for (const name of actionNames) {
      const item = projectActionSummary[name];
      lines.push(
        `- ${name}: count=${item.count}, ok=${item.okCount}, failure=${item.failureCount}, pending=${item.pendingCount}${item.lastReason ? `, lastReason=${item.lastReason}` : ''}`
      );
    }
  }
  lines.push('', '## Runtime outcome coverage', '');
  if (!outcomeRows.length) {
    lines.push('- no mixed-outcome metrics recorded');
  } else {
    for (const item of outcomeRows) {
      lines.push(
        `- ${item.name}: statuses=${item.observedStatuses.join('/') || 'none'}, ok=${item.okCount}, error=${item.errorCount}, mark=${item.markCount}, mixed=${item.hasMixedOutcomes ? 'yes' : 'no'}`
      );
    }
  }
  if (Object.keys(requiredOutcomeCoverage).length) {
    lines.push('', '### Required mixed-outcome coverage', '');
    for (const name of Object.keys(requiredOutcomeCoverage).sort()) {
      const item = requiredOutcomeCoverage[name] || {};
      const requirements = ['ok', 'error', 'mark']
        .filter(status => Number(item?.[status]) > 0)
        .map(status => `${status}>=${Number(item[status])}`)
        .join(', ');
      lines.push(`- ${name}: ${requirements}`);
    }
  }
  lines.push('', '## Runtime recovery transitions', '');
  if (!transitionRows.length) {
    lines.push('- no recovery transitions recorded');
  } else {
    for (const item of transitionRows) {
      const detail = transitionSummary[item.name];
      lines.push(
        `- ${item.name}: transitions=${(detail.observedTransitions || []).join(', ') || 'none'}, last=${detail.lastStatus || 'none'}, destabilizations=${detail.destabilizationCount}, recoveries=${detail.recoveryToOkCount}`
      );
    }
  }
  if (Object.keys(requiredStatusTransitions).length) {
    lines.push('', '### Required recovery transitions', '');
    for (const name of Object.keys(requiredStatusTransitions).sort()) {
      const item = requiredStatusTransitions[name] || {};
      const requirements = Object.keys(item)
        .sort((left, right) => left.localeCompare(right))
        .map(key => `${key}>=${Number(item[key])}`)
        .join(', ');
      lines.push(`- ${name}: ${requirements}`);
    }
  }
  lines.push('', '## Runtime recovery proveout', '');
  if (!recoveryRows.length) {
    lines.push('- no recovery sequence proveout recorded');
  } else {
    for (const item of recoveryRows) {
      const detail = recoverySequenceSummary[item.name];
      lines.push(
        `- ${item.name}: disruptions=${detail.disruptionCount}, recovered=${detail.recoveredCount}, stableRecoveries=${detail.stableRecoveryCount}, cleanRecoveries=${detail.cleanRecoveryCount}, relapses=${detail.relapseCount}, unresolved=${detail.unresolvedCount}, recoverySpan<=${detail.maxRecoverySpanEntries} entries, postRecoveryOkStreak=${detail.maxPostRecoveryOkStreak}, paths=${(detail.observedRecoveryPaths || []).join(', ') || 'none'}`
      );
    }
  }
  if (Object.keys(requiredRecoverySequences).length) {
    lines.push('', '### Required recovery proveout', '');
    for (const name of Object.keys(requiredRecoverySequences).sort()) {
      const item = requiredRecoverySequences[name] || {};
      const requirements = [];
      if (Number(item.recoveredCount) > 0) requirements.push(`recovered>=${Number(item.recoveredCount)}`);
      if (Number(item.stableRecoveryCount) > 0) {
        requirements.push(`stableRecoveries>=${Number(item.stableRecoveryCount)}`);
      }
      if (Number(item.cleanRecoveryCount) > 0) {
        requirements.push(`cleanRecoveries>=${Number(item.cleanRecoveryCount)}`);
      }
      if (Number(item.minPostRecoveryOkStreak) > 0) {
        requirements.push(`postRecoveryOkStreak>=${Number(item.minPostRecoveryOkStreak)}`);
      }
      if (Number.isFinite(item.maxRecoverySpanEntries)) {
        requirements.push(`recoverySpan<=${Number(item.maxRecoverySpanEntries)}`);
      }
      if (Number.isFinite(item.unresolvedCount))
        requirements.push(`unresolved<=${Number(item.unresolvedCount)}`);
      if (Number.isFinite(Number(item.maxRelapseCount))) {
        requirements.push(`relapses<=${Number(item.maxRelapseCount)}`);
      }
      if (Array.isArray(item.requiredRecoveryPaths) && item.requiredRecoveryPaths.length) {
        requirements.push(`paths=${item.requiredRecoveryPaths.join('/')}`);
      }
      lines.push(`- ${name}: ${requirements.join(', ')}`);
    }
  }
  lines.push('', '## Runtime recovery debt', '');
  if (!recoveryDebtRows.length) {
    lines.push('- no recovery debt recorded');
  } else {
    for (const item of recoveryDebtRows) {
      const detail = recoveryDebtSummary[item.name];
      lines.push(
        `- ${item.name}: debtCount=${detail.debtCount}, totalDebt=${formatMs(detail.totalDebtMs)}, avgDebt=${formatMs(detail.averageDebtMs)}, p95Debt=${formatMs(detail.p95DebtMs)}, maxDebt=${formatMs(detail.maxDebtMs)}, maxDebtEntries=${detail.maxDebtEntries}, unresolved=${detail.unresolvedCount}`
      );
    }
  }
  lines.push('', '## Runtime recovery hangover', '');
  if (!recoveryHangoverRows.length) {
    lines.push('- no recovery hangover recorded');
  } else {
    for (const item of recoveryHangoverRows) {
      const detail = recoveryHangoverSummary[item.name];
      lines.push(
        `- ${item.name}: recovered=${detail.recoveredCount}, steadyMedian=${formatMs(detail.baselineMedianMs)}, p95RecoveryWindow=${formatMs(detail.p95RecoveryWindowMs)}, maxRecoveryWindow=${formatMs(detail.maxRecoveryWindowMs)}, p95HangoverRatio=${detail.p95HangoverRatio}x, maxHangoverRatio=${detail.maxHangoverRatio}x, lingeringSettling=${detail.lingeringSettlingCount}`
      );
    }
  }
  const browserMetrics = result.windowBrowserMetrics || {};
  const browserUxTargetSummary = createBrowserPerfUxTargetSummary(browserMetrics);
  lines.push('', '## Browser responsiveness metrics', '');
  lines.push(
    `- observerSupported=${browserMetrics.observerSupported === true}, CLS=${Number(browserMetrics.cls?.value) || 0} (${Number(browserMetrics.cls?.entryCount) || 0} shifts), LCP=${formatMs(Number(browserMetrics.lcp?.valueMs) || 0)}, INP=${formatMs(Number(browserMetrics.inp?.valueMs) || 0)} (${Number(browserMetrics.inp?.interactionCount) || 0} interactions, source=${browserMetrics.inp?.source || 'none'}), Long Tasks=${Number(browserMetrics.longTasks?.count) || 0} / total=${formatMs(Number(browserMetrics.longTasks?.totalMs) || 0)} / p95=${formatMs(Number(browserMetrics.longTasks?.p95Ms) || 0)}, render-settle=${Number(browserMetrics.renderSettle?.count) || 0} / p95=${formatMs(Number(browserMetrics.renderSettle?.p95Ms) || 0)}`
  );
  lines.push('', '### UX target status (advisory)', '');
  lines.push(
    '- These product UX targets are fixed independently from the generated regression baseline; baseline regeneration cannot widen them.'
  );
  for (const metricName of ['cls', 'lcp', 'inp']) {
    const item = browserUxTargetSummary[metricName];
    if (!item) continue;
    const valueText =
      item.value == null ? 'unmeasured' : item.unit === 'ms' ? formatMs(item.value) : String(item.value);
    const targetText = item.unit === 'ms' ? formatMs(item.max) : String(item.max);
    const gapText =
      item.status === 'missed' ? `, gap=${item.unit === 'ms' ? formatMs(item.gap) : String(item.gap)}` : '';
    lines.push(
      `- ${metricName.toUpperCase()}: ${item.status}, value=${valueText}, target<=${targetText}${gapText}`
    );
  }
  lines.push('', '## Runtime perf summary', '');
  lines.push(`Required metrics present: ${presentRequiredMetrics.length}/${requiredMetrics.length}`);
  lines.push('', '### Required metric coverage', '');
  for (const name of requiredMetrics) {
    const count = perfSummary[name]?.count || 0;
    const minCount = Number(minimumCounts?.[name]) || 1;
    lines.push(`- ${name}: count=${count}, required>=${minCount}`);
  }
  const savedColorPhaseRows = createSavedColorPhaseBreakdown(perfSummary);
  if (savedColorPhaseRows.length) {
    lines.push('', '### Saved colors phase breakdown', '');
    for (const item of savedColorPhaseRows) {
      lines.push(
        `- ${item.op}: uxAvg=${formatMs(item.uxTotalAvgMs)}, uxP95=${formatMs(item.uxTotalP95Ms)}, interactionWaitAvg=${formatMs(item.interactionWaitAvgMs)}, interactionWaitP95=${formatMs(item.interactionWaitP95Ms)}, codeAvg=${formatMs(item.codeExecutionAvgMs)}, codeP95=${formatMs(item.codeExecutionP95Ms)}, prepare=${formatMs(item.prepareAvgMs)}, order=${formatMs(item.orderAvgMs)}, mutation=${formatMs(item.mutationAvgMs)}, patch=${formatMs(item.patchAvgMs)}, storage=${formatMs(item.storageAvgMs)}, bottleneck=${item.bottleneck}`
      );
    }
  }
  const settingsBackupImportPhaseRows = createSettingsBackupImportPhaseBreakdown(perfSummary);
  if (settingsBackupImportPhaseRows.length) {
    lines.push('', '### Settings backup import phase breakdown', '');
    for (const item of settingsBackupImportPhaseRows) {
      lines.push(
        `- ${item.op}: uxAvg=${formatMs(item.uxTotalAvgMs)}, uxP95=${formatMs(item.uxTotalP95Ms)}, confirmWaitAvg=${formatMs(item.confirmAvgMs)}, confirmWaitP95=${formatMs(item.confirmP95Ms)}, codeAvg=${formatMs(item.codeExecutionAvgMs)}, codeP95=${formatMs(item.codeExecutionP95Ms)}, readFile=${formatMs(item.readFileAvgMs)}, parse=${formatMs(item.parseAvgMs)}, modelsMerge=${formatMs(item.modelsMergeAvgMs)}, colors=${formatMs(item.colorsAvgMs)}, modelsFinalize=${formatMs(item.modelsFinalizeAvgMs)}, storageWrite=${formatMs(item.storageWriteAvgMs)} x${item.storageWriteCount}, bottleneck=${item.bottleneck}`
      );
    }
  }
  lines.push('', '## Store write pressure', '');
  lines.push(
    `Store commits: ${Number(storeDebugSummary.commitCount) || 0}, no-op skips: ${Number(storeDebugSummary.noopSkipCount) || 0}, noBuild commits: ${Number(storeDebugSummary.noBuildCount) || 0}, selector notifications: ${Number(storeDebugSummary.selectorNotifyCount) || 0}, tracked sources: ${Number(storeDebugSummary.sourceCount) || 0}, slow sources: ${Number(storeDebugSummary.slowSourceCount) || 0}, total source time: ${formatMs(Number(storeDebugSummary.totalSourceMs) || 0)}`
  );
  if (storeFlowRows.length) {
    lines.push('', '### Store-heavy user-flow steps', '');
    for (const item of storeFlowRows) {
      lines.push(
        `- ${item.name}: commits=${item.commitCount}, selectorNotify=${item.selectorNotifyCount}, sourceTime=${formatMs(item.totalSourceMs)}, duration=${formatMs(item.durationMs)}, topSources=${item.topSources.join(', ') || 'none'}`
      );
    }
  }
  if (storeTopSources.length) {
    lines.push('', '### Top store sources', '');
    for (const item of storeTopSources) {
      lines.push(
        `- ${item.key}: source=${item.source}, type=${item.type}, slices=${item.slices.join('+') || 'none'}, count=${item.count}, noBuild=${item.noBuildCount || 0}, total=${formatMs(item.totalMs)}, max=${formatMs(item.maxMs)}, slow=${item.slowCount}`
      );
    }
  }
  lines.push('', '## Builder scheduling pressure', '');
  lines.push(
    `Build requests: ${Number(buildDebugSummary.requestCount) || 0}, executes: ${Number(buildDebugSummary.executeCount) || 0}, immediate requests: ${Number(buildDebugSummary.immediateRequestCount) || 0}, debounced requests: ${Number(buildDebugSummary.debouncedRequestCount) || 0}, immediate force: ${Number(buildDebugSummary.immediateForceRequestCount) || 0}, immediate non-force: ${Number(buildDebugSummary.immediateNonForceRequestCount) || 0}, coalesced force: ${Number(buildDebugSummary.debouncedForceRequestCount) || 0}, coalesced non-force: ${Number(buildDebugSummary.debouncedNonForceRequestCount) || 0}, force requests: ${Number(buildDebugSummary.forceRequestCount) || 0}, force executes: ${Number(buildDebugSummary.executeForceCount) || 0}, pending overwrites: ${Number(buildDebugSummary.pendingOverwriteCount) || 0}, suppressed requests: ${Number(buildDebugSummary.suppressedRequestCount) || 0}, suppressed executes: ${Number(buildDebugSummary.suppressedExecuteCount) || 0}, debounce schedules: ${Number(buildDebugSummary.debouncedScheduleCount) || 0}`
  );
  if ((Number(buildDebugSummary.executeDurationCount) || 0) > 0) {
    lines.push('', '### Build execution duration', '');
    lines.push(
      `- all: count=${Number(buildDebugSummary.executeDurationCount) || 0}, ok=${Number(buildDebugSummary.executeSuccessCount) || 0}, error=${Number(buildDebugSummary.executeFailureCount) || 0}, total=${formatMs(Number(buildDebugSummary.executeDurationTotalMs) || 0)}, avg=${formatMs(Number(buildDebugSummary.executeDurationAvgMs) || 0)}, p95=${formatMs(Number(buildDebugSummary.executeDurationP95Ms) || 0)}, max=${formatMs(Number(buildDebugSummary.executeDurationMaxMs) || 0)}`
    );
    lines.push(
      `- immediate: count=${Number(buildDebugSummary.executeImmediateDurationCount) || 0}, avg=${formatMs(Number(buildDebugSummary.executeImmediateDurationAvgMs) || 0)}, p95=${formatMs(Number(buildDebugSummary.executeImmediateDurationP95Ms) || 0)}, max=${formatMs(Number(buildDebugSummary.executeImmediateDurationMaxMs) || 0)}`
    );
    lines.push(
      `- debounced: count=${Number(buildDebugSummary.executeDebouncedDurationCount) || 0}, avg=${formatMs(Number(buildDebugSummary.executeDebouncedDurationAvgMs) || 0)}, p95=${formatMs(Number(buildDebugSummary.executeDebouncedDurationP95Ms) || 0)}, max=${formatMs(Number(buildDebugSummary.executeDebouncedDurationMaxMs) || 0)}`
    );
    lines.push(
      `- force: count=${Number(buildDebugSummary.executeForceDurationCount) || 0}, avg=${formatMs(Number(buildDebugSummary.executeForceDurationAvgMs) || 0)}, p95=${formatMs(Number(buildDebugSummary.executeForceDurationP95Ms) || 0)}, max=${formatMs(Number(buildDebugSummary.executeForceDurationMaxMs) || 0)}`
    );
    lines.push(
      `- non-force: count=${Number(buildDebugSummary.executeNonForceDurationCount) || 0}, avg=${formatMs(Number(buildDebugSummary.executeNonForceDurationAvgMs) || 0)}, p95=${formatMs(Number(buildDebugSummary.executeNonForceDurationP95Ms) || 0)}, max=${formatMs(Number(buildDebugSummary.executeNonForceDurationMaxMs) || 0)}`
    );
    if (buildSlowReasons.length) {
      lines.push('', '### Slow build reasons by execution duration', '');
      for (const item of buildSlowReasons) {
        lines.push(
          `- ${item.reason}: count=${item.executeDurationCount}, ok=${item.executeSuccessCount}, error=${item.executeFailureCount}, total=${formatMs(item.executeDurationTotalMs)}, avg=${formatMs(item.executeDurationAvgMs)}, p95=${formatMs(item.executeDurationP95Ms)}, max=${formatMs(item.executeDurationMaxMs)}`
        );
      }
    }
  }
  if (buildFlowRows.length) {
    lines.push('', '### Build-heavy user-flow steps', '');
    for (const item of buildFlowRows) {
      lines.push(
        `- ${item.name}: requests=${item.requestCount}, executes=${item.executeCount}, immediateForce=${item.immediateForceRequestCount || 0}, immediateNonForce=${item.immediateNonForceRequestCount || 0}, coalescedForce=${item.debouncedForceRequestCount || 0}, coalescedNonForce=${item.debouncedNonForceRequestCount || 0}, forceRequests=${item.forceRequestCount || 0}, forceExecutes=${item.executeForceCount || 0}, pendingOverwrites=${item.pendingOverwriteCount}, suppressedRequests=${item.suppressedRequestCount}, debounce=${item.debounceCount}, duration=${formatMs(item.durationMs)}, topReasons=${item.topReasons.join(', ') || 'none'}`
      );
    }
  }
  if (buildTopReasons.length) {
    lines.push('', '### Top build reasons', '');
    for (const item of buildTopReasons) {
      lines.push(
        `- ${item.reason}: requests=${item.requestCount}, executes=${item.executeCount}, immediateRequests=${item.immediateRequestCount}, debouncedRequests=${item.debouncedRequestCount}, immediateForce=${item.immediateForceRequestCount || 0}, immediateNonForce=${item.immediateNonForceRequestCount || 0}, coalescedForce=${item.debouncedForceRequestCount || 0}, coalescedNonForce=${item.debouncedNonForceRequestCount || 0}, forceRequests=${item.forceRequestCount || 0}, forceExecutes=${item.executeForceCount || 0}`
      );
    }
  }
  if (journeyBuildRows.length) {
    lines.push('', '### Build-heavy customer journeys', '');
    for (const item of journeyBuildRows) {
      lines.push(
        `- ${item.name}: steps=${item.stepCount}, requests=${item.requestCount}, executes=${item.executeCount}, immediateForce=${item.immediateForceRequestCount || 0}, immediateNonForce=${item.immediateNonForceRequestCount || 0}, coalescedForce=${item.debouncedForceRequestCount || 0}, coalescedNonForce=${item.debouncedNonForceRequestCount || 0}, forceRequests=${item.forceRequestCount || 0}, forceExecutes=${item.executeForceCount || 0}, pendingOverwrites=${item.pendingOverwriteCount}, suppressedRequests=${item.suppressedRequestCount}, debounce=${item.debounceCount}, total=${formatMs(item.totalDurationMs)}, topReasons=${item.topReasons.join(', ') || 'none'}`
      );
    }
  }
  lines.push('', '## Customer journeys', '');
  if (!userJourneyRows.length) {
    lines.push('- none recorded');
  } else {
    for (const item of userJourneyRows) {
      lines.push(
        `- ${item.name}: steps=${item.stepCount}, total=${formatMs(item.totalDurationMs)}, avgStep=${formatMs(item.averageStepMs)}, maxStep=${formatMs(item.maxStepDurationMs)}, commits=${item.commitCount}, selectorNotify=${item.selectorNotifyCount}, sourceTime=${formatMs(item.totalSourceMs)}, topSources=${item.topSources.join(', ') || 'none'}`
      );
    }
  }
  lines.push('', '### Journey diagnosis', '');
  if (!userJourneyDiagnosisRows.length) {
    lines.push('- none recorded');
  } else {
    for (const item of userJourneyDiagnosisRows) {
      lines.push(
        `- ${item.name}: bottleneck=${item.primaryBottleneck}, burstySteps=${item.burstyStepCount}, repeatedSources=${item.repeatedSourceCount}, dominantSourceShare=${Math.round(item.dominantSourceSharePct)}%, topStep=${item.topStepName || 'none'}, topSource=${item.topSourceKey || 'none'}, burstyStepNames=${item.burstySteps.join(', ') || 'none'}`
      );
    }
  }
  lines.push('', '### Required customer journey coverage', '');
  if (!requiredJourneyNames.length) {
    lines.push('- none required');
  } else {
    for (const name of requiredJourneyNames) {
      const item = userJourneySummary[name];
      const actualCount = Number(item?.stepCount) || 0;
      const requiredCount = Number(requiredJourneyMinimumCounts?.[name]) || 1;
      lines.push(`- ${name}: steps=${actualCount}, required>=${requiredCount}`);
    }
  }
  lines.push('', '## State integrity checks', '');
  if (!stateIntegrityNames.length) {
    lines.push('- none recorded');
  } else {
    for (const name of stateIntegrityNames) {
      const item = stateIntegritySummary[name];
      lines.push(
        `- ${name}: ${item.ok ? 'ok' : 'failed'} (expected=${item.expectedText}, actual=${item.actualText}${item.detailText ? `, detail=${item.detailText}` : ''}${item.messageText ? `, message=${item.messageText}` : ''})`
      );
    }
  }
  lines.push('', '## Sustained-use pressure signals', '');
  if (!pressureRows.length) {
    lines.push('- none recorded');
  } else {
    for (const item of pressureRows) {
      const detail = pressureSummary[item.name];
      lines.push(
        `- ${item.name}: count=${detail.count}/${detail.minimumCount}, firstAvg=${formatMs(detail.firstAvgMs)}, lastAvg=${formatMs(detail.lastAvgMs)}, rawDrift=${formatMs(detail.driftMs)} (${detail.driftPct}%), materialDrift=${detail.materialDriftPct}%, comparable=${detail.driftComparable ? 'yes' : 'no'}, errors=${detail.errorCount}`
      );
    }
  }
  lines.push('', '## Runtime domains', '');
  if (!domainRows.length) {
    lines.push('- none recorded');
  } else {
    for (const item of domainRows) {
      const detail = domainSummary[item.name];
      lines.push(
        `- ${item.name}: required=${detail.presentRequiredMetricCount}/${detail.requiredMetricCount}, metrics=${detail.metricCount}, entries=${detail.entryCount}, errors=${detail.errorCount}, marks=${detail.markCount}, uxTotal=${formatMs(detail.uxTotalMs)}, codeTotal=${formatMs(detail.codeExecutionTotalMs)}, interactionWait=${formatMs(detail.interactionWaitTotalMs)}, maxCodeP95=${formatMs(detail.maxCodeExecutionP95Ms)}, worstCodeDrift=${detail.worstDriftPct}%`
      );
    }
  }
  lines.push('', '## Hotspot candidates', '');
  if (!hotspots.length) {
    lines.push('- none recorded');
  } else {
    for (const item of hotspots) {
      lines.push(
        `- ${item.name}: codeTotal=${formatMs(item.codeExecutionTotalMs)}, codeP95=${formatMs(item.codeExecutionP95Ms)}, codeMax=${formatMs(item.codeExecutionMaxMs)}, uxTotal=${formatMs(item.uxTotalMs)}, interactionWait=${formatMs(item.interactionWaitTotalMs)}, count=${item.count}, errors=${item.errorCount}`
      );
    }
  }
  lines.push('');
  for (const name of keyNames) {
    const item = perfSummary[name];
    lines.push(
      `- ${name}: count=${item.count}, kinds=${(item.kinds || []).join('+') || 'none'}, ok=${item.okCount ?? 0}, error=${item.errorCount ?? 0}, mark=${item.markCount ?? 0}, uxAvg=${formatMs(item.uxAverageMs)}, uxP95=${formatMs(item.uxP95Ms)}, codeAvg=${formatMs(item.codeExecutionAverageMs)}, codeP95=${formatMs(item.codeExecutionP95Ms)}, waitAvg=${formatMs(item.interactionWaitAverageMs)}${item.lastError ? `, lastError=${item.lastError}` : ''}`
    );
  }
  lines.push('', '## Recent runtime entries', '');
  for (const entry of (result.windowPerfEntries || []).slice(-15)) {
    lines.push(
      `- ${entry.name}: kind=${entry.kind}, ux=${formatMs(entry.uxTotalMs)}, code=${formatMs(entry.codeExecutionMs)}, interactionWait=${formatMs(entry.interactionWaitMs)} [${entry.status}]`
    );
  }
  return `${lines.join('\n')}\n`;
}

export function createRuntimeUxBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    const p95 = item && Number.isFinite(item.uxP95Ms) ? Number(item.uxP95Ms) : 0;
    const codeP95 = item && Number.isFinite(item.codeExecutionP95Ms) ? Number(item.codeExecutionP95Ms) : 0;
    const interactionWaitP95 =
      item && Number.isFinite(item.interactionWaitP95Ms) ? Number(item.interactionWaitP95Ms) : 0;
    if (interactionWaitP95 > codeP95) continue;
    budget[name] = Math.max(Math.ceil(p95 * 1.35 + 25), 100);
  }
  return budget;
}

export function createRuntimeCodeExecutionBudget(summary) {
  const budget = {};
  for (const [name, item] of Object.entries(summary || {})) {
    if ((Number(item?.actionableCount) || 0) < 1) continue;
    const p95 = item && Number.isFinite(item.codeExecutionP95Ms) ? Number(item.codeExecutionP95Ms) : 0;
    budget[name] = Math.max(Math.ceil(p95 * 1.35 + 10), 50);
  }
  return budget;
}

export function createBrowserMetricBudget(metrics, measurementProfile = null) {
  const value = metrics && typeof metrics === 'object' ? metrics : {};
  const normalizedProfile = normalizeBrowserPerfMeasurementProfile(measurementProfile);
  const inpRegressionFloorMs = normalizedProfile?.id === 'dev' ? 500 : 200;
  return {
    maxCls: Math.max(Number(((Number(value.cls?.value) || 0) * 1.35 + 0.02).toFixed(4)), 0.1),
    maxLcpMs: Math.max(Math.ceil((Number(value.lcp?.valueMs) || 0) * 1.35 + 250), 2500),
    maxInpMs: Math.max(Math.ceil((Number(value.inp?.valueMs) || 0) * 1.35 + 20), inpRegressionFloorMs),
    maxLongTaskCount: Math.max(Math.ceil((Number(value.longTasks?.count) || 0) * 1.4 + 2), 5),
    maxLongTaskTotalMs: Math.max(Math.ceil((Number(value.longTasks?.totalMs) || 0) * 1.35 + 250), 1000),
    maxLongTaskP95Ms: Math.max(Math.ceil((Number(value.longTasks?.p95Ms) || 0) * 1.35 + 10), 60),
    maxRenderSettleP95Ms: Math.max(Math.ceil((Number(value.renderSettle?.p95Ms) || 0) * 1.35 + 10), 50),
  };
}

export function createBrowserPerfBaseline(result, contracts = {}) {
  const perfSummary =
    result.windowPerfSummary && Object.keys(result.windowPerfSummary).length
      ? result.windowPerfSummary
      : createPerfSummaryFromEntries(result.windowPerfEntries);
  const budget = {};
  for (const [name, durationMs] of Object.entries(result.userFlow || {})) {
    budget[name] = Math.max(Math.ceil(durationMs * 1.35 + 250), 500);
  }
  const requiredMetrics = Array.isArray(contracts.requiredRuntimeMetrics)
    ? contracts.requiredRuntimeMetrics
    : requiredRuntimeMetrics;
  const requiredActions = Array.isArray(contracts.requiredProjectActions)
    ? contracts.requiredProjectActions
    : requiredProjectActions;
  const metricMinimumCounts = readRequiredMetricMinimumCounts(contracts);
  const pressureSummary =
    result.windowPerfPressureSummary && Object.keys(result.windowPerfPressureSummary).length
      ? result.windowPerfPressureSummary
      : createRepeatedMetricPressureSummary(result.windowPerfEntries, metricMinimumCounts);
  const domainSummary =
    result.windowPerfDomainSummary && Object.keys(result.windowPerfDomainSummary).length
      ? result.windowPerfDomainSummary
      : createPerfDomainSummary(perfSummary, pressureSummary, requiredMetrics, metricMinimumCounts);
  const requiredDomains = Array.isArray(contracts.requiredRuntimeDomains)
    ? contracts.requiredRuntimeDomains
    : deriveRequiredRuntimeDomains(requiredMetrics);
  const requiredOutcomeCoverage = readRequiredRuntimeOutcomeCoverage(contracts, null, perfSummary);
  const requiredStatusTransitions = readRequiredRuntimeStatusTransitions(
    contracts,
    null,
    result.windowPerfEntries
  );
  const requiredRecoverySequences = readRequiredRuntimeRecoverySequences(
    contracts,
    null,
    result.windowPerfEntries
  );
  const recoveryDebtSummary =
    result.windowPerfRecoveryDebtSummary && Object.keys(result.windowPerfRecoveryDebtSummary).length
      ? result.windowPerfRecoveryDebtSummary
      : createRuntimeRecoveryDebtSummary(result.windowPerfEntries);
  const recoveryHangoverSummary =
    result.windowPerfRecoveryHangoverSummary && Object.keys(result.windowPerfRecoveryHangoverSummary).length
      ? result.windowPerfRecoveryHangoverSummary
      : createRuntimeRecoveryHangoverSummary(result.windowPerfEntries);
  const storeFlowSummary =
    result.windowStoreFlowPressureSummary && Object.keys(result.windowStoreFlowPressureSummary).length
      ? result.windowStoreFlowPressureSummary
      : createStoreFlowPressureSummary(result.windowStoreDebugFlowSteps);
  const buildFlowSummary =
    result.windowBuildFlowPressureSummary && Object.keys(result.windowBuildFlowPressureSummary).length
      ? result.windowBuildFlowPressureSummary
      : createBuildFlowPressureSummary(result.windowBuildDebugFlowSteps);
  const userJourneySummary =
    result.userJourneySummary && Object.keys(result.userJourneySummary).length
      ? result.userJourneySummary
      : createUserJourneySummary(result.userFlowSteps, storeFlowSummary, result.userFlow);
  const journeyStoreSourceSummary =
    result.journeyStoreSourceSummary && Object.keys(result.journeyStoreSourceSummary).length
      ? result.journeyStoreSourceSummary
      : createJourneyStoreSourceSummary(result.windowStoreDebugFlowSteps);
  const userJourneyDiagnosisSummary =
    result.userJourneyDiagnosisSummary && Object.keys(result.userJourneyDiagnosisSummary).length
      ? result.userJourneyDiagnosisSummary
      : createUserJourneyDiagnosisSummary(userJourneySummary, storeFlowSummary, journeyStoreSourceSummary);
  const requiredBrowserMetrics = Array.isArray(contracts.requiredBrowserMetrics)
    ? Array.from(
        new Set(contracts.requiredBrowserMetrics.map(item => String(item || '').trim()).filter(Boolean))
      ).sort((left, right) => left.localeCompare(right))
    : [];
  const requiredJourneyNames = readRequiredUserJourneyNames(contracts, null, userJourneySummary);
  const requiredJourneyMinimumCounts = readRequiredUserJourneyMinimumStepCounts(contracts, null);
  const measurementProfile = normalizeBrowserPerfMeasurementProfile(
    contracts.measurementProfile || result.measurementProfile
  );
  return {
    version: BROWSER_PERF_BASELINE_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    measurementProfile: measurementProfile || null,
    uxJourneyBudgetMs: budget,
    runtimeUxBudgetMs: createRuntimeUxBudget(perfSummary),
    runtimeCodeExecutionBudgetMs: createRuntimeCodeExecutionBudget(perfSummary),
    runtimeDriftBudgetPct: createRuntimeDriftBudgetPct(pressureSummary),
    runtimeDomainCodeExecutionBudgetMs: createRuntimeDomainCodeExecutionBudget(domainSummary),
    runtimeDomainDriftBudgetPct: createRuntimeDomainDriftBudgetPct(domainSummary),
    browserMetricBudget: createBrowserMetricBudget(result.windowBrowserMetrics, measurementProfile),
    runtimeRecoveryDebtBudgetMs: createRuntimeRecoveryDebtBudgetMs(recoveryDebtSummary),
    runtimeRecoveryHangoverBudget: createRuntimeRecoveryHangoverBudget(recoveryHangoverSummary),
    storePressureBudget: createStorePressureBudget(storeFlowSummary),
    buildPressureBudget: createBuildPressureBudget(buildFlowSummary),
    userJourneyBudget: createUserJourneyBudget(userJourneySummary),
    userJourneyDiagnosisBudget: createUserJourneyDiagnosisBudget(userJourneyDiagnosisSummary),
    requiredBrowserMetrics,
    requiredRuntimeMetrics: requiredMetrics.slice(),
    requiredRuntimeDomains: requiredDomains.slice(),
    requiredRuntimeMetricMinimumCounts: { ...metricMinimumCounts },
    requiredProjectActions: requiredActions.slice(),
    requiredUserJourneys: requiredJourneyNames.slice(),
    requiredUserJourneyMinimumStepCounts: sortSerializableValue(requiredJourneyMinimumCounts),
    requiredRuntimeOutcomeCoverage: sortSerializableValue(requiredOutcomeCoverage),
    requiredRuntimeStatusTransitions: sortSerializableValue(requiredStatusTransitions),
    requiredRuntimeRecoverySequences: sortSerializableValue(requiredRecoverySequences),
    requiredStateIntegrityChecks: Object.keys(
      result.stateIntegritySummary && Object.keys(result.stateIntegritySummary).length
        ? result.stateIntegritySummary
        : createStateIntegritySummary(result.stateIntegrityChecks)
    ).sort(),
  };
}

export function evaluateBrowserPerfBaseline(result, baseline, contracts = {}) {
  const failures = [];
  if (!baseline || typeof baseline !== 'object') {
    failures.push(
      `Browser perf baseline missing; generate a fresh schema-v${BROWSER_PERF_BASELINE_SCHEMA_VERSION} baseline`
    );
  } else if (baseline.version !== BROWSER_PERF_BASELINE_SCHEMA_VERSION) {
    failures.push(
      `Browser perf baseline schema mismatch (expected ${BROWSER_PERF_BASELINE_SCHEMA_VERSION}, got ${String(baseline.version ?? 'missing')})`
    );
  }
  const expectedMeasurementProfile = normalizeBrowserPerfMeasurementProfile(
    contracts.measurementProfile || result.measurementProfile
  );
  const baselineMeasurementProfile = normalizeBrowserPerfMeasurementProfile(baseline?.measurementProfile);
  if (expectedMeasurementProfile && !baselineMeasurementProfile) {
    failures.push('Browser perf baseline measurement profile is missing or incomplete');
  } else if (
    expectedMeasurementProfile &&
    baselineMeasurementProfile &&
    !measurementProfilesMatch(expectedMeasurementProfile, baselineMeasurementProfile)
  ) {
    failures.push(
      `Browser perf baseline measurement profile mismatch (expected ${expectedMeasurementProfile.id}, got ${baselineMeasurementProfile.id})`
    );
  }
  const budget = baseline && typeof baseline === 'object' ? baseline.uxJourneyBudgetMs || {} : {};
  for (const [name, durationMs] of Object.entries(result.userFlow || {})) {
    const maxMs = budget[name];
    if (typeof maxMs === 'number' && exceedsMaterialDurationBudget(durationMs, maxMs)) {
      failures.push(`${name} exceeded budget (${formatMs(durationMs)} > ${formatMs(maxMs)})`);
    }
  }

  const requiredBrowserMetrics = Array.isArray(contracts.requiredBrowserMetrics)
    ? contracts.requiredBrowserMetrics
    : Array.isArray(baseline?.requiredBrowserMetrics)
      ? baseline.requiredBrowserMetrics
      : [];
  const normalizedRequiredBrowserMetrics = Array.from(
    new Set(
      requiredBrowserMetrics
        .map(item =>
          String(item || '')
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    )
  );
  const browserMetricBudget =
    baseline && typeof baseline === 'object' ? baseline.browserMetricBudget || {} : {};
  const browserMetrics = result.windowBrowserMetrics || {};
  failures.push(...evaluateBrowserPerfUxEvidence(browserMetrics, normalizedRequiredBrowserMetrics));
  if (
    browserMetricBudget.maxCls != null &&
    Number(browserMetrics.cls?.value || 0) > browserMetricBudget.maxCls
  ) {
    failures.push(
      `CLS exceeded budget (${Number(browserMetrics.cls?.value || 0)} > ${browserMetricBudget.maxCls})`
    );
  }
  if (
    browserMetricBudget.maxLcpMs != null &&
    exceedsMaterialDurationBudget(browserMetrics.lcp?.valueMs, browserMetricBudget.maxLcpMs)
  ) {
    failures.push(
      `LCP exceeded budget (${formatMs(Number(browserMetrics.lcp?.valueMs || 0))} > ${formatMs(browserMetricBudget.maxLcpMs)})`
    );
  }
  if (
    browserMetricBudget.maxInpMs != null &&
    exceedsMaterialDurationBudget(browserMetrics.inp?.valueMs, browserMetricBudget.maxInpMs)
  ) {
    failures.push(
      `INP exceeded budget (${formatMs(Number(browserMetrics.inp?.valueMs || 0))} > ${formatMs(browserMetricBudget.maxInpMs)})`
    );
  }
  if (
    browserMetricBudget.maxLongTaskCount != null &&
    exceedsMaterialCountBudget(browserMetrics.longTasks?.count, browserMetricBudget.maxLongTaskCount)
  ) {
    failures.push(
      `Long Task count exceeded budget (${Number(browserMetrics.longTasks?.count || 0)} > ${browserMetricBudget.maxLongTaskCount})`
    );
  }
  if (
    browserMetricBudget.maxLongTaskTotalMs != null &&
    exceedsMaterialDurationBudget(browserMetrics.longTasks?.totalMs, browserMetricBudget.maxLongTaskTotalMs)
  ) {
    failures.push(
      `Long Task total exceeded budget (${formatMs(Number(browserMetrics.longTasks?.totalMs || 0))} > ${formatMs(browserMetricBudget.maxLongTaskTotalMs)})`
    );
  }
  if (
    browserMetricBudget.maxLongTaskP95Ms != null &&
    exceedsMaterialDurationBudget(browserMetrics.longTasks?.p95Ms, browserMetricBudget.maxLongTaskP95Ms)
  ) {
    failures.push(
      `Long Task p95 exceeded budget (${formatMs(Number(browserMetrics.longTasks?.p95Ms || 0))} > ${formatMs(browserMetricBudget.maxLongTaskP95Ms)})`
    );
  }
  if (
    browserMetricBudget.maxRenderSettleP95Ms != null &&
    exceedsMaterialDurationBudget(
      browserMetrics.renderSettle?.p95Ms,
      browserMetricBudget.maxRenderSettleP95Ms
    )
  ) {
    failures.push(
      `render-settle p95 exceeded budget (${formatMs(Number(browserMetrics.renderSettle?.p95Ms || 0))} > ${formatMs(browserMetricBudget.maxRenderSettleP95Ms)})`
    );
  }

  const runtimeSummary =
    result.windowPerfSummary && Object.keys(result.windowPerfSummary).length
      ? result.windowPerfSummary
      : createPerfSummaryFromEntries(result.windowPerfEntries);
  const runtimeUxBudget = baseline && typeof baseline === 'object' ? baseline.runtimeUxBudgetMs || {} : {};
  const runtimeCodeExecutionBudget =
    baseline && typeof baseline === 'object' ? baseline.runtimeCodeExecutionBudgetMs || {} : {};
  const requiredNames = Array.isArray(baseline?.requiredRuntimeMetrics)
    ? baseline.requiredRuntimeMetrics
    : Array.isArray(contracts.requiredRuntimeMetrics)
      ? contracts.requiredRuntimeMetrics
      : requiredRuntimeMetrics;
  const minimumCounts = readRequiredMetricMinimumCounts(contracts, baseline);

  for (const name of requiredNames) {
    const item = runtimeSummary[name];
    const requiredCount = Number(minimumCounts?.[name]) || 1;
    if (!item || item.count < 1) {
      failures.push(`Missing runtime perf metric: ${name}`);
      continue;
    }
    if (item.count < requiredCount) {
      failures.push(`${name} runtime count below required coverage (${item.count} < ${requiredCount})`);
    }
  }

  for (const [name, maxMs] of Object.entries(runtimeUxBudget)) {
    const item = runtimeSummary[name];
    if (!item || typeof maxMs !== 'number') continue;
    if (exceedsMaterialDurationBudget(item.uxP95Ms, maxMs)) {
      failures.push(`${name} UX p95 exceeded budget (${formatMs(item.uxP95Ms)} > ${formatMs(maxMs)})`);
    }
  }
  for (const [name, maxMs] of Object.entries(runtimeCodeExecutionBudget)) {
    const item = runtimeSummary[name];
    if (!item || typeof maxMs !== 'number') continue;
    if (exceedsMaterialDurationBudget(item.codeExecutionP95Ms, maxMs)) {
      failures.push(
        `${name} code-execution p95 exceeded budget (${formatMs(item.codeExecutionP95Ms)} > ${formatMs(maxMs)})`
      );
    }
  }

  const pressureSummary =
    result.windowPerfPressureSummary && Object.keys(result.windowPerfPressureSummary).length
      ? result.windowPerfPressureSummary
      : createRepeatedMetricPressureSummary(result.windowPerfEntries, minimumCounts);
  const domainSummary =
    result.windowPerfDomainSummary && Object.keys(result.windowPerfDomainSummary).length
      ? result.windowPerfDomainSummary
      : createPerfDomainSummary(runtimeSummary, pressureSummary, requiredNames, minimumCounts);
  const driftBudget = baseline && typeof baseline === 'object' ? baseline.runtimeDriftBudgetPct || {} : {};
  for (const [name, maxPct] of Object.entries(driftBudget)) {
    const item = pressureSummary[name];
    if (!item || typeof maxPct !== 'number') continue;
    const materialDriftPct = Number(item.materialDriftPct) || 0;
    if (materialDriftPct > maxPct) {
      failures.push(
        `${name} sustained-use drift exceeded budget (${materialDriftPct}% > ${Math.round(maxPct)}%)`
      );
    }
  }

  const requiredDomainNames = Array.isArray(baseline?.requiredRuntimeDomains)
    ? baseline.requiredRuntimeDomains
    : Array.isArray(contracts.requiredRuntimeDomains)
      ? contracts.requiredRuntimeDomains
      : deriveRequiredRuntimeDomains(requiredNames);
  for (const name of requiredDomainNames) {
    const item = domainSummary[name];
    if (!item || item.presentRequiredMetricCount < 1) {
      failures.push(`Missing runtime domain coverage: ${name}`);
    }
  }
  const runtimeDomainBudget =
    baseline && typeof baseline === 'object' ? baseline.runtimeDomainCodeExecutionBudgetMs || {} : {};
  for (const [name, maxMs] of Object.entries(runtimeDomainBudget)) {
    const item = domainSummary[name];
    if (!item || typeof maxMs !== 'number') continue;
    if (exceedsMaterialDurationBudget(item.codeExecutionTotalMs, maxMs)) {
      failures.push(
        `${name} runtime domain code total exceeded budget (${formatMs(item.codeExecutionTotalMs)} > ${formatMs(maxMs)})`
      );
    }
  }
  const runtimeDomainDriftBudget =
    baseline && typeof baseline === 'object' ? baseline.runtimeDomainDriftBudgetPct || {} : {};
  for (const [name, maxPct] of Object.entries(runtimeDomainDriftBudget)) {
    const item = domainSummary[name];
    if (!item || typeof maxPct !== 'number') continue;
    if (item.worstDriftPct > maxPct) {
      failures.push(
        `${name} runtime domain drift exceeded budget (${item.worstDriftPct}% > ${Math.round(maxPct)}%)`
      );
    }
  }

  const storeFlowSummary =
    result.windowStoreFlowPressureSummary && Object.keys(result.windowStoreFlowPressureSummary).length
      ? result.windowStoreFlowPressureSummary
      : createStoreFlowPressureSummary(result.windowStoreDebugFlowSteps);
  const buildFlowSummary =
    result.windowBuildFlowPressureSummary && Object.keys(result.windowBuildFlowPressureSummary).length
      ? result.windowBuildFlowPressureSummary
      : createBuildFlowPressureSummary(result.windowBuildDebugFlowSteps);
  const userJourneySummary =
    result.userJourneySummary && Object.keys(result.userJourneySummary).length
      ? result.userJourneySummary
      : createUserJourneySummary(result.userFlowSteps, storeFlowSummary, result.userFlow);
  const journeyStoreSourceSummary =
    result.journeyStoreSourceSummary && Object.keys(result.journeyStoreSourceSummary).length
      ? result.journeyStoreSourceSummary
      : createJourneyStoreSourceSummary(result.windowStoreDebugFlowSteps);
  const userJourneyDiagnosisSummary =
    result.userJourneyDiagnosisSummary && Object.keys(result.userJourneyDiagnosisSummary).length
      ? result.userJourneyDiagnosisSummary
      : createUserJourneyDiagnosisSummary(userJourneySummary, storeFlowSummary, journeyStoreSourceSummary);
  const storePressureBudget =
    baseline && typeof baseline === 'object' ? baseline.storePressureBudget || {} : {};
  const buildPressureBudget =
    baseline && typeof baseline === 'object' ? baseline.buildPressureBudget || {} : {};
  for (const [name, budgetItem] of Object.entries(storePressureBudget)) {
    const item = storeFlowSummary[name];
    if (!item || !budgetItem || typeof budgetItem !== 'object') continue;
    const maxCommitCount = Number(budgetItem.maxCommitCount);
    if (Number.isFinite(maxCommitCount) && (Number(item.commitCount) || 0) > maxCommitCount) {
      failures.push(
        `${name} store commit burst exceeded budget (${Number(item.commitCount) || 0} > ${maxCommitCount})`
      );
    }
    const maxSelectorNotifyCount = Number(budgetItem.maxSelectorNotifyCount);
    if (
      Number.isFinite(maxSelectorNotifyCount) &&
      (Number(item.selectorNotifyCount) || 0) > maxSelectorNotifyCount
    ) {
      failures.push(
        `${name} selector notification burst exceeded budget (${Number(item.selectorNotifyCount) || 0} > ${maxSelectorNotifyCount})`
      );
    }
    const maxTotalSourceMs = Number(budgetItem.maxTotalSourceMs);
    if (exceedsMaterialDurationBudget(item.totalSourceMs, maxTotalSourceMs)) {
      failures.push(
        `${name} store source time exceeded budget (${formatMs(Number(item.totalSourceMs) || 0)} > ${formatMs(maxTotalSourceMs)})`
      );
    }
  }
  for (const [name, budgetItem] of Object.entries(buildPressureBudget)) {
    const item = buildFlowSummary[name];
    if (!item || !budgetItem || typeof budgetItem !== 'object') continue;
    const maxRequestCount = Number(budgetItem.maxRequestCount);
    if (Number.isFinite(maxRequestCount) && (Number(item.requestCount) || 0) > maxRequestCount) {
      failures.push(
        `${name} build request pressure exceeded budget (${Number(item.requestCount) || 0} > ${maxRequestCount})`
      );
    }
    const maxExecuteCount = Number(budgetItem.maxExecuteCount);
    if (Number.isFinite(maxExecuteCount) && (Number(item.executeCount) || 0) > maxExecuteCount) {
      failures.push(
        `${name} build execute pressure exceeded budget (${Number(item.executeCount) || 0} > ${maxExecuteCount})`
      );
    }
    const maxPendingOverwriteCount = Number(budgetItem.maxPendingOverwriteCount);
    if (
      Number.isFinite(maxPendingOverwriteCount) &&
      (Number(item.pendingOverwriteCount) || 0) > maxPendingOverwriteCount
    ) {
      failures.push(
        `${name} build pending-overwrite pressure exceeded budget (${Number(item.pendingOverwriteCount) || 0} > ${maxPendingOverwriteCount})`
      );
    }
    const maxSuppressedRequestCount = Number(budgetItem.maxSuppressedRequestCount);
    if (
      Number.isFinite(maxSuppressedRequestCount) &&
      (Number(item.suppressedRequestCount) || 0) > maxSuppressedRequestCount
    ) {
      failures.push(
        `${name} suppressed build-request pressure exceeded budget (${Number(item.suppressedRequestCount) || 0} > ${maxSuppressedRequestCount})`
      );
    }
    const maxDebounceCount = Number(budgetItem.maxDebounceCount);
    if (Number.isFinite(maxDebounceCount) && (Number(item.debounceCount) || 0) > maxDebounceCount) {
      failures.push(
        `${name} build debounce pressure exceeded budget (${Number(item.debounceCount) || 0} > ${maxDebounceCount})`
      );
    }
  }

  const requiredJourneyNames = readRequiredUserJourneyNames(contracts, baseline, userJourneySummary);
  const requiredJourneyMinimumCounts = readRequiredUserJourneyMinimumStepCounts(contracts, baseline);
  for (const name of requiredJourneyNames) {
    const item = userJourneySummary[name];
    const requiredCount = Number(requiredJourneyMinimumCounts?.[name]) || 1;
    if (!item || (Number(item.stepCount) || 0) < requiredCount) {
      failures.push(
        `${name} customer journey coverage below required minimum (${Number(item?.stepCount) || 0} < ${requiredCount})`
      );
    }
  }

  const userJourneyBudget = baseline && typeof baseline === 'object' ? baseline.userJourneyBudget || {} : {};
  for (const [name, budgetItem] of Object.entries(userJourneyBudget)) {
    const item = userJourneySummary[name];
    if (!item || !budgetItem || typeof budgetItem !== 'object') continue;
    const maxTotalDurationMs = Number(budgetItem.maxTotalDurationMs);
    if (exceedsMaterialDurationBudget(item.totalDurationMs, maxTotalDurationMs)) {
      failures.push(
        `${name} customer journey total exceeded budget (${formatMs(Number(item.totalDurationMs) || 0)} > ${formatMs(maxTotalDurationMs)})`
      );
    }
    const maxCommitCount = Number(budgetItem.maxCommitCount);
    if (Number.isFinite(maxCommitCount) && (Number(item.commitCount) || 0) > maxCommitCount) {
      failures.push(
        `${name} customer journey store commits exceeded budget (${Number(item.commitCount) || 0} > ${maxCommitCount})`
      );
    }
    const maxSelectorNotifyCount = Number(budgetItem.maxSelectorNotifyCount);
    if (
      Number.isFinite(maxSelectorNotifyCount) &&
      (Number(item.selectorNotifyCount) || 0) > maxSelectorNotifyCount
    ) {
      failures.push(
        `${name} customer journey selector notifications exceeded budget (${Number(item.selectorNotifyCount) || 0} > ${maxSelectorNotifyCount})`
      );
    }
    const maxTotalSourceMs = Number(budgetItem.maxTotalSourceMs);
    if (exceedsMaterialDurationBudget(item.totalSourceMs, maxTotalSourceMs)) {
      failures.push(
        `${name} customer journey store source time exceeded budget (${formatMs(Number(item.totalSourceMs) || 0)} > ${formatMs(maxTotalSourceMs)})`
      );
    }
  }

  const userJourneyDiagnosisBudget =
    baseline && typeof baseline === 'object' ? baseline.userJourneyDiagnosisBudget || {} : {};
  for (const [name, budgetItem] of Object.entries(userJourneyDiagnosisBudget)) {
    const item = userJourneyDiagnosisSummary[name];
    if (!item || !budgetItem || typeof budgetItem !== 'object') continue;
    const maxBurstyStepCount = Number(budgetItem.maxBurstyStepCount);
    if (Number.isFinite(maxBurstyStepCount) && (Number(item.burstyStepCount) || 0) > maxBurstyStepCount) {
      failures.push(
        `${name} customer journey bursty-step count exceeded budget (${Number(item.burstyStepCount) || 0} > ${maxBurstyStepCount})`
      );
    }
    const maxRepeatedSourceCount = Number(budgetItem.maxRepeatedSourceCount);
    if (
      Number.isFinite(maxRepeatedSourceCount) &&
      (Number(item.repeatedSourceCount) || 0) > maxRepeatedSourceCount
    ) {
      failures.push(
        `${name} customer journey repeated-source count exceeded budget (${Number(item.repeatedSourceCount) || 0} > ${maxRepeatedSourceCount})`
      );
    }
    const maxDominantSourceSharePct = Number(budgetItem.maxDominantSourceSharePct);
    if (
      Number.isFinite(maxDominantSourceSharePct) &&
      (Number(item.dominantSourceSharePct) || 0) > maxDominantSourceSharePct
    ) {
      failures.push(
        `${name} customer journey dominant-source share exceeded budget (${Math.round(Number(item.dominantSourceSharePct) || 0)}% > ${Math.round(maxDominantSourceSharePct)}%)`
      );
    }
  }

  const outcomeSummary =
    result.windowPerfOutcomeSummary && Object.keys(result.windowPerfOutcomeSummary).length
      ? result.windowPerfOutcomeSummary
      : createRuntimeOutcomeCoverageSummary(runtimeSummary);
  const requiredOutcomeCoverage = readRequiredRuntimeOutcomeCoverage(contracts, baseline, runtimeSummary);
  const transitionSummary =
    result.windowPerfTransitionSummary && Object.keys(result.windowPerfTransitionSummary).length
      ? result.windowPerfTransitionSummary
      : createRuntimeStatusTransitionSummary(result.windowPerfEntries);
  const requiredStatusTransitions = readRequiredRuntimeStatusTransitions(
    contracts,
    baseline,
    result.windowPerfEntries
  );
  const recoverySequenceSummary =
    result.windowPerfRecoverySequenceSummary && Object.keys(result.windowPerfRecoverySequenceSummary).length
      ? result.windowPerfRecoverySequenceSummary
      : createRuntimeRecoverySequenceSummary(result.windowPerfEntries);
  const recoveryDebtSummary =
    result.windowPerfRecoveryDebtSummary && Object.keys(result.windowPerfRecoveryDebtSummary).length
      ? result.windowPerfRecoveryDebtSummary
      : createRuntimeRecoveryDebtSummary(result.windowPerfEntries);
  const recoveryHangoverSummary =
    result.windowPerfRecoveryHangoverSummary && Object.keys(result.windowPerfRecoveryHangoverSummary).length
      ? result.windowPerfRecoveryHangoverSummary
      : createRuntimeRecoveryHangoverSummary(result.windowPerfEntries);
  const requiredRecoverySequences = readRequiredRuntimeRecoverySequences(
    contracts,
    baseline,
    result.windowPerfEntries
  );
  for (const [name, requirement] of Object.entries(requiredOutcomeCoverage)) {
    const item = outcomeSummary[name];
    if (!item) {
      failures.push(`Missing runtime outcome coverage metric: ${name}`);
      continue;
    }
    for (const [status, minCount] of Object.entries(requirement || {})) {
      const minimum = Number(minCount) || 0;
      if (minimum < 1) continue;
      const actualCount =
        status === 'ok'
          ? Number(item.okCount) || 0
          : status === 'error'
            ? Number(item.errorCount) || 0
            : status === 'mark'
              ? Number(item.markCount) || 0
              : 0;
      if (actualCount < minimum) {
        failures.push(
          `${name} runtime outcome coverage missing ${status} status (${actualCount} < ${minimum})`
        );
      }
    }
  }
  for (const [name, requirement] of Object.entries(requiredStatusTransitions)) {
    const item = transitionSummary[name];
    if (!item) {
      failures.push(`Missing runtime status transition metric: ${name}`);
      continue;
    }
    for (const [key, minCount] of Object.entries(requirement || {})) {
      const minimum = Number(minCount) || 0;
      if (minimum < 1) continue;
      const actualCount = Number(item.transitionCounts?.[key]) || 0;
      if (actualCount < minimum) {
        failures.push(`${name} runtime status transition missing ${key} (${actualCount} < ${minimum})`);
      }
    }
  }

  for (const [name, requirement] of Object.entries(requiredRecoverySequences)) {
    const item = recoverySequenceSummary[name];
    if (!item) {
      failures.push(`Missing runtime recovery proveout metric: ${name}`);
      continue;
    }
    const minRecoveredCount = Number(requirement?.recoveredCount) || 0;
    if (minRecoveredCount > 0 && (Number(item.recoveredCount) || 0) < minRecoveredCount) {
      failures.push(
        `${name} runtime recovery proveout missing recovered runs (${Number(item.recoveredCount) || 0} < ${minRecoveredCount})`
      );
    }
    const minStableRecoveryCount = Number(requirement?.stableRecoveryCount) || 0;
    if (minStableRecoveryCount > 0 && (Number(item.stableRecoveryCount) || 0) < minStableRecoveryCount) {
      failures.push(
        `${name} runtime recovery proveout missing stable recoveries (${Number(item.stableRecoveryCount) || 0} < ${minStableRecoveryCount})`
      );
    }
    const minCleanRecoveryCount = Number(requirement?.cleanRecoveryCount) || 0;
    if (minCleanRecoveryCount > 0 && (Number(item.cleanRecoveryCount) || 0) < minCleanRecoveryCount) {
      failures.push(
        `${name} runtime recovery proveout missing clean recovery windows (${Number(item.cleanRecoveryCount) || 0} < ${minCleanRecoveryCount})`
      );
    }
    const minPostRecoveryOkStreak = Number(requirement?.minPostRecoveryOkStreak) || 0;
    if (
      minPostRecoveryOkStreak > 0 &&
      (Number(item.maxPostRecoveryOkStreak) || 0) < minPostRecoveryOkStreak
    ) {
      failures.push(
        `${name} runtime recovery proveout missing post-recovery ok streak (${Number(item.maxPostRecoveryOkStreak) || 0} < ${minPostRecoveryOkStreak})`
      );
    }
    const maxRecoverySpanEntries = Number(requirement?.maxRecoverySpanEntries);
    if (
      Number.isFinite(maxRecoverySpanEntries) &&
      maxRecoverySpanEntries >= 0 &&
      (Number(item.maxRecoverySpanEntries) || 0) > maxRecoverySpanEntries
    ) {
      failures.push(
        `${name} runtime recovery proveout exceeded recovery span (${Number(item.maxRecoverySpanEntries) || 0} > ${maxRecoverySpanEntries})`
      );
    }
    const maxUnresolvedCount = Number(requirement?.unresolvedCount);
    if (
      Number.isFinite(maxUnresolvedCount) &&
      maxUnresolvedCount >= 0 &&
      (Number(item.unresolvedCount) || 0) > maxUnresolvedCount
    ) {
      failures.push(
        `${name} runtime recovery proveout left unresolved disruptions (${Number(item.unresolvedCount) || 0} > ${maxUnresolvedCount})`
      );
    }
    const maxRelapseCount = Number(requirement?.maxRelapseCount);
    if (
      Number.isFinite(maxRelapseCount) &&
      maxRelapseCount >= 0 &&
      (Number(item.relapseCount) || 0) > maxRelapseCount
    ) {
      failures.push(
        `${name} runtime recovery proveout relapsed before the clean window closed (${Number(item.relapseCount) || 0} > ${maxRelapseCount})`
      );
    }
    if (Array.isArray(requirement?.requiredRecoveryPaths) && requirement.requiredRecoveryPaths.length) {
      const actualPaths = Array.isArray(item.observedRecoveryPaths) ? item.observedRecoveryPaths : [];
      for (const pathKey of requirement.requiredRecoveryPaths) {
        if (!actualPaths.includes(pathKey)) {
          failures.push(`${name} runtime recovery proveout missing path ${pathKey}`);
        }
      }
    }
  }

  const recoveryDebtBudget =
    baseline && typeof baseline === 'object' ? baseline.runtimeRecoveryDebtBudgetMs || {} : {};
  for (const [name, maxMs] of Object.entries(recoveryDebtBudget)) {
    const item = recoveryDebtSummary[name];
    if (!item || typeof maxMs !== 'number') continue;
    if (exceedsMaterialDurationBudget(item.maxDebtMs, maxMs)) {
      failures.push(
        `${name} runtime recovery debt exceeded budget (${formatMs(Number(item.maxDebtMs) || 0)} > ${formatMs(maxMs)})`
      );
    }
  }
  const recoveryHangoverBudget =
    baseline && typeof baseline === 'object' ? baseline.runtimeRecoveryHangoverBudget || {} : {};
  for (const [name, budgetItem] of Object.entries(recoveryHangoverBudget)) {
    const item = recoveryHangoverSummary[name];
    if (!item || !budgetItem || typeof budgetItem !== 'object') continue;
    const maxP95HangoverRatio = Number(budgetItem.maxP95HangoverRatio);
    if (
      Number.isFinite(maxP95HangoverRatio) &&
      (Number(item.p95HangoverRatio) || 0) > maxP95HangoverRatio &&
      exceedsMaterialDurationBudget(item.p95HangoverDeltaMs, budgetItem.maxP95HangoverDeltaMs)
    ) {
      failures.push(
        `${name} runtime recovery hangover p95 ratio exceeded budget (${Number(item.p95HangoverRatio) || 0}x > ${maxP95HangoverRatio}x)`
      );
    }
    const maxMaxHangoverRatio = Number(budgetItem.maxMaxHangoverRatio);
    if (
      Number.isFinite(maxMaxHangoverRatio) &&
      (Number(item.maxHangoverRatio) || 0) > maxMaxHangoverRatio &&
      exceedsMaterialDurationBudget(item.maxHangoverDeltaMs, budgetItem.maxMaxHangoverDeltaMs)
    ) {
      failures.push(
        `${name} runtime recovery hangover max ratio exceeded budget (${Number(item.maxHangoverRatio) || 0}x > ${maxMaxHangoverRatio}x)`
      );
    }
    const maxP95HangoverDeltaMs = Number(budgetItem.maxP95HangoverDeltaMs);
    if (exceedsMaterialDurationBudget(item.p95HangoverDeltaMs, maxP95HangoverDeltaMs)) {
      failures.push(
        `${name} runtime recovery hangover p95 delta exceeded budget (${formatMs(Number(item.p95HangoverDeltaMs) || 0)} > ${formatMs(maxP95HangoverDeltaMs)})`
      );
    }
    const maxMaxHangoverDeltaMs = Number(budgetItem.maxMaxHangoverDeltaMs);
    if (exceedsMaterialDurationBudget(item.maxHangoverDeltaMs, maxMaxHangoverDeltaMs)) {
      failures.push(
        `${name} runtime recovery hangover max delta exceeded budget (${formatMs(Number(item.maxHangoverDeltaMs) || 0)} > ${formatMs(maxMaxHangoverDeltaMs)})`
      );
    }
    const maxLingeringSettlingCount = Number(budgetItem.maxLingeringSettlingCount);
    if (
      Number.isFinite(maxLingeringSettlingCount) &&
      (Number(item.lingeringSettlingCount) || 0) > maxLingeringSettlingCount
    ) {
      failures.push(
        `${name} runtime recovery hangover lingered after recovery (${Number(item.lingeringSettlingCount) || 0} > ${maxLingeringSettlingCount})`
      );
    }
  }

  const happyPathMetricNames = Array.isArray(contracts.happyPathMetricsWithoutErrors)
    ? contracts.happyPathMetricsWithoutErrors
    : happyPathMetricsWithoutErrors;
  for (const name of happyPathMetricNames) {
    const item = runtimeSummary[name];
    if (!item) continue;
    if ((item.errorCount || 0) > 0) {
      failures.push(`${name} recorded runtime errors in happy-path flow (${item.errorCount})`);
    }
  }

  const actionSummary = createProjectActionSummary(result.projectActionEvents);
  const requiredActions = Array.isArray(baseline?.requiredProjectActions)
    ? baseline.requiredProjectActions
    : Array.isArray(contracts.requiredProjectActions)
      ? contracts.requiredProjectActions
      : requiredProjectActions;
  for (const action of requiredActions) {
    const item = actionSummary[action];
    if (!item || item.count < 1) {
      failures.push(`Missing project action event: ${action}`);
      continue;
    }
    if (item.okCount < 1) {
      failures.push(`Project action did not complete successfully: ${action}`);
    }
  }

  const stateIntegritySummary =
    result.stateIntegritySummary && Object.keys(result.stateIntegritySummary).length
      ? result.stateIntegritySummary
      : createStateIntegritySummary(result.stateIntegrityChecks);
  const requiredStateChecks = Array.isArray(baseline?.requiredStateIntegrityChecks)
    ? baseline.requiredStateIntegrityChecks
    : [];
  for (const name of requiredStateChecks) {
    const item = stateIntegritySummary[name];
    if (!item) {
      failures.push(`Missing state integrity check: ${name}`);
      continue;
    }
    if (item.ok !== true) {
      failures.push(`State integrity check failed: ${name}`);
    }
  }
  for (const [name, item] of Object.entries(stateIntegritySummary)) {
    if (item?.ok === false && !requiredStateChecks.includes(name)) {
      failures.push(`State integrity check failed: ${name}`);
    }
  }

  const issueSummary = createRuntimeIssueSummary(result.runtimeIssues);
  if (issueSummary.totalCount > 0) {
    failures.push(
      `Runtime issues detected (pageErrors=${issueSummary.pageErrors.length}, consoleErrors=${issueSummary.consoleErrors.length})`
    );
  }

  return failures;
}
