import { MODES } from '../runtime/api.js';

import type { TimeoutHandleLike, UnknownRecord } from '../../../types';

export type PlatformTask = () => unknown;
export type PlatformArgList = unknown[];
export type PlatformVariadicTask<Args extends PlatformArgList = PlatformArgList> = (...args: Args) => unknown;
export type DebounceOptions = { leading?: boolean; trailing?: boolean } & UnknownRecord;
export type VerboseRuntimeLike = {
  verboseConsoleErrors?: boolean;
  verboseConsoleErrorsDedupeMs?: number;
  debug?: boolean;
};
export type DepsFlagsLike = UnknownRecord & VerboseRuntimeLike;
export type ModeConstKey = 'NONE' | 'MANUAL_LAYOUT';
export type PlatformVerboseCfg = { enabled: boolean; dedupeMs: number };
export type PlatformReportErrorLike = (e: unknown, c?: unknown) => void;
export type PlatformPerfLike = UnknownRecord & {
  hasInternalDrawers?: boolean;
  perfFlagsDirty?: boolean;
};
export type LocalStorageLike = { getItem: (key: string) => unknown } & UnknownRecord;
export type WindowSearchLike = { location?: { search?: unknown }; localStorage?: unknown } & UnknownRecord;
export type BuildUiSurfaceLike = UnknownRecord & {
  raw?: UnknownRecord;
  width?: unknown;
  height?: unknown;
  depth?: unknown;
  doors?: unknown;
  w?: unknown;
  h?: unknown;
  d?: unknown;
};
export type RequestIdleInvoker = ((cb: () => void, options?: { timeout: number }) => unknown) | null;
export type PlatformUtilInstallDeps = {
  getVerboseCfg: () => PlatformVerboseCfg;
  isDebugOn: () => boolean;
  setTimeoutFn: (cb: () => void, ms?: number) => TimeoutHandleLike;
  clearTimeoutFn: (handle: TimeoutHandleLike) => void;
  requestAnimationFrameFn: (cb: (ts?: number) => void) => unknown;
  requestIdleCallbackFn: RequestIdleInvoker;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object';
}

export function getErrorStack(err: unknown): string | null {
  if (!err || typeof err !== 'object' || !('stack' in err)) return null;
  const stack = Reflect.get(err, 'stack');
  return typeof stack === 'string' && stack ? stack : null;
}

export function getModeConst(key: ModeConstKey, defaultValue: string): string {
  const modes: unknown = MODES;
  if (!isRecord(modes)) return defaultValue;
  const value = modes[key];
  return typeof value === 'string' && value ? value : defaultValue;
}

export function readPlatformReportError(value: unknown): PlatformReportErrorLike | null {
  if (typeof value !== 'function') return null;
  return (e: unknown, c?: unknown) => {
    Reflect.apply(value, undefined, [e, c]);
  };
}

export function readWindowSearch(value: unknown): WindowSearchLike | null {
  return isRecord(value) ? value : null;
}

export function readLocalStorage(value: unknown): LocalStorageLike | null {
  if (!isRecord(value) || typeof value.getItem !== 'function') return null;
  const getItem = value.getItem;
  return {
    ...value,
    getItem(key: string) {
      return Reflect.apply(getItem, value, [key]);
    },
  };
}

export function readBuildUiSurface(value: unknown): BuildUiSurfaceLike {
  const ui: BuildUiSurfaceLike = isRecord(value) ? { ...value } : {};
  ui.raw = isRecord(ui.raw) ? ui.raw : {};
  return ui;
}

export function ensurePlatformPerf(value: unknown): PlatformPerfLike {
  return isRecord(value) ? { ...value } : {};
}

export const WP_DEFAULT_VERBOSE_CONSOLE_ERRORS = true;
export const WP_DEFAULT_VERBOSE_CONSOLE_ERRORS_DEDUPE_MS = 4000;

const __wpConsoleErrorSeen = new Map<string, number>();

function __wpConsoleErrorKey(err: unknown, ctx?: unknown): string {
  const stack = getErrorStack(err) || '';
  const msg = stack ? stack.split('\n')[0] : String(err);
  return `${String(ctx || '')}::${msg}`;
}

export function shouldConsoleLogOnce(err: unknown, ctx?: unknown, dedupeMs?: unknown): boolean {
  const ms = typeof dedupeMs === 'number' && isFinite(dedupeMs) && dedupeMs > 0 ? dedupeMs : 0;
  if (!ms) return true;
  const now = Date.now();
  const key = __wpConsoleErrorKey(err, ctx);
  const prev = __wpConsoleErrorSeen.get(key) || 0;
  if (prev && now - prev < ms) return false;
  __wpConsoleErrorSeen.set(key, now);
  if (__wpConsoleErrorSeen.size > 600) {
    for (const [k, ts] of __wpConsoleErrorSeen) {
      if (now - ts > ms * 4) __wpConsoleErrorSeen.delete(k);
    }
  }
  return true;
}
