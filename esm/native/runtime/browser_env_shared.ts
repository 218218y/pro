// Shared browser environment helpers for Pure ESM.
//
// Goals:
// - Keep direct browser/global reads behind typed seams.
// - Support DI-first access via app.deps.browser.
// - Avoid side-effects on import.

import { assertApp, asObject } from './assert.js';

import type {
  BrowserClearIntervalLike,
  BrowserClearTimeoutLike,
  BrowserDeps,
  BrowserSetIntervalLike,
  BrowserSetTimeoutLike,
  BrowserTimerCallback,
  IntervalHandleLike,
  TimeoutHandleLike,
} from '../../../types';

export type UnknownBag = Record<string, unknown>;
export type SetTimeoutLike = BrowserSetTimeoutLike;
export type ClearTimeoutLike = BrowserClearTimeoutLike;
export type SetIntervalLike = BrowserSetIntervalLike;
export type ClearIntervalLike = BrowserClearIntervalLike;
export type TimerCallback = BrowserTimerCallback;
export type RequestAnimationFrameLike = (cb: FrameRequestCallback) => number;
export type CancelAnimationFrameLike = (handle: number) => void;
export type RequestIdleCallbackLike = (cb: IdleRequestCallback, opts?: IdleRequestOptions) => number;
export type QueueMicrotaskLike = (cb: () => void) => void;
export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type WindowExtrasLike = {
  requestIdleCallback?: RequestIdleCallbackLike;
  queueMicrotask?: QueueMicrotaskLike;
  performance?: { now?: () => number } | null;
  fetch?: FetchLike;
};

export type WindowWithExtrasLike = Window & WindowExtrasLike;
export type GlobalScopeLike = UnknownBag & {
  setTimeout?: SetTimeoutLike;
  clearTimeout?: ClearTimeoutLike;
  setInterval?: SetIntervalLike;
  clearInterval?: ClearIntervalLike;
  queueMicrotask?: QueueMicrotaskLike;
  fetch?: FetchLike;
};
export type ZeroArgReader = () => unknown;
export type AnyCallable = (...args: never[]) => unknown;
export type GlobalScopeReader = () => unknown;

export function asRecord(x: unknown): UnknownBag | null {
  return asObject<UnknownBag>(x);
}

export function isObjectLike(v: unknown): v is object {
  return !!v && (typeof v === 'object' || typeof v === 'function');
}

export function isDocumentLike(value: unknown): value is Document {
  const rec = asRecord(value);
  return !!rec && typeof rec.createElement === 'function' && typeof rec.querySelector === 'function';
}

export function isNavigatorLike(value: unknown): value is Navigator {
  const rec = asRecord(value);
  return !!rec && typeof rec.userAgent === 'string';
}

export function isWindowLike(value: unknown): value is WindowWithExtrasLike {
  const rec = asRecord(value);
  return (
    !!rec && isDocumentLike(rec.document) && isNavigatorLike(rec.navigator) && isObjectLike(rec.location)
  );
}

export function getBrowserSurfaceMaybe(app: unknown): UnknownBag | null {
  const r = asRecord(app);
  return r ? asRecord(r['browser']) : null;
}

export function bindCallable<TArgs extends unknown[], TResult>(
  value: unknown,
  thisArg: unknown
): ((...args: TArgs) => TResult) | null {
  if (typeof value !== 'function') return null;
  return (...args: TArgs): TResult => Reflect.apply(value, thisArg, args);
}

export function readBrowserSurfaceReader(surface: UnknownBag | null, name: string): ZeroArgReader | null {
  return bindCallable<[], unknown>(surface ? surface[name] : undefined, surface);
}

export function asWindowExtras(w: Window | null): WindowWithExtrasLike | null {
  return isWindowLike(w) ? w : null;
}

export function asGlobalScope(value: unknown): GlobalScopeLike | null {
  return asRecord(value);
}

export function getBrowserDeps(app: unknown): Partial<BrowserDeps> | null {
  const A = assertApp(app, 'runtime/browser_env');
  const r = asRecord(A);
  const deps = r ? asRecord(r['deps']) : null;
  const browser = deps ? deps['browser'] : null;
  return asObject<Partial<BrowserDeps>>(browser) || null;
}

export function readGlobalScopeCandidate(reader: GlobalScopeReader): GlobalScopeLike | null {
  try {
    const value = reader();
    return isObjectLike(value) ? asGlobalScope(value) : null;
  } catch {
    return null;
  }
}

export function getGlobalScopeMaybe(): GlobalScopeLike | null {
  return readGlobalScopeCandidate(() => Function('return this')());
}

export function readGlobalFn<T extends AnyCallable>(
  name: string
): ((...args: Parameters<T>) => ReturnType<T>) | null {
  try {
    const g = getGlobalScopeMaybe();
    return bindCallable<Parameters<T>, ReturnType<T>>(g ? g[name] : null, g);
  } catch {
    return null;
  }
}

export type { IntervalHandleLike, TimeoutHandleLike };
