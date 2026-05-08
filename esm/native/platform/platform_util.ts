import type { AppContainer, TimeoutHandleLike } from '../../../types';

import {
  getErrorStack,
  shouldConsoleLogOnce,
  type DebounceOptions,
  type PlatformArgList,
  type PlatformTask,
  type PlatformUtilInstallDeps,
  type PlatformVariadicTask,
} from './platform_shared.js';
import { ensurePlatformRoot, getPlatformRootMaybe } from '../runtime/app_roots_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

function clearTimeoutSafe(
  clearTimeoutFn: PlatformUtilInstallDeps['clearTimeoutFn'],
  handle: TimeoutHandleLike | null
): void {
  if (handle !== null) clearTimeoutFn(handle);
}

export function installPlatformUtilSurface(App: AppContainer, deps: PlatformUtilInstallDeps): void {
  const platform = ensurePlatformRoot(App);
  platform.util = platform.util || {};

  function getReportErrorFn(): ((err: unknown, ctx?: unknown) => void) | null {
    const current = getPlatformRootMaybe(App);
    return current && typeof current.reportError === 'function' ? current.reportError : null;
  }

  function schedulePostPaintTask(fn: PlatformTask): void {
    let didRun = false;
    const runOnce = () => {
      if (didRun) return;
      didRun = true;
      fn && fn();
    };

    try {
      if (deps.requestIdleCallbackFn) {
        deps.requestIdleCallbackFn(
          function () {
            runOnce();
          },
          { timeout: 250 }
        );
        return;
      }
    } catch {
      // Fall back to a macrotask below.
    }

    try {
      deps.setTimeoutFn(runOnce, 0);
    } catch {
      runOnce();
    }
  }

  installStableSurfaceMethod(platform.util, 'str', '__wpStr', () => {
    return function (v: unknown, defaultValue?: unknown) {
      if (v === null || typeof v === 'undefined')
        return typeof defaultValue === 'undefined' ? '' : String(defaultValue);
      if (typeof v === 'number' && v !== v)
        return typeof defaultValue === 'undefined' ? '' : String(defaultValue);
      return String(v);
    };
  });

  installStableSurfaceMethod(platform, 'reportError', '__wpReportError', () => {
    return function (err: unknown, ctx?: unknown) {
      try {
        const vb = deps.getVerboseCfg();
        if (!vb.enabled) return;
        if (!shouldConsoleLogOnce(err, ctx, vb.dedupeMs)) return;

        const stack = getErrorStack(err);
        const msg = stack ? String(stack) : String(err);
        console.error('[Platform]', ctx ? `[${String(ctx)}]` : '', msg);
      } catch {
        // swallow
      }
    };
  });

  installStableSurfaceMethod(platform.util, 'safe', '__wpSafe', () => {
    return function (label: unknown, fn: PlatformTask, prefix?: unknown) {
      try {
        return typeof fn === 'function' ? fn() : null;
      } catch (e) {
        const reportError = getReportErrorFn();
        if (reportError) {
          const ctx = String(prefix ? `${String(prefix)}.` : '') + String(label || '');
          reportError(e, ctx);
        }
        const vb = deps.getVerboseCfg();
        if (!vb.enabled || !reportError) {
          console.warn(`[${String(prefix || 'safe')}]`, label, e);
        }
        return null;
      }
    };
  });

  installStableSurfaceMethod(platform.util, 'debounce', '__wpDebounce', () => {
    return function (fn: PlatformVariadicTask, waitMs?: unknown, options?: DebounceOptions) {
      const ms = typeof waitMs === 'number' && isFinite(waitMs) && waitMs >= 0 ? waitMs : 0;
      const opts: DebounceOptions = options && typeof options === 'object' ? options : {};
      const leading = !!opts.leading;
      const trailing = opts.trailing !== false;

      let t: TimeoutHandleLike | null = null;
      let lastArgs: PlatformArgList | null = null;
      let lastThis: unknown = null;
      let leadingCalled = false;

      function invoke() {
        const args = lastArgs;
        const ctx = lastThis;
        lastArgs = null;
        lastThis = null;
        const shouldCallTrailing = trailing && (!leading || leadingCalled);
        leadingCalled = false;
        t = null;
        if (shouldCallTrailing) return fn && fn.apply(ctx, args || []);
        return undefined;
      }

      return function (this: unknown, ...args: PlatformArgList) {
        lastArgs = args;
        lastThis = this;

        if (!t) {
          if (leading) {
            leadingCalled = true;
            fn && fn.apply(lastThis, lastArgs);
          }
          t = deps.setTimeoutFn(invoke, ms);
          return;
        }

        clearTimeoutSafe(deps.clearTimeoutFn, t);
        t = deps.setTimeoutFn(invoke, ms);
      };
    };
  });

  installStableSurfaceMethod(platform.util, 'idle', '__wpIdle', () => {
    return function (fn: PlatformTask, timeoutMs?: number) {
      const timeout = typeof timeoutMs === 'number' && isFinite(timeoutMs) && timeoutMs >= 0 ? timeoutMs : 0;
      if (deps.requestIdleCallbackFn) {
        return deps.requestIdleCallbackFn(
          function () {
            fn && fn();
          },
          { timeout }
        );
      }
      return deps.setTimeoutFn(function () {
        fn && fn();
      }, 0);
    };
  });

  installStableSurfaceMethod(platform.util, 'rafThrottle', '__wpRafThrottle', () => {
    return function (fn: PlatformVariadicTask) {
      let scheduled = false;
      let lastArgs: PlatformArgList | null = null;
      let lastThis: unknown = null;
      return function (this: unknown, ...args: PlatformArgList) {
        lastArgs = args;
        lastThis = this;
        if (scheduled) return;
        scheduled = true;
        deps.requestAnimationFrameFn(function () {
          scheduled = false;
          fn && fn.apply(lastThis, lastArgs || []);
        });
      };
    };
  });

  installStableSurfaceMethod(platform.util, 'clamp', '__wpClamp', () => {
    return function (v: unknown, min?: number, max?: number) {
      if (typeof v !== 'number' || v !== v) return typeof min === 'number' ? min : 0;
      if (typeof min === 'number' && v < min) return min;
      if (typeof max === 'number' && v > max) return max;
      return v;
    };
  });

  installStableSurfaceMethod(platform.util, 'toFloat', '__wpToFloat', () => {
    return function (x: unknown, defaultValue?: number) {
      const n = parseFloat(String(x));
      return typeof n === 'number' && isFinite(n) ? n : defaultValue;
    };
  });

  installStableSurfaceMethod(platform.util, 'toInt', '__wpToInt', () => {
    return function (x: unknown, defaultValue?: number) {
      const n = parseInt(String(x), 10);
      return typeof n === 'number' && isFinite(n) ? n : defaultValue;
    };
  });

  installStableSurfaceMethod(platform.util, 'afterPaint', '__wpAfterPaint', () => {
    return function (fn: PlatformTask) {
      // Two RAFs preserve the existing "after a paint opportunity" contract.
      // The actual boot/task work is then scheduled as idle work when the browser
      // supports it, so heavy startup work no longer runs inside the RAF callback
      // and does not compete with immediate rendering work as aggressively.
      deps.requestAnimationFrameFn(function () {
        deps.requestAnimationFrameFn(function () {
          schedulePostPaintTask(fn);
        });
      });
    };
  });

  installStableSurfaceMethod(platform.util, 'clone', '__wpClone', () => {
    return function (v: unknown, defaultValue?: unknown) {
      try {
        if (typeof structuredClone === 'function') return structuredClone(v);
      } catch {
        // fall through
      }
      try {
        return JSON.parse(JSON.stringify(v));
      } catch {
        if (typeof defaultValue !== 'undefined') return defaultValue;
        return Array.isArray(v) ? [] : v && typeof v === 'object' ? {} : v;
      }
    };
  });

  installStableSurfaceMethod(platform.util, 'log', '__wpLog', () => {
    return function (...args: PlatformArgList) {
      try {
        if (!deps.isDebugOn()) return;
        if (typeof console !== 'undefined' && console && typeof console.log === 'function') {
          console.log(...args);
        }
      } catch {
        // swallow
      }
    };
  });
}
