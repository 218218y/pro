// Browser adapter: dialogs + user agent.
//
// Goal:
// - Provide prompt/confirm/userAgent through an injected surface (App.browser)
// - Keep direct window/navigator access out of non-UI modules.

import type { AppContainer, BrowserNamespaceLike } from '../../../../types';

import { assertApp, getUserAgentMaybe, getWindowMaybe } from '../../runtime/api.js';
import { ensureBrowserSurface } from '../../runtime/browser_surface_access.js';
import { installStableSurfaceMethod } from '../../runtime/stable_surface_methods.js';

type BrowserDialogsSurface = BrowserNamespaceLike & {
  userAgent?: string;
  confirm?: (message: string) => boolean;
  prompt?: (message: string, def?: unknown) => string | null;
  __wpUserAgent?: string;
  __wpConfirm?: (message: string) => boolean;
  __wpPrompt?: (message: string, def?: unknown) => string | null;
};

function ensureDialogsSurface(App: AppContainer): BrowserDialogsSurface {
  return ensureBrowserSurface(App);
}

export function installBrowserDialogsAdapter(app: unknown): AppContainer {
  const App = assertApp(app, 'adapters/browser/dialogs.install');
  const b = ensureDialogsSurface(App);

  try {
    const ua = getUserAgentMaybe(App);
    const canonicalUserAgent =
      typeof b.__wpUserAgent === 'string' && b.__wpUserAgent.length
        ? b.__wpUserAgent
        : typeof b.userAgent === 'string' && b.userAgent.length
          ? b.userAgent
          : typeof ua === 'string' && ua.length
            ? ua
            : '';
    if (canonicalUserAgent) {
      if (b.__wpUserAgent !== canonicalUserAgent) b.__wpUserAgent = canonicalUserAgent;
      if (b.userAgent !== canonicalUserAgent) b.userAgent = canonicalUserAgent;
    }
  } catch {
    // ignore
  }

  installStableSurfaceMethod(b, 'confirm', '__wpConfirm', () => {
    return function (message: string) {
      try {
        const w = getWindowMaybe(App);
        return !!(w && typeof w.confirm === 'function' ? w.confirm(String(message || '')) : false);
      } catch {
        return false;
      }
    };
  });

  installStableSurfaceMethod(b, 'prompt', '__wpPrompt', () => {
    return function (message: string, def?: unknown) {
      try {
        const w = getWindowMaybe(App);
        if (!(w && typeof w.prompt === 'function')) return null;
        const v = w.prompt(String(message || ''), String(typeof def === 'undefined' ? '' : def));
        return v == null ? null : String(v);
      } catch {
        return null;
      }
    };
  });

  return App;
}
