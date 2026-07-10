// Runtime helpers for boot-time dependency injection (Pure ESM)
//
// Goal: keep "browser environment" wiring in one place, without relying on
// Window-global config surfaces.

import type { BrowserDeps, Deps } from '../../../types';

type BrowserWindowLike = Window & {
  queueMicrotask?: (cb: () => void) => void;
  fetch?: BrowserDeps['fetch'];
};

type BrowserPerformanceLike = {
  now?: () => number;
};

type DepsBrowserBag = Partial<BrowserDeps>;

type BoundWindowMethodKey =
  | 'setTimeout'
  | 'setInterval'
  | 'requestAnimationFrame'
  | 'cancelAnimationFrame'
  | 'queueMicrotask'
  | 'fetch';

function readWindowMethod(target: BrowserWindowLike | null, key: 'setTimeout'): Window['setTimeout'] | null;
function readWindowMethod(target: BrowserWindowLike | null, key: 'setInterval'): Window['setInterval'] | null;
function readWindowMethod(
  target: BrowserWindowLike | null,
  key: 'requestAnimationFrame'
): Window['requestAnimationFrame'] | null;
function readWindowMethod(
  target: BrowserWindowLike | null,
  key: 'cancelAnimationFrame'
): Window['cancelAnimationFrame'] | null;
function readWindowMethod(
  target: BrowserWindowLike | null,
  key: 'queueMicrotask'
): NonNullable<BrowserWindowLike['queueMicrotask']> | null;
function readWindowMethod(
  target: BrowserWindowLike | null,
  key: 'fetch'
): NonNullable<BrowserWindowLike['fetch']> | null;
function readWindowMethod(target: BrowserWindowLike | null, key: BoundWindowMethodKey): unknown {
  if (!target) return null;
  const value: unknown = Reflect.get(target, key);
  return typeof value === 'function' ? value : null;
}

function readPerformanceNow(target: BrowserWindowLike | null): (() => number) | null {
  const perf: BrowserPerformanceLike | null = target?.performance ?? null;
  if (!perf || typeof perf.now !== 'function') return null;
  return () => perf.now?.() ?? 0;
}

/**
 * Build browser DI surfaces from injected window/document.
 * Keep this typed so later strict-mode islands can rely on real timer/fetch signatures.
 */
export function buildBrowserDeps(env: {
  window?: Window | null;
  document?: Document | null;
}): Partial<BrowserDeps> {
  const w: BrowserWindowLike | null = env.window ?? null;
  const d = env.document ?? null;

  const browser: DepsBrowserBag = {};
  if (w) browser.window = w;
  if (d) browser.document = d;

  // Optional surfaces.
  try {
    if (w && typeof w.location === 'object') browser.location = w.location;
  } catch {
    // ignore
  }

  try {
    if (w && typeof w.navigator === 'object') browser.navigator = w.navigator;
  } catch {
    // ignore
  }

  // Timing / async surfaces (optional).
  // Bind to the injected Window so callers don't accidentally lose `this`.
  try {
    const setTimeoutMethod = readWindowMethod(w, 'setTimeout');
    if (setTimeoutMethod) {
      browser.setTimeout = (fn, ms) => setTimeoutMethod.call(w, fn, ms);
    }
  } catch {
    // ignore
  }
  try {
    if (w && typeof w.clearTimeout === 'function') {
      browser.clearTimeout = handle => {
        if (typeof handle === 'number' || typeof handle === 'undefined') w.clearTimeout(handle);
      };
    }
  } catch {
    // ignore
  }
  try {
    const setIntervalMethod = readWindowMethod(w, 'setInterval');
    if (setIntervalMethod) {
      browser.setInterval = (fn, ms) => setIntervalMethod.call(w, fn, ms);
    }
  } catch {
    // ignore
  }
  try {
    if (w && typeof w.clearInterval === 'function') {
      browser.clearInterval = handle => {
        if (typeof handle === 'number' || typeof handle === 'undefined') w.clearInterval(handle);
      };
    }
  } catch {
    // ignore
  }
  try {
    const requestAnimationFrameMethod = readWindowMethod(w, 'requestAnimationFrame');
    if (requestAnimationFrameMethod) {
      browser.requestAnimationFrame = callback => requestAnimationFrameMethod.call(w, callback);
    }
  } catch {
    // ignore
  }
  try {
    const cancelAnimationFrameMethod = readWindowMethod(w, 'cancelAnimationFrame');
    if (cancelAnimationFrameMethod) {
      browser.cancelAnimationFrame = handle => cancelAnimationFrameMethod.call(w, handle);
    }
  } catch {
    // ignore
  }
  try {
    const queueMicrotaskMethod = readWindowMethod(w, 'queueMicrotask');
    if (queueMicrotaskMethod) {
      browser.queueMicrotask = callback => queueMicrotaskMethod.call(w, callback);
    }
  } catch {
    // ignore
  }
  try {
    const performanceNow = readPerformanceNow(w);
    if (performanceNow) browser.performanceNow = performanceNow;
  } catch {
    // ignore
  }

  // Networking (optional).
  try {
    const fetchMethod = readWindowMethod(w, 'fetch');
    if (fetchMethod) {
      browser.fetch = (input, init) => fetchMethod.call(w, input, init);
    }
  } catch {
    // ignore
  }

  return browser;
}

/** Safe read of injected browser document from deps (used by release entry). */
export function getBrowserDocumentFromDeps(deps: Deps | null | undefined): Document | null {
  try {
    const doc = deps?.browser?.document ?? null;
    return doc && typeof doc === 'object' ? doc : null;
  } catch {
    return null;
  }
}

/** Safe read of injected browser window from deps (used by release entry). */
export function getBrowserWindowFromDeps(deps: Deps | null | undefined): Window | null {
  try {
    const win = deps?.browser?.window ?? null;
    return win && typeof win === 'object' ? win : null;
  } catch {
    return null;
  }
}
