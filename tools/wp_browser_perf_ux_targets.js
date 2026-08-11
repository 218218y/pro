/**
 * Product UX targets are intentionally independent from the generated regression baseline.
 *
 * The regression baseline answers "did this build get materially worse than the measured
 * reference run?". These targets answer "is the experience inside the desired UX envelope?".
 * They must never be widened automatically by baseline regeneration.
 */
export const BROWSER_PERF_UX_TARGETS = Object.freeze({
  cls: Object.freeze({ max: 0.1, unit: 'score' }),
  lcp: Object.freeze({ max: 2500, unit: 'ms' }),
  inp: Object.freeze({ max: 200, unit: 'ms' }),
});

function readFiniteNonNegative(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function readMetricValue(browserMetrics, metricName) {
  if (!browserMetrics || typeof browserMetrics !== 'object') return null;
  if (metricName === 'cls') return readFiniteNonNegative(browserMetrics.cls?.value);
  if (metricName === 'lcp') return readFiniteNonNegative(browserMetrics.lcp?.valueMs);
  if (metricName === 'inp') {
    const value = readFiniteNonNegative(browserMetrics.inp?.valueMs);
    const entryCount = readFiniteNonNegative(browserMetrics.inp?.entryCount);
    const source = String(browserMetrics.inp?.source || '').trim();
    return value != null && value > 0 && entryCount != null && entryCount >= 1 && source && source !== 'none'
      ? value
      : null;
  }
  return null;
}

export function createBrowserPerfUxTargetSummary(browserMetrics, targets = BROWSER_PERF_UX_TARGETS) {
  const summary = {};
  for (const metricName of Object.keys(targets)) {
    const target = targets[metricName];
    if (!target || typeof target !== 'object') continue;
    const max = readFiniteNonNegative(target.max);
    if (max == null) continue;
    const value = readMetricValue(browserMetrics, metricName);
    summary[metricName] = Object.freeze({
      value,
      max,
      unit: typeof target.unit === 'string' ? target.unit : '',
      status: value == null ? 'unmeasured' : value <= max ? 'met' : 'missed',
      gap: value == null ? null : Math.max(0, value - max),
    });
  }
  return Object.freeze(summary);
}
