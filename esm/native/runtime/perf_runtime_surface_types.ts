export type PerfEntryOptions = {
  detail?: unknown;
  status?: 'ok' | 'error' | 'mark';
  error?: unknown;
};

export type PerfSpanOptions = {
  detail?: unknown;
};

export type PerfActionOptions<T> = PerfSpanOptions & {
  resolveEndOptions?: ((result: T) => PerfEntryOptions | void) | undefined;
};
