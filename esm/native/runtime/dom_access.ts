// DOM access helpers (Runtime)
//
// Goal: provide a single, safe, DOM-first helper layer so UI modules don't re-implement
// `$`, `qs`, `qsa` null-safe reads across files.
//
// Notes:
// - Pure ESM code should use injected browser deps instead of App.dom helper bags.
// - We use only the injected browser document (via deps.browser) when available.
// - Never throw for missing DOM; callers get null/[] and can decide.

import { getDocumentMaybe } from './browser_env.js';
import { asRecord } from './record.js';

// Re-export for convenience in runtime-only modules.
// UI modules should still import from `esm/native/runtime/api.js`.
export { getDocumentMaybe };

type HtmlElementShape = {
  nodeType?: unknown;
  appendChild?: unknown;
};

type ImageElementShape = {
  tagName?: unknown;
  complete?: unknown;
  naturalWidth?: unknown;
  naturalHeight?: unknown;
};

export function hasDom(App: unknown): boolean {
  try {
    const doc = getDocumentMaybe(App);
    return !!(doc && typeof doc.getElementById === 'function');
  } catch {
    return false;
  }
}

export function getById(App: unknown, id: string): HTMLElement | null {
  try {
    const doc = getDocumentMaybe(App);
    if (!doc || typeof doc.getElementById !== 'function') return null;
    const el = doc.getElementById(String(id || ''));
    return isHTMLElementLike(el) ? el : null;
  } catch {
    return null;
  }
}

export function get$(App: unknown): (id: string) => HTMLElement | null {
  return (id: string) => getById(App, id);
}

export function getQs(App: unknown): (selector: string) => Element | null {
  return (selector: string) => {
    try {
      const doc = getDocumentMaybe(App);
      if (!doc || typeof doc.querySelector !== 'function') return null;
      return doc.querySelector(String(selector || ''));
    } catch {
      return null;
    }
  };
}

export function getQsa(App: unknown): (selector: string) => Element[] {
  return (selector: string) => {
    try {
      const doc = getDocumentMaybe(App);
      if (!doc || typeof doc.querySelectorAll !== 'function') return [];
      return Array.from(doc.querySelectorAll(String(selector || '')));
    } catch {
      return [];
    }
  };
}

function isHTMLElementLike(el: unknown): el is HTMLElement {
  const rec = asRecord<HtmlElementShape>(el);
  return !!rec && rec.nodeType === 1 && typeof rec.appendChild === 'function';
}

function isImageLike(el: unknown): el is HTMLImageElement {
  const rec = asRecord<ImageElementShape>(el);
  if (!rec) return false;
  const tag = typeof rec.tagName === 'string' ? rec.tagName.toUpperCase() : '';
  return (
    tag === 'IMG' &&
    typeof rec.complete === 'boolean' &&
    typeof rec.naturalWidth === 'number' &&
    typeof rec.naturalHeight === 'number'
  );
}

function getHtmlElementById(App: unknown, id: string): HTMLElement | null {
  const el = getById(App, id);
  return isHTMLElementLike(el) ? el : null;
}

export function getViewerContainerMaybe(App: unknown): HTMLElement | null {
  return getHtmlElementById(App, 'viewer-container');
}

export function getReactMountRootMaybe(App: unknown, id: string): HTMLElement | null {
  const cleanId = String(id || '').trim();
  return cleanId ? getHtmlElementById(App, cleanId) : null;
}

function getToastContainerHostMaybe(App: unknown, doc: Document): HTMLElement | null {
  const viewer = getViewerContainerMaybe(App);
  if (viewer) return viewer;

  if (isHTMLElementLike(doc.body)) return doc.body;
  if (isHTMLElementLike(doc.documentElement)) return doc.documentElement;
  return null;
}

function syncToastContainerClass(container: HTMLElement, host: HTMLElement): void {
  const isViewerHost = host.id === 'viewer-container';
  const baseClass = 'toast-container';
  const hostClass = isViewerHost ? 'toast-container--viewer' : 'toast-container--body';
  const staleClass = isViewerHost ? 'toast-container--body' : 'toast-container--viewer';

  try {
    container.classList.add(baseClass, hostClass);
    container.classList.remove(staleClass);
  } catch {
    container.className = `${baseClass} ${hostClass}`;
  }
}

export function ensureToastContainerMaybe(App: unknown): HTMLElement | null {
  try {
    const doc = getDocumentMaybe(App);
    if (!doc || typeof doc.createElement !== 'function') return null;

    const host = getToastContainerHostMaybe(App, doc);
    if (!host) return null;

    const existing = getHtmlElementById(App, 'toastContainer');
    if (existing) {
      if (existing.parentElement !== host) host.appendChild(existing);
      syncToastContainerClass(existing, host);
      return existing;
    }

    const div = doc.createElement('div');
    if (!isHTMLElementLike(div)) return null;
    div.id = 'toastContainer';
    syncToastContainerClass(div, host);
    host.appendChild(div);
    return div;
  } catch {
    return null;
  }
}

export function getHeaderLogoImageMaybe(App: unknown): HTMLImageElement | null {
  try {
    const doc = getDocumentMaybe(App);
    if (!doc || typeof doc.querySelector !== 'function') return null;

    const candidates = ['[data-wp-logo="1"]', '.header-logo'];
    for (const selector of candidates) {
      const el = doc.querySelector(selector);
      if (isImageLike(el)) return el;
    }
    return null;
  } catch {
    return null;
  }
}
