// Project I/O UI/browser bridge.
//
// Keeps prompt/confirm/toast/browser-adapter lookup out of the owner installer.

import type { AppContainer, UnknownRecord } from '../../../types/index.js';

import { getUiFeedback } from '../runtime/service_access.js';
import {
  getBrowserMethodMaybe,
  getUserAgentMaybe,
  readBrowserStringMaybe,
  getWindowMaybe,
} from '../runtime/api.js';

type ReportFn = (op: string, err: unknown, throttleMs?: number) => void;
type ConfirmFn = (message: string) => boolean;
type VoidCallback = () => void;
type ProjectIoFeedbackOptions = UnknownRecord & {
  confirm?: ConfirmFn;
  userAgent?: string;
};

export type ProjectIoFeedbackBridge = {
  showToast: (message: unknown, type?: unknown) => void;
  openCustomConfirm: (title: unknown, message: unknown, onConfirm: unknown, onCancel?: unknown) => void;
  userAgent: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asOptions(value: unknown): ProjectIoFeedbackOptions | null {
  return isRecord(value) ? value : null;
}

function toVoidCallback(value: unknown): VoidCallback | null {
  return typeof value === 'function' ? () => Reflect.apply(value, null, []) : null;
}

function readConfirmFn(App: AppContainer, opts: ProjectIoFeedbackOptions): ConfirmFn | null {
  if (typeof opts.confirm === 'function') return opts.confirm;
  const browserConfirm = getBrowserMethodMaybe<[string], boolean>(App, 'confirm');
  if (browserConfirm) return browserConfirm;
  const win = getWindowMaybe(App);
  return win && typeof win.confirm === 'function' ? win.confirm.bind(win) : null;
}

function readUserAgent(App: AppContainer, opts: ProjectIoFeedbackOptions): string | null {
  if (typeof opts.userAgent === 'string') return opts.userAgent;
  return readBrowserStringMaybe(App, 'userAgent') || getUserAgentMaybe(App);
}

export function createProjectIoFeedbackBridge(
  App: AppContainer,
  options: UnknownRecord | undefined,
  reportNonFatal: ReportFn
): ProjectIoFeedbackBridge {
  const opts = asOptions(options) || {};
  const confirmFn = readConfirmFn(App, opts);
  const userAgent = readUserAgent(App, opts);

  const showToast: ProjectIoFeedbackBridge['showToast'] = function (message: unknown, type?: unknown) {
    const uiFeedback = getUiFeedback(App);
    const rawShowToast = uiFeedback.toast || uiFeedback.showToast || null;
    if (typeof rawShowToast === 'function') {
      try {
        rawShowToast(
          String(message == null ? '' : message),
          typeof type === 'string' && type ? type : undefined
        );
        return;
      } catch (err) {
        reportNonFatal('ui.toast.bridge', err, 6000);
      }
    }

    try {
      console.log('[toast]', type || 'info', message);
    } catch (err) {
      reportNonFatal('ui.toast.fallback', err, 6000);
    }
  };

  const openCustomConfirm: ProjectIoFeedbackBridge['openCustomConfirm'] = function (
    title: unknown,
    message: unknown,
    onConfirm: unknown,
    onCancel?: unknown
  ) {
    const onConfirmCb = toVoidCallback(onConfirm) || (() => undefined);
    const onCancelCb = toVoidCallback(onCancel);

    const uiFeedback = getUiFeedback(App);
    const rawOpenCustomConfirm = uiFeedback.confirm || uiFeedback.openCustomConfirm || null;
    if (typeof rawOpenCustomConfirm === 'function') {
      try {
        rawOpenCustomConfirm(
          String(title == null ? '' : title),
          String(message == null ? '' : message),
          onConfirmCb,
          onCancelCb
        );
        return;
      } catch (err) {
        reportNonFatal('ui.confirm.bridge', err, 6000);
      }
    }

    try {
      const ok = typeof confirmFn === 'function' ? !!confirmFn(String(message || title || '')) : false;
      if (ok) onConfirmCb();
      if (!ok && onCancelCb) onCancelCb();
    } catch (err) {
      reportNonFatal('ui.confirm.fallback', err, 6000);
      if (onCancelCb) onCancelCb();
    }
  };

  return {
    showToast,
    openCustomConfirm,
    userAgent,
  };
}
