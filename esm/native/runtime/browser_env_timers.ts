import type { BrowserDeps } from '../../../types';

import {
  asWindowExtras,
  bindCallable,
  getBrowserDeps,
  readGlobalFn,
  type AnyCallable,
  type CancelAnimationFrameLike,
  type ClearIntervalLike,
  type ClearTimeoutLike,
  type FetchLike,
  type IntervalHandleLike,
  type QueueMicrotaskLike,
  type RequestAnimationFrameLike,
  type RequestIdleCallbackLike,
  type SetIntervalLike,
  type SetTimeoutLike,
  type TimeoutHandleLike,
  type TimerCallback,
} from './browser_env_shared.js';
import { getWindowMaybe } from './browser_env_surface.js';

export type BrowserTimersLike = {
  setTimeout: SetTimeoutLike;
  clearTimeout: ClearTimeoutLike;
  setInterval: SetIntervalLike;
  clearInterval: ClearIntervalLike;
  requestAnimationFrame: RequestAnimationFrameLike;
  cancelAnimationFrame: CancelAnimationFrameLike;
  queueMicrotask?: QueueMicrotaskLike;
  now: () => number;
};

function readTimerFn<T extends AnyCallable>(
  browser: Partial<BrowserDeps> | null,
  name: keyof BrowserDeps
): ((...args: Parameters<T>) => ReturnType<T>) | null {
  try {
    return bindCallable<Parameters<T>, ReturnType<T>>(browser ? browser[name] : null, browser);
  } catch {
    return null;
  }
}

export function requestAnimationFrameMaybe(app: unknown): RequestAnimationFrameLike | null {
  try {
    const browser = getBrowserDeps(app);
    const raf = browser?.requestAnimationFrame;
    if (typeof raf === 'function') return raf;
  } catch {
    // swallow
  }

  const w = getWindowMaybe(app);
  return w && typeof w.requestAnimationFrame === 'function' ? w.requestAnimationFrame.bind(w) : null;
}

export function cancelAnimationFrameMaybe(app: unknown): CancelAnimationFrameLike | null {
  try {
    const browser = getBrowserDeps(app);
    const caf = browser?.cancelAnimationFrame;
    if (typeof caf === 'function') return caf;
  } catch {
    // swallow
  }

  const w = getWindowMaybe(app);
  return w && typeof w.cancelAnimationFrame === 'function' ? w.cancelAnimationFrame.bind(w) : null;
}

export function requestIdleCallbackMaybe(app: unknown): RequestIdleCallbackLike | null {
  try {
    const browser = getBrowserDeps(app);
    const ric = browser?.requestIdleCallback;
    if (typeof ric === 'function') return ric;
  } catch {
    // swallow
  }

  const w = asWindowExtras(getWindowMaybe(app));
  return w && typeof w.requestIdleCallback === 'function' ? w.requestIdleCallback.bind(w) : null;
}

export function getBrowserTimers(app: unknown): BrowserTimersLike {
  const browser = (() => {
    try {
      return getBrowserDeps(app);
    } catch {
      return null;
    }
  })();

  const w = getWindowMaybe(app);
  const wx = asWindowExtras(w);

  const st: SetTimeoutLike =
    readTimerFn<SetTimeoutLike>(browser, 'setTimeout') ||
    (w && typeof w.setTimeout === 'function' ? w.setTimeout.bind(w) : null) ||
    readGlobalFn<SetTimeoutLike>('setTimeout') ||
    function (fn: TimerCallback) {
      try {
        fn && fn();
      } catch {
        // swallow
      }
      return -1;
    };

  const ctFromWindow: ClearTimeoutLike | null =
    w && typeof w.clearTimeout === 'function'
      ? function (handle: TimeoutHandleLike | undefined) {
          if (typeof handle === 'number' || typeof handle === 'undefined') {
            w.clearTimeout(handle);
          }
        }
      : null;

  const ct: ClearTimeoutLike =
    readTimerFn<ClearTimeoutLike>(browser, 'clearTimeout') ||
    ctFromWindow ||
    readGlobalFn<ClearTimeoutLike>('clearTimeout') ||
    function () {};

  const si: SetIntervalLike =
    readTimerFn<SetIntervalLike>(browser, 'setInterval') ||
    (w && typeof w.setInterval === 'function' ? w.setInterval.bind(w) : null) ||
    readGlobalFn<SetIntervalLike>('setInterval') ||
    function (fn: TimerCallback, ms?: number) {
      return st(fn, ms || 0);
    };

  const ciFromWindow: ClearIntervalLike | null =
    w && typeof w.clearInterval === 'function'
      ? function (handle: IntervalHandleLike | undefined) {
          if (typeof handle === 'number' || typeof handle === 'undefined') {
            w.clearInterval(handle);
          }
        }
      : null;

  const ci: ClearIntervalLike =
    readTimerFn<ClearIntervalLike>(browser, 'clearInterval') ||
    ciFromWindow ||
    readGlobalFn<ClearIntervalLike>('clearInterval') ||
    function (handle: IntervalHandleLike | undefined) {
      try {
        ct(typeof handle === 'number' || typeof handle === 'undefined' ? handle : undefined);
      } catch {
        // swallow
      }
    };

  const raf: RequestAnimationFrameLike =
    requestAnimationFrameMaybe(app) ||
    function (cb: FrameRequestCallback) {
      st(() => cb(Date.now()), 16);
      return -1;
    };

  const caf: CancelAnimationFrameLike =
    cancelAnimationFrameMaybe(app) ||
    function (_handle: number) {
      // Intentionally no-op when animation-frame cancellation is unavailable.
    };

  const qm: QueueMicrotaskLike | undefined =
    readTimerFn<QueueMicrotaskLike>(browser, 'queueMicrotask') ||
    (wx && typeof wx.queueMicrotask === 'function' ? wx.queueMicrotask.bind(wx) : null) ||
    readGlobalFn<QueueMicrotaskLike>('queueMicrotask') ||
    undefined;

  const nowFn =
    readTimerFn<() => number>(browser, 'performanceNow') ||
    (wx && wx.performance && typeof wx.performance.now === 'function'
      ? wx.performance.now.bind(wx.performance)
      : null) ||
    function () {
      return Date.now();
    };

  return {
    setTimeout: st,
    clearTimeout: ct,
    setInterval: si,
    clearInterval: ci,
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf,
    queueMicrotask: qm || undefined,
    now: nowFn,
  };
}

export function getBrowserFetchMaybe(app: unknown): FetchLike | null {
  try {
    const browser = getBrowserDeps(app);
    const f = browser?.fetch;
    if (typeof f === 'function') return f;
  } catch {
    // swallow
  }

  try {
    const w = asWindowExtras(getWindowMaybe(app));
    if (w && typeof w.fetch === 'function') return w.fetch.bind(w);
  } catch {
    // swallow
  }

  try {
    return readGlobalFn<FetchLike>('fetch');
  } catch {
    return null;
  }
}

export function queueMicrotaskMaybe(app: unknown): QueueMicrotaskLike | null {
  try {
    const timers = getBrowserTimers(app);
    return timers.queueMicrotask ? timers.queueMicrotask : null;
  } catch {
    return null;
  }
}

export function performanceNowMaybe(app: unknown): (() => number) | null {
  try {
    const timers = getBrowserTimers(app);
    return timers.now ? timers.now : null;
  } catch {
    return null;
  }
}
