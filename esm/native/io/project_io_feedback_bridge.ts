// Project I/O UI/browser bridge.
//
// Keeps load-feedback and browser-metadata lookup out of the owner installer.

import type { AppContainer, UnknownRecord } from '../../../types/index.js';
import { formatDisplayScalar, readDisplayScalar } from '../../shared/display_text_shared.js';

import { getUiFeedback } from '../runtime/service_access.js';
import { getUserAgentMaybe, readBrowserStringMaybe } from '../runtime/api.js';

type ReportFn = (op: string, err: unknown, throttleMs?: number) => void;
type ProjectIoFeedbackOptions = UnknownRecord & {
  userAgent?: string;
};

export type ProjectIoFeedbackBridge = {
  showToast: (message: unknown, type?: unknown) => void;
  userAgent: string | null;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function asOptions(value: unknown): ProjectIoFeedbackOptions | null {
  return isRecord(value) ? value : null;
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
  const userAgent = readUserAgent(App, opts);

  const showToast: ProjectIoFeedbackBridge['showToast'] = function (message: unknown, type?: unknown) {
    const uiFeedback = getUiFeedback(App);
    const rawShowToast = uiFeedback.toast || uiFeedback.showToast || null;
    if (typeof rawShowToast === 'function') {
      try {
        rawShowToast(
          formatDisplayScalar(readDisplayScalar(message)),
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
      reportNonFatal('ui.toast.console', err, 6000);
    }
  };

  return {
    showToast,
    userAgent,
  };
}
