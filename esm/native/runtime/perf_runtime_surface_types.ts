export type PerfTimingKind =
  'action' | 'phase' | 'interaction-wait' | 'render-settle' | 'browser-metric' | 'mark';

export type PerfMetricUnit = 'ms' | 'score' | 'count';

export type PerfEntryOptions = {
  detail?: unknown;
  status?: 'ok' | 'error' | 'mark';
  error?: unknown;
  metricValue?: number;
  metricUnit?: PerfMetricUnit;
};

export type PerfSpanOptions = {
  detail?: unknown;
  kind?: Exclude<PerfTimingKind, 'browser-metric' | 'mark'>;
  phase?: string;
  parentId?: string;
};

export type PerfActionOptions<T> = PerfSpanOptions & {
  resolveEndOptions?: ((result: T) => PerfEntryOptions | void) | undefined;
  settleAfterRender?: boolean | string;
};
