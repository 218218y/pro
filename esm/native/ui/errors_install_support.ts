import type {
  AppContainer,
  ErrorsContextInputLike,
  ErrorsContextLike,
  ErrorsDebugSnapshotLike,
  ErrorsHistoryEntryLike,
  ErrorsInfoLike,
  RootStateLike,
  UnknownRecord,
} from '../../../types';

import { normalizeUnknownError, normalizeUnknownErrorInfo } from '../services/api.js';
import {
  readRootStateFromStore,
  getUserAgentMaybe,
  runPlatformWakeupFollowThrough,
  getStoreSurfaceMaybe,
  getConfigRootMaybe,
  getBuildTagsSnapshot,
} from '../services/api.js';

export type ErrorContextRecord = ErrorsContextLike;
export type ErrorContext = ErrorsContextInputLike;
export type ErrorInfo = ErrorsInfoLike;
export type ErrorHistoryEntry = ErrorsHistoryEntryLike;
export type DebugSnapshot = ErrorsDebugSnapshotLike;
export type ReportNonFatalFn = (op: string, err: unknown, throttleMs?: number) => void;

export function isObj(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object';
}

export function asObj(x: unknown): UnknownRecord | null {
  return isObj(x) ? x : null;
}

export function silentConsoleForApp(App: AppContainer): boolean {
  try {
    const ua = getUserAgentMaybe(App) || '';
    return typeof ua === 'string' && ua.indexOf('unit-test') !== -1;
  } catch {
    return false;
  }
}

export function shouldIgnoreErrorMessage(msg: unknown): boolean {
  try {
    if (typeof msg !== 'string') return false;
    return (
      msg.indexOf('ResizeObserver loop completed') !== -1 ||
      msg.indexOf('ResizeObserver loop limit exceeded') !== -1
    );
  } catch {
    return false;
  }
}

export function ctxFatal(ctx: ErrorContext): boolean {
  if (!ctx || typeof ctx !== 'object') return false;
  return !!ctx.fatal;
}

export function fatalCtx(where: string): ErrorContextRecord {
  return { where, fatal: true };
}

export function nowIso(): string {
  try {
    return new Date().toISOString();
  } catch {
    return '';
  }
}

export function formatErrorInfo(err: unknown): ErrorInfo {
  try {
    const normalized = normalizeUnknownErrorInfo(err, 'Unexpected error');
    return {
      name: typeof normalized.name === 'string' ? normalized.name : '',
      message: normalized.message,
      stack: typeof normalized.stack === 'string' ? normalized.stack : '',
    };
  } catch {
    return { name: '', message: '', stack: '' };
  }
}

export function ctxToObj(ctx: ErrorContext): ErrorContextRecord {
  if (!ctx) return {};
  if (typeof ctx === 'string') return { where: ctx };
  return typeof ctx === 'object' ? ctx : { where: String(ctx) };
}

function readStateSlice(rec: RootStateLike | null, key: 'runtime' | 'config'): UnknownRecord | null {
  if (!rec) return null;
  return asObj(rec[key]);
}

export function ctxToLabel(ctx: ErrorContext): string {
  try {
    if (!ctx) return '';
    if (typeof ctx === 'string') return ctx;
    if (typeof ctx === 'object') {
      const w = ctx.where ? String(ctx.where) : '';
      const op = ctx.op ? String(ctx.op) : '';
      const tag = ctx.tag ? String(ctx.tag) : '';
      const parts = [w, op, tag].filter(Boolean);
      return parts.join(' / ');
    }
    return String(ctx);
  } catch {
    return '';
  }
}

function safeGetState(App: AppContainer): RootStateLike | null {
  try {
    return readRootStateFromStore(getStoreSurfaceMaybe(App));
  } catch {
    return null;
  }
}

function runtimeFlags(rt: UnknownRecord | null): UnknownRecord {
  return {
    failFast: rt?.failFast,
    debug: rt?.debug,
    verboseConsoleErrors: rt?.verboseConsoleErrors,
    verboseConsoleErrorsDedupeMs: rt?.verboseConsoleErrorsDedupeMs,
  };
}

export function buildErrorsDebugSnapshot(App: AppContainer, err: unknown, ctx: ErrorContext): DebugSnapshot {
  const st = safeGetState(App);
  const rt = readStateSlice(st, 'runtime');
  const cfg = readStateSlice(st, 'config');

  const snapshot: DebugSnapshot = {
    ts: nowIso(),
    where: ctxToLabel(ctx),
    fatal: ctxFatal(ctx),
    error: formatErrorInfo(err),
    buildTags: getBuildTagsSnapshot(App),
    flags: runtimeFlags(rt),
    config: cfg || {},
    configStatic: asObj(getConfigRootMaybe(App)) || {},
    userAgent: '',
    mode: '',
    state: null,
  };

  try {
    snapshot.userAgent = getUserAgentMaybe(App) || '';
  } catch {
    snapshot.userAgent = '';
  }

  try {
    const stRec = asObj(st);
    const modeRec = stRec ? asObj(stRec.mode) : null;
    snapshot.mode = modeRec && typeof modeRec.primary === 'string' ? String(modeRec.primary) : '';
  } catch {
    snapshot.mode = '';
  }

  try {
    snapshot.state = st;
  } catch {
    snapshot.state = null;
  }

  return snapshot;
}

export function createErrorsInstallReportNonFatal(App: AppContainer): ReportNonFatalFn {
  const seen = new Map<string, number>();
  return function reportNonFatal(op: string, err: unknown, throttleMs = 4000): void {
    try {
      const now = Date.now();
      const last = seen.get(op) ?? 0;
      if (throttleMs > 0 && now - last < throttleMs) return;
      seen.set(op, now);
    } catch (_seenErr) {
      try {
        console.error('[WardrobePro][errors_install][reportNonFatal]', _seenErr);
      } catch {}
    }
    try {
      if (silentConsoleForApp(App)) return;
    } catch {}
    try {
      console.warn('[WardrobePro][errors_install][reportNonFatal]', op, err);
    } catch {}
  };
}

export function pushErrorHistory(
  history: ErrorHistoryEntry[],
  kind: string,
  err: unknown,
  ctx: ErrorContext,
  reportNonFatal: ReportNonFatalFn,
  historyMax = 30
): void {
  try {
    history.push({ ts: nowIso(), kind: String(kind || ''), ctx: ctxToObj(ctx), err: formatErrorInfo(err) });
    if (history.length > historyMax) history.splice(0, history.length - historyMax);
  } catch (pushErr) {
    reportNonFatal('pushHistory', pushErr, 6000);
  }
}

export function consoleReportError(
  App: AppContainer,
  err: unknown,
  ctx: ErrorContext,
  reportNonFatal: ReportNonFatalFn
): void {
  if (silentConsoleForApp(App)) return;
  try {
    const label = ctxToLabel(ctx);
    const f = formatErrorInfo(err);
    const head = label ? `[WardrobePro][error] ${label}` : '[WardrobePro][error]';
    if (f.stack) console.error(head + '\n' + f.stack);
    else console.error(head, f.message || err);
  } catch (consoleErr) {
    reportNonFatal('consoleReport', consoleErr, 6000);
  }
}

export function ensureErrorsRenderLoopBestEffort(App: AppContainer, reportNonFatal: ReportNonFatalFn): void {
  void reportNonFatal;
  runPlatformWakeupFollowThrough(App, { touchActivity: false });
}

export function readWindowErrorMessage(ev: unknown): string {
  try {
    const eventLike = asObj(ev);
    if (!eventLike) return '';
    const directMessage = typeof eventLike.message === 'string' ? eventLike.message.trim() : '';
    if (directMessage) return directMessage;
    return normalizeUnknownError(eventLike.error ?? ev).message;
  } catch {
    return '';
  }
}

export function readWindowErrorValue(ev: unknown): unknown {
  const eventLike = asObj(ev);
  return eventLike?.error || ev;
}

export function readWindowRejectionMessage(ev: unknown): string {
  try {
    const eventLike = asObj(ev);
    if (!eventLike) return '';
    return normalizeUnknownError(eventLike.reason ?? ev).message;
  } catch {
    return '';
  }
}

export function readWindowRejectionValue(ev: unknown): unknown {
  const eventLike = asObj(ev);
  return eventLike?.reason ?? ev;
}
