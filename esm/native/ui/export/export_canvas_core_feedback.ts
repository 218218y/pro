// WardrobePro — Export canvas app/browser/UI feedback seams (Native ESM)

import type {
  AppContainer,
  BrowserNamespaceLike,
  ClipboardItemCtorLike,
  UiFeedbackNamespaceLike,
} from '../../../../types/app.js';
import type { UnknownRecord } from '../../../../types/common.js';
import {
  assertApp,
  getBrowserSurfaceMaybe,
  getUiFeedback,
  reportError,
  reportErrorThrottled,
  shouldFailFast,
} from '../../services/api.js';
import { isConstructorLike, isRecord } from './export_canvas_core_shared.js';

type ExportUiFeedbackLike = Pick<UiFeedbackNamespaceLike, 'toast' | 'showToast' | 'confirm'> & UnknownRecord;

type _ToastFn = (msg: string, kind?: string) => unknown;
type _ConfirmFn = (title: string, msg: string, onYes?: () => void) => unknown;

export function _guard<T>(App: AppContainer, op: string, fn: (() => T) | null | undefined): T | undefined {
  if (typeof fn !== 'function') return undefined;
  try {
    return fn();
  } catch (e) {
    _reportExportError(App, op, e, { guard: true });
    if (shouldFailFast(App)) throw e;
    return undefined;
  }
}

export function _reportExportError(
  App: AppContainer,
  op: string,
  error: unknown,
  extra?: Record<string, unknown> | null
): void {
  reportError(App, error, {
    where: 'native/ui/export_canvas',
    op,
    ...(extra && typeof extra === 'object' ? extra : {}),
  });
}

export function _exportReportThrottled(
  App: AppContainer,
  op: string,
  error: unknown,
  opts?: { throttleMs?: number; failFast?: boolean } | null
): void {
  const throttleMs =
    opts && typeof opts.throttleMs === 'number' && Number.isFinite(opts.throttleMs)
      ? Math.max(0, opts.throttleMs)
      : 750;

  reportErrorThrottled(App, error, {
    where: 'native/ui/export_canvas',
    op,
    throttleMs,
    failFast: !!(opts && opts.failFast),
  });
}

const __exportReportNonFatalNoAppLastByOp = new Map<string, number>();

export function _exportReportNonFatalNoApp(op: string, error: unknown, throttleMs = 1500): void {
  try {
    const now =
      typeof performance !== 'undefined' && typeof performance.now === 'function'
        ? performance.now()
        : Date.now();
    const prev = __exportReportNonFatalNoAppLastByOp.get(op) ?? -Infinity;
    if (throttleMs > 0 && now - prev < throttleMs) return;
    __exportReportNonFatalNoAppLastByOp.set(op, now);
    if (typeof console !== 'undefined' && console && typeof console.warn === 'function') {
      console.warn(`[WardrobePro][export][soft-noapp] ${op}`, error);
    }
  } catch {
    // ignore console/clock failures in low-level soft reporting
  }
}

export function _requireApp(app: unknown): AppContainer {
  return assertApp(app, 'ui/export_canvas');
}

export function readBrowserNamespace(app: AppContainer): BrowserNamespaceLike | null {
  return getBrowserSurfaceMaybe(app);
}

function isExportUiFeedbackLike(value: unknown): value is ExportUiFeedbackLike {
  if (!isRecord(value)) return false;
  return (
    (typeof value.toast === 'undefined' || typeof value.toast === 'function') &&
    (typeof value.showToast === 'undefined' || typeof value.showToast === 'function') &&
    (typeof value.confirm === 'undefined' || typeof value.confirm === 'function')
  );
}

export function readUiFeedback(app: AppContainer): ExportUiFeedbackLike | null {
  const feedback = getUiFeedback(app);
  return isExportUiFeedbackLike(feedback) ? feedback : null;
}

export function readClipboardItemCtor(browser: BrowserNamespaceLike | null): ClipboardItemCtorLike | null {
  if (!browser || typeof browser.getClipboardItemCtor !== 'function') return null;
  const ctor = browser.getClipboardItemCtor();
  return isConstructorLike(ctor) ? ctor : null;
}

function _getToastFn(App: AppContainer): _ToastFn | null {
  try {
    const fb = readUiFeedback(App);
    const toast = fb?.toast;
    if (typeof toast === 'function') {
      return (msg: string, kind?: string) => Reflect.apply(toast, fb, [msg, kind]);
    }
    const showToast = fb?.showToast;
    if (typeof showToast === 'function') {
      return (msg: string, kind?: string) => Reflect.apply(showToast, fb, [msg, kind]);
    }
  } catch (e) {
    _exportReportThrottled(App, 'getToastFn.uiFeedback', e, { throttleMs: 2000 });
  }

  return null;
}

export function _toast(App: AppContainer, msg: string, kind?: string): unknown {
  try {
    const fn = _getToastFn(App);
    if (fn) return fn(msg, kind || 'info');
  } catch (e) {
    _exportReportThrottled(App, 'toast.invoke', e, { throttleMs: 2000 });
  }
  return undefined;
}

function _getConfirmFn(App: AppContainer): _ConfirmFn | null {
  try {
    const fb = readUiFeedback(App);
    const confirm = fb?.confirm;
    if (typeof confirm === 'function') {
      return (title: string, msg: string, onYes?: () => void) =>
        Reflect.apply(confirm, fb, [title, msg, onYes]);
    }
  } catch (e) {
    _exportReportThrottled(App, 'getConfirmFn.uiFeedback', e, { throttleMs: 2000 });
  }

  return null;
}

export function _confirmOrProceed(
  App: AppContainer,
  title: string,
  msg: string,
  onYes?: () => void
): unknown {
  try {
    const fn = _getConfirmFn(App);
    if (fn) return fn(title, msg, onYes);
  } catch (e) {
    _exportReportThrottled(App, 'confirmOrProceed.invokeConfirm', e, { throttleMs: 2000 });
  }
  try {
    if (typeof onYes === 'function') onYes();
  } catch (e) {
    _exportReportThrottled(App, 'confirmOrProceed.onYes', e, { throttleMs: 2000 });
  }
  return undefined;
}
