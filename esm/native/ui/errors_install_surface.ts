import type { AppContainer } from '../../../types';

import { showFatalOverlay } from './error_overlay.js';
import {
  ctxFatal,
  ctxToLabel,
  buildErrorsDebugSnapshot,
  consoleReportError,
  ensureErrorsRenderLoopBestEffort,
  pushErrorHistory,
  silentConsoleForApp,
  type ReportNonFatalFn,
} from './errors_install_support.js';
import { getWindowMaybe, getDocumentMaybe, setErrorsFatalShown } from '../services/api.js';
import type { AppErrorsSurface, ErrorContext, ErrorHistoryEntry } from './errors_install_shared.js';
import { buildErrorsDebugSnapshotFallback } from './errors_install_shared.js';

const HISTORY_MAX = 30;

export function installErrorsSurfaceMethods(
  App: AppContainer,
  errors: AppErrorsSurface,
  reportNonFatal: ReportNonFatalFn
): void {
  const history: ErrorHistoryEntry[] = [];

  errors.getHistory = function (): ErrorHistoryEntry[] {
    try {
      return history.slice();
    } catch {
      return [];
    }
  };

  errors.createDebugSnapshot = function (err: unknown, ctx?: ErrorContext) {
    try {
      const snap = buildErrorsDebugSnapshot(App, err, ctx);
      snap.history = errors.getHistory ? errors.getHistory() : history.slice();
      return snap;
    } catch {
      return buildErrorsDebugSnapshotFallback(ctx);
    }
  };

  setErrorsFatalShown(App, false);

  errors.fatal = function (err: unknown, ctx?: ErrorContext): void {
    pushErrorHistory(history, 'fatal', err, ctx, reportNonFatal, HISTORY_MAX);
    consoleReportError(App, err, ctx, reportNonFatal);

    try {
      const doc = getDocumentMaybe(App);
      const win = getWindowMaybe(App);
      const label = ctxToLabel(ctx);
      const title = 'שגיאה פנימית';
      const description =
        'אירעה שגיאת Runtime בלתי צפויה. אפשר לנסות לרענן. אם זה חוזר — שמור debug.json ושלח לבדיקה.';
      const snapshot = errors.createDebugSnapshot
        ? errors.createDebugSnapshot(err, ctx)
        : buildErrorsDebugSnapshot(App, err, ctx);

      showFatalOverlay({
        document: doc,
        window: win,
        title,
        description,
        context: label,
        error: err,
        snapshot,
        silentConsole: silentConsoleForApp(App),
      });

      setErrorsFatalShown(App, true);
    } catch (overlayErr) {
      reportNonFatal('errors.fatal.showFatalOverlay', overlayErr, 6000);
    }

    ensureErrorsRenderLoopBestEffort(App, reportNonFatal);
  };

  errors.report = function (err: unknown, ctx?: ErrorContext): void {
    pushErrorHistory(history, 'report', err, ctx, reportNonFatal, HISTORY_MAX);

    try {
      if (ctxFatal(ctx)) {
        errors.fatal?.(err, ctx);
        return;
      }
    } catch (flagErr) {
      reportNonFatal('errors.report.fatalFlagCheck', flagErr, 6000);
    }

    consoleReportError(App, err, ctx, reportNonFatal);
    ensureErrorsRenderLoopBestEffort(App, reportNonFatal);
  };
}
