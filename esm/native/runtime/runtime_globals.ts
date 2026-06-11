// Runtime helpers for boot-time dependency injection (Pure ESM)
//
// Goal: keep "browser environment" wiring in one place, without relying on
// Window-global config surfaces.

import type { BrowserDeps, Deps, WardrobeProRuntimeFlags } from '../../../types';

import { cloneRecord } from './record.js';

type BrowserWindowLike = Window & {
  queueMicrotask?: (cb: () => void) => void;
  fetch?: BrowserDeps['fetch'];
};

type BrowserPerformanceLike = {
  now?: () => number;
};

type DepsBrowserBag = Partial<BrowserDeps>;

type WindowMethod<Args extends unknown[], Result> = (...args: Args) => Result;

function bindWindowMethod<Args extends unknown[], Result>(
  target: BrowserWindowLike | null,
  method: WindowMethod<Args, Result> | null | undefined
): WindowMethod<Args, Result> | null {
  if (!target || typeof method !== 'function') return null;
  return (...args: Args) => method.apply(target, args);
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
    const setTimeoutFn = bindWindowMethod(w, w?.setTimeout ?? null);
    if (setTimeoutFn) browser.setTimeout = setTimeoutFn;
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
    const setIntervalFn = bindWindowMethod(w, w?.setInterval ?? null);
    if (setIntervalFn) browser.setInterval = setIntervalFn;
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
    const requestAnimationFrameFn = bindWindowMethod(w, w?.requestAnimationFrame ?? null);
    if (requestAnimationFrameFn) browser.requestAnimationFrame = requestAnimationFrameFn;
  } catch {
    // ignore
  }
  try {
    const cancelAnimationFrameFn = bindWindowMethod(w, w?.cancelAnimationFrame ?? null);
    if (cancelAnimationFrameFn) browser.cancelAnimationFrame = cancelAnimationFrameFn;
  } catch {
    // ignore
  }
  try {
    const queueMicrotaskFn = bindWindowMethod(w, w?.queueMicrotask ?? null);
    if (queueMicrotaskFn) browser.queueMicrotask = queueMicrotaskFn;
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
    const fetchFn = bindWindowMethod(w, w?.fetch ?? null);
    if (fetchFn) browser.fetch = fetchFn;
  } catch {
    // ignore
  }

  return browser;
}

/** Ensure deps.flags exists and enforce uiFramework to the requested value. */
export function ensureUiFrameworkFlag(deps: Deps, value: WardrobeProRuntimeFlags['uiFramework']): void {
  try {
    deps.flags = { ...cloneRecord(deps.flags), uiFramework: value };
  } catch {
    // ignore
  }
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
