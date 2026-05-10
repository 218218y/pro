// Error reporting (Pure ESM)
//
// Goals:
// - Reduce try/catch noise across layers.
// - Never rely on implicit globals (window/App/globalThis).
// - Reporting must never throw (best-effort by nature).

import { readRuntimeScalarOrDefaultFromApp } from './runtime_selectors.js';
import { asRecord } from './record.js';

export type ReportErrorFn = (err: unknown, ctx?: unknown) => void;

export type ReportErrorOptions = {
  /**
   * Keep true for unexpected internal failures. Set false for expected browser/user-operation
   * failures where diagnostics should be captured when a reporter exists, without noisy console output.
   */
  consoleFallback?: boolean;
};

const DEFAULT_VERBOSE_CONSOLE_ERRORS = true;
const DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS = 4000;

const __consoleDedupeMap = new Map<string, number>();

type ErrorWithCause = Error & { cause?: unknown };

function __shouldConsoleLogOnce(key: string, dedupeMs: number): boolean {
  try {
    const now = Date.now();
    const last = __consoleDedupeMap.get(key) || 0;
    if (now - last < Math.max(0, Number(dedupeMs) || 0)) return false;
    __consoleDedupeMap.set(key, now);
    return true;
  } catch {
    return true;
  }
}

export function toError(err: unknown): Error {
  if (err instanceof Error) return err;
  const e: ErrorWithCause = new Error(toErrorMessage(err));
  try {
    e.cause = err;
  } catch {
    // ignore
  }
  return e;
}

function __consoleWarnDedup(tag: string, err: unknown, dedupeMs = DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS) {
  try {
    const msg = toErrorMessage(err);
    const key = `${tag}::${msg}`;
    if (!__shouldConsoleLogOnce(key, dedupeMs)) return;
    console.warn(tag, err);
  } catch {
    // ignore
  }
}

function asObject(x: unknown): Record<string, unknown> | null {
  return asRecord<Record<string, unknown>>(x);
}

function isReportErrorFn(value: unknown): value is ReportErrorFn {
  return typeof value === 'function';
}

function bindReportErrorFn(owner: Record<string, unknown> | null, key: string): ReportErrorFn | null {
  const fn = owner ? owner[key] : null;
  if (!isReportErrorFn(fn)) return null;
  return (err: unknown, ctx?: unknown): void => {
    Reflect.apply(fn, owner, [err, ctx]);
  };
}

export function getReportError(App: unknown): ReportErrorFn | null {
  const A = asObject(App);
  const services = A ? asObject(A['services']) : null;
  const platformService = services ? asObject(services['platform']) : null;
  const platformRoot = A ? asObject(A['platform']) : null;
  const errorsService = services ? asObject(services['errors']) : null;
  return (
    bindReportErrorFn(platformService, 'reportError') ??
    bindReportErrorFn(platformRoot, 'reportError') ??
    bindReportErrorFn(errorsService, 'report')
  );
}

export function toErrorMessage(err: unknown): string {
  try {
    if (err == null) return '';
    if (typeof err === 'string') return err;
    if (typeof err === 'number' || typeof err === 'boolean' || typeof err === 'bigint') return String(err);

    const rec = asObject(err);
    if (rec) {
      if (typeof rec.message === 'string') return rec.message;
      if (typeof rec.name === 'string' && typeof rec.stack === 'string') return rec.stack;
    }

    return String(err);
  } catch {
    return '';
  }
}

export function reportError(
  App: unknown,
  err: unknown,
  ctx?: unknown,
  opts?: ReportErrorOptions | null
): void {
  try {
    const rep = getReportError(App);
    if (rep) {
      try {
        rep(err, ctx);
        return;
      } catch {
        // Fall through to console logging.
      }
    }

    if (opts?.consoleFallback === false) return;

    const verbose = !!readRuntimeScalarOrDefaultFromApp(
      App,
      'verboseConsoleErrors',
      DEFAULT_VERBOSE_CONSOLE_ERRORS
    );
    if (!verbose) return;

    const dedupeRaw = readRuntimeScalarOrDefaultFromApp(
      App,
      'verboseConsoleErrorsDedupeMs',
      DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS
    );

    const dedupeMs =
      typeof dedupeRaw === 'number' && Number.isFinite(dedupeRaw)
        ? Math.max(0, dedupeRaw)
        : DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS;

    __consoleWarnDedup('[WardrobePro][error]', err, dedupeMs);
  } catch {
    // Reporting must never throw.
  }
}

/**
 * Return whether the app requests "fail fast" behavior.
 *
 * Canonical: store.runtime.failFast (Zustand store). No root-slot flags.
 */
export function shouldFailFast(App: unknown): boolean {
  try {
    return !!readRuntimeScalarOrDefaultFromApp(App, 'failFast', false);
  } catch {
    return false;
  }
}
