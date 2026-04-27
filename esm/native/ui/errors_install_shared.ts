import type {
  AppContainer,
  ErrorsContextInputLike,
  ErrorsHistoryEntryLike,
  ErrorsServiceLike,
  UnknownRecord,
} from '../../../types';

import { ctxToLabel, asObj } from './errors_install_support.js';
import { ensureErrorsService, ensurePlatformRootSurface } from '../services/api.js';

export type ErrorContext = ErrorsContextInputLike;
export type ErrorHistoryEntry = ErrorsHistoryEntryLike;
export type AppErrorsSurface = ErrorsServiceLike;

export type ReportErrorFn = ((err: unknown, ctx?: ErrorContext) => void) & {
  __wpErrorsSurfaceWrapped?: boolean;
  __wpPrev?: unknown;
};

export type PlatformSurfaceLike = UnknownRecord & {
  reportError?: unknown;
};

export function isReportErrorFn(value: unknown): value is ReportErrorFn {
  return typeof value === 'function';
}

function isAppErrorsSurface(value: unknown): value is AppErrorsSurface {
  return !!asObj(value);
}

function isPlatformSurfaceLike(value: unknown): value is PlatformSurfaceLike {
  return !!asObj(value);
}

export function readErrorsSurface(value: unknown): AppErrorsSurface | null {
  return isAppErrorsSurface(value) ? value : null;
}

export function ensureErrorsSurface(App: AppContainer): AppErrorsSurface | null {
  try {
    return readErrorsSurface(ensureErrorsService(App));
  } catch {
    return null;
  }
}

export function platformSurface(App: AppContainer): PlatformSurfaceLike | null {
  try {
    const surface = ensurePlatformRootSurface(App);
    return isPlatformSurfaceLike(surface) ? surface : null;
  } catch {
    return null;
  }
}

export function buildErrorsDebugSnapshotFallback(ctx?: ErrorContext) {
  return {
    ts: '',
    where: ctxToLabel(ctx),
    fatal: false,
    error: { name: '', message: '', stack: '' },
    buildTags: {},
    flags: {},
    config: {},
    userAgent: '',
    mode: '',
    state: null,
    history: [],
  };
}
