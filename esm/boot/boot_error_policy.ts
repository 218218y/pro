export type BootErrorPolicySoftMeta = {
  op: string;
  group?: string;
  throttleMs?: number;
};

export type BootErrorPolicyReportMeta = {
  op: string;
  group?: string;
};

export type BootErrorPolicyReportOpts = {
  win?: Window | null;
  failFast?: boolean;
};

export type BootErrorPolicyConfig = {
  scope: string;
  defaultReportGroup: string;
  defaultSoftGroup?: string;
  formatReportMessage?: (group: string, op: string) => string;
  formatSoftWarnMessage?: (group: string, op: string) => string;
};

export type BootErrorPolicy = {
  softWarn: (err: unknown, meta: BootErrorPolicySoftMeta) => void;
  shouldFailFast: (win: Window | null | undefined) => boolean;
  reportBestEffort: (err: unknown, meta: BootErrorPolicyReportMeta, opts?: BootErrorPolicyReportOpts) => void;
};

function __toError(err: unknown, fallbackMessage: string): Error {
  return err instanceof Error ? err : new Error(String(err ?? fallbackMessage));
}

function getLocationSearch(win: Window | null | undefined): string {
  if (!win) return '';
  const location = win.location;
  return location && typeof location.search === 'string' ? location.search : '';
}

function getLocalStorage(win: Window | null | undefined): Storage | null {
  if (!win) return null;
  return win.localStorage || null;
}

export function createBootErrorPolicy(cfg: BootErrorPolicyConfig): BootErrorPolicy {
  const scope = String(cfg && cfg.scope ? cfg.scope : 'boot');
  const defaultReportGroup = String(cfg && cfg.defaultReportGroup ? cfg.defaultReportGroup : scope || 'boot');
  const defaultSoftGroup = String(
    cfg && cfg.defaultSoftGroup ? cfg.defaultSoftGroup : scope || defaultReportGroup || 'boot'
  );
  const softWarnLastAt = new Map<string, number>();

  const formatReportMessage =
    cfg && typeof cfg.formatReportMessage === 'function'
      ? cfg.formatReportMessage
      : (group: string, op: string) => `[WardrobePro][${group}] ${op}`;
  const formatSoftWarnMessage =
    cfg && typeof cfg.formatSoftWarnMessage === 'function'
      ? cfg.formatSoftWarnMessage
      : (group: string, op: string) => `[WardrobePro][${group}] ${op}`;

  function softWarn(err: unknown, meta: BootErrorPolicySoftMeta): void {
    const op = meta && meta.op ? String(meta.op) : 'unknown';
    const group = meta && meta.group ? String(meta.group) : defaultSoftGroup;
    const throttleMs =
      meta && typeof meta.throttleMs === 'number' && Number.isFinite(meta.throttleMs)
        ? Number(meta.throttleMs)
        : 0;
    if (throttleMs > 0) {
      const key = `${group}:${op}`;
      const now = Date.now();
      const prev = softWarnLastAt.get(key) || 0;
      if (now - prev < throttleMs) return;
      softWarnLastAt.set(key, now);
    }
    try {
      if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn(formatSoftWarnMessage(group, op), err);
      }
    } catch {
      // ignore console/clock failures in boot soft warnings
    }
  }

  function shouldFailFast(win: Window | null | undefined): boolean {
    // IMPORTANT:
    // This helper intentionally avoids reading implicit globals (window/globalThis).
    // Callers should pass an explicit browser window from entry/UI layers.
    try {
      const search = getLocationSearch(win);
      if (search) {
        const p = new URLSearchParams(search);
        const raw = p.get('failFast');
        if (raw === '1' || raw === 'true') return true;
      }
    } catch (err) {
      softWarn(err, { op: 'shouldFailFast.queryParams', throttleMs: 1000 });
    }
    try {
      const ls = getLocalStorage(win);
      const raw = ls ? ls.getItem('WP_FAIL_FAST') || ls.getItem('failFast') : null;
      if (raw === '1' || raw === 'true') return true;
    } catch (err) {
      softWarn(err, { op: 'shouldFailFast.localStorage', throttleMs: 1000 });
    }
    return false;
  }

  function reportBestEffort(
    err: unknown,
    meta: BootErrorPolicyReportMeta,
    opts: BootErrorPolicyReportOpts = {}
  ): void {
    const group = meta && meta.group ? String(meta.group) : defaultReportGroup;
    const op = meta && meta.op ? String(meta.op) : 'unknown';
    try {
      if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
        console.warn(formatReportMessage(group, op), err);
      }
    } catch {
      // ignore console failures while reporting boot issues
    }
    if (opts.failFast || shouldFailFast(opts.win)) {
      throw __toError(err, `${group}.${op}`);
    }
  }

  return {
    softWarn,
    shouldFailFast,
    reportBestEffort,
  };
}
