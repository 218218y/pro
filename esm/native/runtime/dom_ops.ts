// DOM operations helpers (Runtime)
//
// Goal:
// - Provide a small, stable set of DOM *operations* (not queries) so UI modules
//   don't need to poke at helper bags or globals.
// - Work in Pure ESM: rely only on the injected document (deps.browser) and
//   element.ownerDocument.
//
// Notes:
// - These helpers are intentionally conservative: they try not to throw.

import { get$, getQs, getQsa } from './dom_access.js';
import { getDocumentMaybe } from './browser_env.js';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';

type HtmlTextLike = Element & {
  textContent: string | null;
};

type HtmlTooltipLike = Element & {
  title: string;
};

function getDoc(App: unknown, el: Element | null): Document | null {
  try {
    return (el && el.ownerDocument) || getDocumentMaybe(App) || null;
  } catch {
    return null;
  }
}

function clear(el: Element | null): void {
  try {
    while (el && el.firstChild) el.removeChild(el.firstChild);
  } catch {
    // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
  }
}

function looksLikeClassList(s: string): boolean {
  try {
    const t = s.trim();
    if (!t) return false;
    if (/(?:^|\s)fa[srb]?(?:\s|$)/u.test(t)) return true;
    return /\s/u.test(t);
  } catch {
    return false;
  }
}

function hasTextContent(el: Element | null): el is HtmlTextLike {
  return !!el && 'textContent' in el;
}

function hasTitle(el: Element | null): el is HtmlTooltipLike {
  return !!el && 'title' in el;
}

function isHTMLElementLike(value: unknown): value is HTMLElement {
  if (!value) return false;
  if (typeof HTMLElement === 'undefined') return true;
  return value instanceof HTMLElement;
}

function filterHtmlElements(values: unknown[]): HTMLElement[] {
  return values.filter(isHTMLElementLike);
}

export function clearEl(_App: unknown, el: Element | null): void {
  try {
    if (!el) return;
    clear(el);
  } catch {
    // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
  }
}

export function setIconText(
  App: unknown,
  el: Element | null,
  iconOrClass: string | null,
  text: string
): void {
  try {
    if (!el) return;
    const doc = getDoc(App, el);
    const icon = iconOrClass?.trim() ?? '';
    const t = text;

    clear(el);

    if (icon) {
      if (doc && typeof doc.createElement === 'function' && typeof doc.createTextNode === 'function') {
        if (looksLikeClassList(icon)) {
          const i = doc.createElement('i');
          i.className = icon;
          try {
            i.setAttribute('aria-hidden', 'true');
          } catch {
            // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
          }
          el.appendChild(i);
        } else {
          el.appendChild(doc.createTextNode(icon));
        }
      } else if (hasTextContent(el)) {
        el.textContent = icon;
      }
    }

    if (t) {
      if (doc && typeof doc.createTextNode === 'function') {
        el.appendChild(doc.createTextNode(t));
      } else if (hasTextContent(el)) {
        el.textContent = (el.textContent || '') + t;
      }
    }

    try {
      if (hasTitle(el)) el.title = t ? t.trim() : '';
    } catch {
      // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
    }
  } catch {
    // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
  }
}

export function setStrongInline(_App: unknown, el: Element | null, ...args: readonly unknown[]): void {
  try {
    if (!el) return;

    if (args.length === 1) {
      if (hasTextContent(el)) {
        el.textContent = formatDisplayScalar(readDisplayScalar(args[0]));
      }
      return;
    }

    if (args.length >= 2 && typeof args[0] === 'boolean') {
      const isActive = args[0];
      const activePrefix = formatDisplayScalar(readDisplayScalar(args[1]));
      const activeSuffix = formatDisplayScalar(readDisplayScalar(args[2]));
      const inactiveText = formatDisplayScalar(readDisplayScalar(args[3]));
      if (hasTextContent(el)) {
        el.textContent = isActive ? activePrefix + activeSuffix : inactiveText || activePrefix;
      }
      return;
    }

    if (hasTextContent(el)) {
      el.textContent = args.map(v => formatDisplayScalar(readDisplayScalar(v))).join('');
    }
  } catch {
    // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
  }
}

export function setStrongSmall(
  App: unknown,
  el: Element | null,
  strongText: string,
  smallText: string
): void {
  try {
    if (!el) return;
    const s = strongText;
    const sm = smallText;
    const doc = getDoc(App, el);

    clear(el);

    if (doc && typeof doc.createElement === 'function' && typeof doc.createTextNode === 'function') {
      const strong = doc.createElement('strong');
      strong.appendChild(doc.createTextNode(s));
      el.appendChild(strong);

      if (sm) {
        el.appendChild(doc.createTextNode(' '));
        const small = doc.createElement('small');
        small.appendChild(doc.createTextNode(sm));
        el.appendChild(small);
      }
      return;
    }

    if (hasTextContent(el)) el.textContent = s + (sm ? ' ' + sm : '');
  } catch {
    // dom-best-effort: optional DOM mutation may fail on detached or hostile nodes; callers remain fail-soft.
  }
}

export function getTabs(App: unknown): HTMLElement[] {
  try {
    const qsa = getQsa(App);
    const res = qsa('.tab');
    return filterHtmlElements(Array.isArray(res) ? res : []);
  } catch {
    return [];
  }
}

export function getTabContents(App: unknown): HTMLElement[] {
  try {
    const qsa = getQsa(App);
    const res = qsa('.tab-content');
    return filterHtmlElements(Array.isArray(res) ? res : []);
  } catch {
    return [];
  }
}

export function getScrollContainer(App: unknown): HTMLElement | null {
  try {
    const qs = getQs(App);
    const el = qs('#sidebar .scroll-content');
    return isHTMLElementLike(el) ? el : null;
  } catch {
    return null;
  }
}

export function byId(App: unknown, id: string): HTMLElement | null {
  try {
    const $ = get$(App);
    const el = $(id);
    return isHTMLElementLike(el) ? el : null;
  } catch {
    return null;
  }
}
