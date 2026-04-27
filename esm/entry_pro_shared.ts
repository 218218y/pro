import { createBootErrorPolicy } from './boot/boot_error_policy.js';
import { sanitizeHtmlByPolicy } from './native/ui/html_sanitize_runtime.js';
import type { BootErrorPolicyReportOpts } from './boot/boot_error_policy.js';

export type ErrorOverlayModule = typeof import('./native/ui/error_overlay.js');
export type EntryProMainModule = typeof import('./entry_pro_main.js');

export type BootFatalFallbackOpts = {
  document?: Document | null;
  window?: Window | null;

  title?: string;
  description?: string;
  error?: unknown;
  context?: unknown;

  helpHtml?: string;
  silentConsole?: boolean;
};

export type BootFatalFallbackController = {
  el: HTMLElement;
  show: () => void;
  hide: () => void;
};

type ProcessLike = { versions?: { node?: unknown } };
export type WindowWithFatalOverlay = Window & { __WARDROBE_PRO_FATAL_OVERLAY__?: unknown };
export type WindowWithEarlyHandlers = WindowWithFatalOverlay & { __wpEarlyHandlersInstalled?: boolean };
type AttributeTarget = { setAttribute: (name: string, value: string) => void };
type TextContentTarget = { textContent: string | null };
type HtmlContentTarget = { innerHTML: string };
type ControllerElement = HTMLElement & Pick<ParentNode, 'querySelector'>;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function hasNodeProcess(value: unknown): value is ProcessLike {
  return (
    isRecord(value) &&
    isRecord(value.versions) &&
    Object.prototype.hasOwnProperty.call(value.versions, 'node')
  );
}

function canSetAttribute(value: unknown): value is AttributeTarget {
  return isRecord(value) && typeof value.setAttribute === 'function';
}

function hasTextContent(value: unknown): value is TextContentTarget {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'textContent');
}

function hasInnerHtml(value: unknown): value is HtmlContentTarget {
  return isRecord(value) && Object.prototype.hasOwnProperty.call(value, 'innerHTML');
}

function isControllerElement(value: unknown): value is ControllerElement {
  return isRecord(value) && typeof value.querySelector === 'function' && isRecord(value.style);
}

export function isBootFatalFallbackController(value: unknown): value is BootFatalFallbackController {
  return (
    isRecord(value) &&
    isControllerElement(value.el) &&
    typeof value.show === 'function' &&
    typeof value.hide === 'function'
  );
}

export function setAttrIfPossible(target: unknown, name: string, value: string): void {
  if (canSetAttribute(target)) target.setAttribute(name, value);
}

export function setTextIfPossible(target: unknown, value: string): void {
  if (hasTextContent(target)) target.textContent = value;
}

export function setHtmlOrText(target: unknown, value: string): void {
  if (hasInnerHtml(target)) {
    target.innerHTML = sanitizeHtmlByPolicy(null, value, 'overlay-help');
    return;
  }
  setTextIfPossible(target, value);
}

export function safeText(v: unknown): string {
  try {
    const ESC: Record<string, string> = { '<': '&lt;', '>': '&gt;', '&': '&amp;' };
    return String(v || '').replace(/[<>&]/g, ch => ESC[ch] ?? ch);
  } catch (_e) {
    return '';
  }
}

export function hasDom(doc: Document | null | undefined): doc is Document {
  return !!(doc && typeof doc.createElement === 'function' && doc.body);
}

export function silentNoDom(opts: BootFatalFallbackOpts | null | undefined): boolean {
  try {
    if (opts && typeof opts.silentConsole === 'boolean') return opts.silentConsole;
    const isNode = typeof process !== 'undefined' && hasNodeProcess(process);
    return !!isNode;
  } catch (_e) {
    return false;
  }
}

export function formatError(err: unknown): { name: string; message: string; stack: string } {
  try {
    if (!err) return { name: '', message: '', stack: '' };
    if (typeof err === 'string') return { name: '', message: err, stack: '' };

    if (isRecord(err)) {
      const name = typeof err.name === 'string' ? err.name : '';
      const message = typeof err.message === 'string' ? err.message : String(err);
      const stack = typeof err.stack === 'string' ? err.stack : '';
      return { name, message, stack };
    }

    return { name: '', message: String(err), stack: '' };
  } catch (_e) {
    return { name: '', message: '', stack: '' };
  }
}

export function stableStringify(x: unknown): string {
  try {
    const seen = new Set<unknown>();
    return JSON.stringify(
      x,
      (_k, v) => {
        if (typeof v === 'function') return '[callable]';
        if (typeof v === 'bigint') return String(v);
        if (v && typeof v === 'object') {
          if (seen.has(v)) return '[Circular]';
          seen.add(v);
        }
        return v;
      },
      2
    );
  } catch (_e) {
    try {
      return String(x);
    } catch (_e2) {
      return '';
    }
  }
}

const entryBootErrorPolicy = createBootErrorPolicy({
  scope: 'entry_pro',
  defaultReportGroup: 'entry_pro',
  defaultSoftGroup: 'entry_pro',
  formatReportMessage: (group, op) => `[WardrobePro][${group}] ${op}`,
  formatSoftWarnMessage: (group, op) => `[WardrobePro][${group}] ${op}`,
});

export function shouldFailFastBoot(win: Window | null | undefined): boolean {
  return entryBootErrorPolicy.shouldFailFast(win);
}

export function reportEntryBestEffort(
  err: unknown,
  meta: { op: string; area?: string },
  opts?: BootErrorPolicyReportOpts
): void {
  entryBootErrorPolicy.reportBestEffort(
    err,
    {
      group: meta && meta.area ? String(meta.area) : 'entry_pro',
      op: meta && meta.op ? String(meta.op) : 'unknown',
    },
    opts
  );
}

export function reportEntrySoft(
  err: unknown,
  meta: { op: string; area?: string; throttleMs?: number } | null | undefined
): void {
  entryBootErrorPolicy.softWarn(err, {
    group: meta && meta.area ? String(meta.area) : 'entry_pro',
    op: meta && meta.op ? String(meta.op) : 'unknown',
    throttleMs:
      meta && typeof meta.throttleMs === 'number' && Number.isFinite(meta.throttleMs)
        ? Number(meta.throttleMs)
        : 0,
  });
}

export function getExistingController(
  win: WindowWithFatalOverlay | null
): BootFatalFallbackController | null {
  try {
    if (!win) return null;
    const raw = win.__WARDROBE_PRO_FATAL_OVERLAY__;
    if (!isBootFatalFallbackController(raw)) return null;
    return raw;
  } catch (err) {
    reportEntrySoft(err, { area: 'entry_pro', op: 'getExistingController', throttleMs: 1000 });
    return null;
  }
}

export function setController(win: WindowWithFatalOverlay | null, ctrl: BootFatalFallbackController): void {
  try {
    if (!win) return;
    win.__WARDROBE_PRO_FATAL_OVERLAY__ = ctrl;
  } catch (err) {
    reportEntrySoft(err, { area: 'entry_pro', op: 'setController', throttleMs: 1000 });
  }
}
