import type {
  AppContainer,
  BrowserDeps,
  BrowserNamespaceLike,
  BrowserSetTimeoutLike,
  TimeoutHandleLike,
  UnknownRecord,
} from '../../../../types';

import { ensureBrowserSurface } from '../../runtime/browser_surface_access.js';
import { getDepsNamespaceMaybe } from '../../runtime/deps_access.js';

export type DelayPromise = Promise<boolean> & { cancel?: () => void };

export type BrowserEnvSurface = BrowserNamespaceLike & {
  delay?: (ms: number) => DelayPromise;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function ensureBrowserEnvSurface(App: AppContainer): BrowserEnvSurface {
  return ensureBrowserSurface(App);
}

export function getBrowserDepsRaw(App: AppContainer): Partial<BrowserDeps> | null {
  try {
    return getDepsNamespaceMaybe<Partial<BrowserDeps>>(App, 'browser');
  } catch {
    return null;
  }
}

export function getWindowRaw(App: AppContainer): Window | null {
  const browser = getBrowserDepsRaw(App);
  return browser?.window ?? null;
}

export function getDocumentRaw(App: AppContainer): Document | null {
  const browser = getBrowserDepsRaw(App);
  return browser?.document ?? browser?.window?.document ?? null;
}

export function getNavigatorRaw(App: AppContainer): Navigator | null {
  const browser = getBrowserDepsRaw(App);
  return browser?.navigator ?? browser?.window?.navigator ?? null;
}

export function getLocationRaw(App: AppContainer): Location | null {
  const browser = getBrowserDepsRaw(App);
  return browser?.location ?? browser?.window?.location ?? null;
}

export function readPerformanceNow(App: AppContainer): (() => number) | null {
  const browser = getBrowserDepsRaw(App);
  if (browser?.performanceNow) return browser.performanceNow;
  const perf = getWindowRaw(App)?.performance;
  return perf && typeof perf.now === 'function' ? perf.now.bind(perf) : null;
}

export function getWindowEventTarget(App: AppContainer): Window | null {
  const win = getWindowRaw(App);
  return win && typeof win.addEventListener === 'function' ? win : null;
}

export function getDocumentEventTarget(App: AppContainer): Document | null {
  const doc = getDocumentRaw(App);
  return doc && typeof doc.addEventListener === 'function' ? doc : null;
}

export function delayViaWindow(App: AppContainer, ms: number): DelayPromise {
  const timeoutMs = typeof ms === 'number' && Number.isFinite(ms) ? ms : 0;
  const browser = getBrowserDepsRaw(App);
  const win = getWindowRaw(App);
  const setTimeoutFn: BrowserSetTimeoutLike | null =
    browser?.setTimeout ??
    (win && typeof win.setTimeout === 'function' ? (fn, delay) => win.setTimeout(fn, delay) : null);
  const clearTimeoutFn: ((handle: TimeoutHandleLike | undefined) => void) | null =
    browser?.clearTimeout ??
    (win && typeof win.clearTimeout === 'function'
      ? (handle: TimeoutHandleLike | undefined) => {
          if (typeof handle === 'number' || typeof handle === 'undefined') win.clearTimeout(handle);
        }
      : null);

  if (setTimeoutFn) {
    let handle: TimeoutHandleLike | undefined;
    let settled = false;
    const promise: DelayPromise = new Promise<boolean>(resolve => {
      handle = setTimeoutFn(() => {
        settled = true;
        resolve(true);
      }, timeoutMs);
    });
    promise.cancel = () => {
      if (settled) return;
      if (clearTimeoutFn) clearTimeoutFn(handle);
      settled = true;
    };
    return promise;
  }

  const fallbackPromise: DelayPromise = new Promise(resolve => setTimeout(() => resolve(true), timeoutMs));
  return fallbackPromise;
}
