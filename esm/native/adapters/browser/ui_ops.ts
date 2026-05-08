// Browser UI ops adapter (Pure ESM)
//
// Purpose:
// - Provide a small, *stable* browser-ops surface for UI modules so they don't need
//   to import window helpers directly.
// - Keep everything best-effort: missing DOM/window should never throw.
//
// Notes:
// - This adapter intentionally exposes *operations* (scroll, selection, cursor, etc),
//   not raw window/document objects.
// - For rare browser interop, we provide App.browser.getWindow() as an escape hatch.

import type {
  AppContainer,
  BrowserNamespaceLike,
  BrowserTimeoutCancelerLike,
  BrowserTimeoutRunnerLike,
} from '../../../../types';

import { assertApp, getWindowMaybe, getDocumentMaybe } from '../../runtime/api.js';
import { isBrowserUiOpsInstalled, markBrowserUiOpsInstalled } from '../../runtime/install_state_access.js';
import { ensureBrowserSurface } from '../../runtime/browser_surface_access.js';
import { asRecord } from '../../runtime/record.js';

type BrowserUiOpsSurface = BrowserNamespaceLike;

type ActiveElementWithBlur = {
  blur?: () => void;
};

type TimeoutRunner = BrowserTimeoutRunnerLike;
type TimeoutCanceler = BrowserTimeoutCancelerLike;

function ensureBrowserUiOpsSurface(App: AppContainer): BrowserUiOpsSurface {
  return ensureBrowserSurface(App);
}

function safeNumber(v: unknown, fallback: number): number {
  try {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  } catch {
    return fallback;
  }
}

function hasBlur(x: unknown): x is { blur: () => void } {
  return typeof asRecord<ActiveElementWithBlur>(x)?.blur === 'function';
}

function getSetTimeoutFn(w: Window | null): TimeoutRunner | null {
  if (w && typeof w.setTimeout === 'function') {
    return (fn, ms) => w.setTimeout(() => void fn(), ms);
  }
  if (typeof setTimeout === 'function') {
    return (fn, ms) => setTimeout(() => void fn(), ms);
  }
  return null;
}

function getClearTimeoutFn(w: Window | null): TimeoutCanceler | null {
  if (w && typeof w.clearTimeout === 'function') {
    return id => {
      if (typeof id === 'number') w.clearTimeout(id);
    };
  }
  if (typeof clearTimeout === 'function') {
    return id => {
      if (typeof id === 'number') clearTimeout(id);
    };
  }
  return null;
}

function hasInstalledBrowserUiOpsSurface(surface: BrowserUiOpsSurface): boolean {
  return (
    typeof surface.getWindow === 'function' &&
    typeof surface.getDevicePixelRatio === 'function' &&
    typeof surface.getComputedStyle === 'function' &&
    typeof surface.getSelection === 'function' &&
    typeof surface.clearSelection === 'function' &&
    typeof surface.setBodyCursor === 'function' &&
    typeof surface.blurActiveElement === 'function' &&
    typeof surface.getScrollTop === 'function' &&
    typeof surface.scrollTo === 'function' &&
    typeof surface.setTimeout === 'function' &&
    typeof surface.clearTimeout === 'function'
  );
}

export function installBrowserUiOpsAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/ui_ops.install');
  const b = ensureBrowserUiOpsSurface(App);

  if (isBrowserUiOpsInstalled(App) && hasInstalledBrowserUiOpsSurface(b)) return App;
  if (!isBrowserUiOpsInstalled(App)) markBrowserUiOpsInstalled(App);

  // Escape hatch (UI/interop only): get the injected window reference.
  // Prefer operations below for most call sites.
  if (typeof b.getWindow !== 'function') {
    b.getWindow = function () {
      try {
        return getWindowMaybe(App) || null;
      } catch {
        return null;
      }
    };
  }

  if (typeof b.getDevicePixelRatio !== 'function') {
    b.getDevicePixelRatio = function () {
      try {
        const w = getWindowMaybe(App);
        return safeNumber(w?.devicePixelRatio, 1);
      } catch {
        return 1;
      }
    };
  }

  if (typeof b.getComputedStyle !== 'function') {
    b.getComputedStyle = function (el: Element) {
      try {
        const w = getWindowMaybe(App);
        if (!w || typeof w.getComputedStyle !== 'function') return null;
        return w.getComputedStyle(el);
      } catch {
        return null;
      }
    };
  }

  if (typeof b.getSelection !== 'function') {
    b.getSelection = function () {
      try {
        const w = getWindowMaybe(App);
        return w && typeof w.getSelection === 'function' ? w.getSelection() : null;
      } catch {
        return null;
      }
    };
  }

  if (typeof b.clearSelection !== 'function') {
    b.clearSelection = function () {
      try {
        const sel = b.getSelection ? b.getSelection() : null;
        if (sel && typeof sel.removeAllRanges === 'function') sel.removeAllRanges();
      } catch {
        // ignore
      }
    };
  }

  if (typeof b.setBodyCursor !== 'function') {
    b.setBodyCursor = function (cursor: string) {
      try {
        const doc = getDocumentMaybe(App);
        if (!doc?.body?.style) return;
        doc.body.style.cursor = String(cursor || '');
      } catch {
        // ignore
      }
    };
  }

  if (typeof b.blurActiveElement !== 'function') {
    b.blurActiveElement = function () {
      try {
        const doc = getDocumentMaybe(App);
        const ae = doc?.activeElement;
        if (hasBlur(ae)) ae.blur();
      } catch {
        // ignore
      }
    };
  }

  if (typeof b.getScrollTop !== 'function') {
    b.getScrollTop = function () {
      try {
        const w = getWindowMaybe(App);
        const doc = getDocumentMaybe(App);
        const de = doc?.documentElement ? safeNumber(doc.documentElement.scrollTop, 0) : 0;
        const bs = doc?.body ? safeNumber(doc.body.scrollTop, 0) : 0;
        const y = w ? safeNumber(w.pageYOffset, 0) : 0;
        return y || de || bs || 0;
      } catch {
        return 0;
      }
    };
  }

  if (typeof b.scrollTo !== 'function') {
    b.scrollTo = function (x: number, y: number) {
      try {
        const w = getWindowMaybe(App);
        if (!w || typeof w.scrollTo !== 'function') return;
        w.scrollTo(safeNumber(x, 0), safeNumber(y, 0));
      } catch {
        // ignore
      }
    };
  }

  if (typeof b.setTimeout !== 'function') {
    b.setTimeout = function (fn: () => unknown, ms: number) {
      try {
        const run = getSetTimeoutFn(getWindowMaybe(App));
        return run ? run(fn, safeNumber(ms, 0)) : null;
      } catch {
        return null;
      }
    };
  }

  if (typeof b.clearTimeout !== 'function') {
    b.clearTimeout = function (id: unknown) {
      try {
        const cancel = getClearTimeoutFn(getWindowMaybe(App));
        if (cancel) cancel(id);
      } catch {
        // ignore
      }
    };
  }

  return App;
}
