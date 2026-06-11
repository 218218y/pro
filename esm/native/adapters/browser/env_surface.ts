import type { AppContainer } from '../../../../types';

import {
  delayViaWindow,
  getBrowserDepsRaw,
  getDocumentEventTarget,
  getDocumentRaw,
  getLocationRaw,
  getNavigatorRaw,
  getWindowEventTarget,
  getWindowRaw,
  readPerformanceNow,
  type BrowserEnvSurface,
} from './env_shared.js';
import { installStableSurfaceMethod } from '../../runtime/stable_surface_methods.js';

type BrowserEnvSurfaceWithInternals = BrowserEnvSurface & {
  __wpGetWindow?: BrowserEnvSurface['getWindow'];
  __wpGetDocument?: BrowserEnvSurface['getDocument'];
  __wpGetNavigator?: BrowserEnvSurface['getNavigator'];
  __wpGetLocation?: BrowserEnvSurface['getLocation'];
  __wpGetUserAgent?: BrowserEnvSurface['getUserAgent'];
  __wpGetLocationSearch?: BrowserEnvSurface['getLocationSearch'];
  __wpRaf?: BrowserEnvSurface['raf'];
  __wpCaf?: BrowserEnvSurface['caf'];
  __wpNow?: BrowserEnvSurface['now'];
  __wpDelay?: BrowserEnvSurface['delay'];
  __wpOnWindow?: BrowserEnvSurface['onWindow'];
  __wpOffWindow?: BrowserEnvSurface['offWindow'];
  __wpOnDocument?: BrowserEnvSurface['onDocument'];
  __wpOffDocument?: BrowserEnvSurface['offDocument'];
  __wpGetDPR?: BrowserEnvSurface['getDPR'];
  __wpGetViewportSize?: BrowserEnvSurface['getViewportSize'];
  __wpHasDOM?: BrowserEnvSurface['hasDOM'];
  __wpHasRAF?: BrowserEnvSurface['hasRAF'];
};

type BrowserEnvBaseMethodMap = {
  getWindow: '__wpGetWindow';
  getDocument: '__wpGetDocument';
  getNavigator: '__wpGetNavigator';
  getLocation: '__wpGetLocation';
  getUserAgent: '__wpGetUserAgent';
  getLocationSearch: '__wpGetLocationSearch';
  raf: '__wpRaf';
  caf: '__wpCaf';
  now: '__wpNow';
  delay: '__wpDelay';
  onWindow: '__wpOnWindow';
  offWindow: '__wpOffWindow';
  onDocument: '__wpOnDocument';
  offDocument: '__wpOffDocument';
  getDPR: '__wpGetDPR';
  getViewportSize: '__wpGetViewportSize';
  hasDOM: '__wpHasDOM';
  hasRAF: '__wpHasRAF';
};

type BrowserEnvMethodKey = keyof BrowserEnvBaseMethodMap;
type CallableMethod = (...args: never[]) => unknown;
type BrowserEnvMethod<K extends BrowserEnvMethodKey> = Extract<
  NonNullable<BrowserEnvSurface[K]>,
  CallableMethod
>;

const browserEnvInternalMethodKeys: BrowserEnvBaseMethodMap = {
  getWindow: '__wpGetWindow',
  getDocument: '__wpGetDocument',
  getNavigator: '__wpGetNavigator',
  getLocation: '__wpGetLocation',
  getUserAgent: '__wpGetUserAgent',
  getLocationSearch: '__wpGetLocationSearch',
  raf: '__wpRaf',
  caf: '__wpCaf',
  now: '__wpNow',
  delay: '__wpDelay',
  onWindow: '__wpOnWindow',
  offWindow: '__wpOffWindow',
  onDocument: '__wpOnDocument',
  offDocument: '__wpOffDocument',
  getDPR: '__wpGetDPR',
  getViewportSize: '__wpGetViewportSize',
  hasDOM: '__wpHasDOM',
  hasRAF: '__wpHasRAF',
};

function installStableBrowserEnvMethod<K extends BrowserEnvMethodKey>(
  surface: BrowserEnvSurfaceWithInternals,
  key: K,
  create: () => BrowserEnvMethod<K>
): void {
  installStableSurfaceMethod<BrowserEnvMethod<K>>(surface, key, browserEnvInternalMethodKeys[key], create);
}

export function installBrowserEnvBaseSurface(App: AppContainer, browserSurface: BrowserEnvSurface): void {
  const b: BrowserEnvSurfaceWithInternals = browserSurface;

  installStableBrowserEnvMethod(b, 'getWindow', () => {
    return function () {
      try {
        return getWindowRaw(App);
      } catch {
        return null;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getDocument', () => {
    return function () {
      try {
        return getDocumentRaw(App);
      } catch {
        return null;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getNavigator', () => {
    return function () {
      try {
        return getNavigatorRaw(App);
      } catch {
        return null;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getLocation', () => {
    return function () {
      try {
        return getLocationRaw(App);
      } catch {
        return null;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getUserAgent', () => {
    return function () {
      try {
        const nav = getNavigatorRaw(App);
        return nav && typeof nav.userAgent === 'string' ? nav.userAgent : '';
      } catch {
        return '';
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getLocationSearch', () => {
    return function () {
      try {
        const loc = getLocationRaw(App);
        return loc && typeof loc.search === 'string' ? loc.search : '';
      } catch {
        return '';
      }
    };
  });

  installStableBrowserEnvMethod(b, 'raf', () => {
    return function (cb: FrameRequestCallback) {
      try {
        const browser = getBrowserDepsRaw(App);
        const win = getWindowRaw(App);
        const raf = browser?.requestAnimationFrame ?? win?.requestAnimationFrame?.bind(win);
        return raf ? raf(cb) : -1;
      } catch {
        return -1;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'caf', () => {
    return function (handle: number) {
      try {
        const browser = getBrowserDepsRaw(App);
        const win = getWindowRaw(App);
        const caf = browser?.cancelAnimationFrame ?? win?.cancelAnimationFrame?.bind(win);
        if (caf && typeof handle === 'number') caf(handle);
      } catch {
        // swallow
      }
    };
  });

  installStableBrowserEnvMethod(b, 'now', () => {
    return function () {
      try {
        const now = readPerformanceNow(App);
        return now ? now() : Date.now();
      } catch {
        return Date.now();
      }
    };
  });

  installStableBrowserEnvMethod(b, 'delay', () => {
    return function (ms: number) {
      try {
        return delayViaWindow(App, ms);
      } catch {
        const promise = new Promise<boolean>(resolve =>
          setTimeout(() => resolve(true), typeof ms === 'number' ? ms : 0)
        );
        return promise;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'onWindow', () => {
    return function (
      type: string,
      handler: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions
    ) {
      try {
        getWindowEventTarget(App)?.addEventListener(String(type), handler, opts);
      } catch {
        // swallow
      }
    };
  });

  installStableBrowserEnvMethod(b, 'offWindow', () => {
    return function (
      type: string,
      handler: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions
    ) {
      try {
        getWindowEventTarget(App)?.removeEventListener(String(type), handler, opts);
      } catch {
        // swallow
      }
    };
  });

  installStableBrowserEnvMethod(b, 'onDocument', () => {
    return function (
      type: string,
      handler: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions
    ) {
      try {
        getDocumentEventTarget(App)?.addEventListener(String(type), handler, opts);
      } catch {
        // swallow
      }
    };
  });

  installStableBrowserEnvMethod(b, 'offDocument', () => {
    return function (
      type: string,
      handler: EventListenerOrEventListenerObject,
      opts?: boolean | AddEventListenerOptions
    ) {
      try {
        getDocumentEventTarget(App)?.removeEventListener(String(type), handler, opts);
      } catch {
        // swallow
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getDPR', () => {
    return function () {
      try {
        const dpr = getWindowRaw(App)?.devicePixelRatio ?? 1;
        return dpr && Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
      } catch {
        return 1;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'getViewportSize', () => {
    return function () {
      try {
        const win = getWindowRaw(App);
        const doc = getDocumentRaw(App);
        const width =
          (win && typeof win.innerWidth === 'number' ? win.innerWidth : 0) ||
          doc?.documentElement?.clientWidth ||
          0;
        const height =
          (win && typeof win.innerHeight === 'number' ? win.innerHeight : 0) ||
          doc?.documentElement?.clientHeight ||
          0;
        return { width: Number(width) || 0, height: Number(height) || 0 };
      } catch {
        return { width: 0, height: 0 };
      }
    };
  });

  installStableBrowserEnvMethod(b, 'hasDOM', () => {
    return function () {
      try {
        return !!getDocumentRaw(App);
      } catch {
        return false;
      }
    };
  });

  installStableBrowserEnvMethod(b, 'hasRAF', () => {
    return function () {
      try {
        return !!(getBrowserDepsRaw(App)?.requestAnimationFrame || getWindowRaw(App)?.requestAnimationFrame);
      } catch {
        return false;
      }
    };
  });
}
