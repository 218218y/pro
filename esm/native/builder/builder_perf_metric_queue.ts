import type { AppContainer } from '../../../types/index.js';

export type BuilderPerfMetric = {
  name: string;
  metricValue: number;
  metricUnit: 'ms' | 'score' | 'count';
  detail?: unknown;
};

const pendingMetricsByApp = new WeakMap<object, BuilderPerfMetric[]>();

export function enqueueBuilderPerfMetric(App: AppContainer, metric: BuilderPerfMetric): void {
  const key = App as object;
  const pending = pendingMetricsByApp.get(key);
  if (pending) pending.push(metric);
  else pendingMetricsByApp.set(key, [metric]);
}

export function drainBuilderPerfMetrics(App: AppContainer): BuilderPerfMetric[] {
  const key = App as object;
  const pending = pendingMetricsByApp.get(key) || [];
  pendingMetricsByApp.delete(key);
  return pending;
}
