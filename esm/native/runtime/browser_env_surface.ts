import {
  asRecord,
  getBrowserDeps,
  getBrowserSurfaceMaybe,
  isDocumentLike,
  isNavigatorLike,
  isWindowLike,
  readBrowserSurfaceReader,
} from './browser_env_shared.js';

export function getWindowMaybe(app: unknown): Window | null {
  try {
    const surf = getBrowserSurfaceMaybe(app);
    const getWindow = readBrowserSurfaceReader(surf, 'getWindow');
    if (getWindow) {
      const w = getWindow();
      if (isWindowLike(w)) return w;
    }
  } catch {
    // swallow
  }

  try {
    const browser = getBrowserDeps(app);
    const w = browser && browser.window ? browser.window : null;
    return isWindowLike(w) ? w : null;
  } catch {
    return null;
  }
}

export function assertBrowserWindow(app: unknown, label = ''): Window {
  const w = getWindowMaybe(app);
  if (!w) {
    const where = label ? ` (${label})` : '';
    throw new Error(
      `[WardrobePro][ESM] Browser window missing${where}. Inject via boot({ deps: { browser: { window, document, location, navigator } } }).`
    );
  }
  return w;
}

export function getDocumentMaybe(app: unknown): Document | null {
  try {
    const surf = getBrowserSurfaceMaybe(app);
    const getDocument = readBrowserSurfaceReader(surf, 'getDocument');
    if (getDocument) {
      const d = getDocument();
      if (isDocumentLike(d)) return d;
    }
  } catch {
    // swallow
  }

  try {
    const browser = getBrowserDeps(app);
    if (isDocumentLike(browser?.document)) return browser.document;

    const wrec = asRecord(browser?.window || null);
    const d = wrec ? wrec['document'] : null;
    return isDocumentLike(d) ? d : null;
  } catch {
    return null;
  }
}

export function assertBrowserDocument(app: unknown, label = ''): Document {
  const d = getDocumentMaybe(app);
  if (!d) {
    const where = label ? ` (${label})` : '';
    throw new Error(
      `[WardrobePro][ESM] Browser document missing${where}. Inject via boot({ deps: { browser: { document } } }).`
    );
  }
  return d;
}

export function getLocationSearchMaybe(app: unknown): string {
  try {
    const surf = getBrowserSurfaceMaybe(app);
    const getLocationSearch = readBrowserSurfaceReader(surf, 'getLocationSearch');
    if (getLocationSearch) return String(getLocationSearch() || '');
  } catch {
    // swallow
  }

  try {
    const browser = getBrowserDeps(app);
    const loc =
      (browser && browser.location) || (browser && browser.window && browser.window.location) || null;
    if (loc && typeof loc.search === 'string') return loc.search;

    const w = getWindowMaybe(app);
    const wloc = w ? w.location : null;
    return wloc && typeof wloc.search === 'string' ? wloc.search : '';
  } catch {
    return '';
  }
}

export function getNavigatorMaybe(app: unknown): Navigator | null {
  try {
    const surf = getBrowserSurfaceMaybe(app);
    const getNavigator = readBrowserSurfaceReader(surf, 'getNavigator');
    if (getNavigator) {
      const nav = getNavigator();
      if (isNavigatorLike(nav)) return nav;
    }
  } catch {
    // swallow
  }

  try {
    const browser = getBrowserDeps(app);
    const nav0 = browser && browser.navigator ? browser.navigator : null;
    if (isNavigatorLike(nav0)) return nav0;

    const w = getWindowMaybe(app);
    const nav = w ? w.navigator : null;
    return isNavigatorLike(nav) ? nav : null;
  } catch {
    return null;
  }
}

export function getUserAgentMaybe(app: unknown): string | null {
  try {
    const surf = getBrowserSurfaceMaybe(app);
    const getUserAgent = readBrowserSurfaceReader(surf, 'getUserAgent');
    if (getUserAgent) {
      const ua = getUserAgent();
      return ua && typeof ua === 'string' ? ua : null;
    }
  } catch {
    // swallow
  }

  const nav = getNavigatorMaybe(app);
  return nav && typeof nav.userAgent === 'string' ? nav.userAgent : null;
}
