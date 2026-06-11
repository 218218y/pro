import { downloadJsonTextViaBrowser } from './browser_file_download.js';
import { normalizeUnknownErrorInfo } from '../services/api.js';

import type { FatalOverlayShowOptionsLike, WardrobeProFatalOverlayController } from '../../../types';

type FatalOverlayOpts = FatalOverlayShowOptionsLike;
export type FatalOverlayController = WardrobeProFatalOverlayController;
export type FatalOverlayErrorInfo = { name: string; message: string; stack: string };

type OverlayElementLike = HTMLElement & { querySelector?: unknown; style?: unknown };
export type OverlayButtonLike = { textContent?: string | null; onclick?: (() => void) | null };

type UnknownObjectRecord = Record<string, unknown>;

function _isObjectRecord(value: unknown): value is UnknownObjectRecord {
  return !!value && typeof value === 'object';
}

function _readObjectRecord(value: unknown): UnknownObjectRecord | null {
  return _isObjectRecord(value) ? value : null;
}

function _isOverlayElementLike(value: unknown): value is OverlayElementLike {
  if (!_isObjectRecord(value)) return false;
  return typeof value.querySelector === 'function' && _isObjectRecord(value.style);
}

function _isShowOverlayFn(value: unknown): value is FatalOverlayController['show'] {
  return typeof value === 'function';
}

function _isHideOverlayFn(value: unknown): value is FatalOverlayController['hide'] {
  return typeof value === 'function';
}

function _readControllerSlot(win: Window | null): unknown {
  const root = _readObjectRecord(win);
  return root ? root.__WARDROBE_PRO_FATAL_OVERLAY__ : null;
}

export function hasFatalOverlayDomDocument(doc: Document | null | undefined): doc is Document {
  return !!(doc && typeof doc.createElement === 'function' && doc.body);
}

export function readFatalOverlayButton(value: unknown): OverlayButtonLike | null {
  if (!_isObjectRecord(value)) return null;
  if (typeof value.onclick === 'undefined' || value.onclick === null || typeof value.onclick === 'function') {
    return value;
  }
  return null;
}

export function readFatalOverlayExistingController(win: Window | null): FatalOverlayController | null {
  try {
    const raw = _readControllerSlot(win);
    const maybe = _readObjectRecord(raw);
    if (!maybe) return null;
    if (!_isOverlayElementLike(maybe.el)) return null;
    if (!_isShowOverlayFn(maybe.show) || !_isHideOverlayFn(maybe.hide)) return null;
    const ctrl: FatalOverlayController = {
      ...maybe,
      el: maybe.el,
      show: maybe.show,
      hide: maybe.hide,
    };
    return ctrl;
  } catch (_e) {
    return null;
  }
}

export function setFatalOverlayController(win: Window | null, ctrl: FatalOverlayController): void {
  try {
    const root = _readObjectRecord(win);
    if (!root) return;
    root.__WARDROBE_PRO_FATAL_OVERLAY__ = ctrl;
  } catch (_e) {}
}

export function safeFatalOverlayText(value: unknown): string {
  try {
    const ESC: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
    return String(value || '').replace(/[<>&]/g, ch => ESC[ch] ?? ch);
  } catch (_e) {
    return '';
  }
}

export function shouldSilenceFatalOverlayConsole(opts: FatalOverlayOpts | null | undefined): boolean {
  try {
    return !!(opts && opts.silentConsole);
  } catch (_e) {
    return false;
  }
}

export function formatFatalOverlayError(err: unknown): FatalOverlayErrorInfo {
  try {
    const normalized = normalizeUnknownErrorInfo(err, 'Unexpected error');
    return {
      name: typeof normalized.name === 'string' ? normalized.name : '',
      message: normalized.message,
      stack: typeof normalized.stack === 'string' ? normalized.stack : '',
    };
  } catch (_e) {
    return { name: '', message: '', stack: '' };
  }
}

export function stableFatalOverlayStringify(value: unknown): string {
  try {
    const seen = new Set();
    return JSON.stringify(
      value,
      (_key, nextValue) => {
        if (typeof nextValue === 'function') return '[callable]';
        if (typeof nextValue === 'bigint') return String(nextValue);
        if (nextValue && typeof nextValue === 'object') {
          if (seen.has(nextValue)) return '[Circular]';
          seen.add(nextValue);
        }
        return nextValue;
      },
      2
    );
  } catch (_e) {
    try {
      return String(value);
    } catch (_e2) {
      return '';
    }
  }
}

export function makeFatalOverlayCopyText(opts: FatalOverlayOpts | null | undefined): string {
  const title = opts && opts.title ? String(opts.title) : 'WardrobePro error';
  const description = opts && opts.description ? String(opts.description) : '';
  const ctx = opts && opts.context ? opts.context : null;
  const snap = opts && opts.snapshot ? opts.snapshot : null;
  const info = formatFatalOverlayError(opts && opts.error ? opts.error : null);

  let out = '';
  out += title + '\n';
  if (description) out += description + '\n';
  if (ctx) out += '\nContext:\n' + stableFatalOverlayStringify(ctx) + '\n';

  if (info.name || info.message) {
    out += '\nError:\n';
    if (info.name) out += info.name + ': ';
    out += info.message + '\n';
  }
  if (info.stack) out += '\nStack:\n' + info.stack + '\n';
  if (snap) out += '\nSnapshot:\n' + stableFatalOverlayStringify(snap) + '\n';
  return out;
}

export function downloadFatalOverlayJson(
  win: Window | null,
  filename: string | undefined,
  obj: unknown
): boolean {
  try {
    return downloadJsonTextViaBrowser(
      { docMaybe: win && win.document ? win.document : null, winMaybe: win },
      filename || 'wardrobepro_debug.json',
      stableFatalOverlayStringify(obj)
    );
  } catch (_e) {
    return false;
  }
}

export function copyFatalOverlayText(win: Window | null, txt: unknown): boolean {
  try {
    if (!win) return false;
    const nav = win.navigator;
    if (nav && nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      nav.clipboard.writeText(String(txt || ''));
      return true;
    }
  } catch (_e) {}

  try {
    const doc = win && win.document;
    if (!doc || typeof doc.createElement !== 'function') return false;
    const ta = doc.createElement('textarea');
    ta.value = String(txt || '');
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
    doc.body.appendChild(ta);
    ta.select();
    doc.execCommand('copy');
    ta.remove();
    return true;
  } catch (_e2) {
    return false;
  }
}
