import type { AppContainer } from '../../../types';

import {
  fatalCtx,
  readWindowErrorMessage,
  readWindowErrorValue,
  readWindowRejectionMessage,
  readWindowRejectionValue,
  shouldIgnoreErrorMessage,
  type ReportNonFatalFn,
} from './errors_install_support.js';
import {
  getWindowMaybe,
  getErrorsWindowEventsCleanup,
  isErrorsInstalled,
  markErrorsInstalled,
  clearErrorsWindowEventsCleanup,
  setErrorsWindowEventsCleanup,
} from '../services/api.js';
import type { AppErrorsSurface } from './errors_install_shared.js';

export function installErrorsWindowRuntime(
  App: AppContainer,
  errors: AppErrorsSurface,
  reportNonFatal: ReportNonFatalFn
): void {
  errors.install = function (): void {
    const alreadyInstalled = isErrorsInstalled(App);
    const existingCleanup = getErrorsWindowEventsCleanup(App);
    if (alreadyInstalled && typeof existingCleanup === 'function') return;
    if (!alreadyInstalled) markErrorsInstalled(App);

    const win = getWindowMaybe(App);
    if (!win) return;

    clearErrorsWindowEventsCleanup(App);

    const cleanups: Array<() => void> = [];
    const bindWindowListener = (
      type: string,
      handler: EventListener,
      opts: AddEventListenerOptions
    ): void => {
      try {
        win.addEventListener(type, handler, opts);
        cleanups.push(() => {
          try {
            win.removeEventListener(type, handler, opts);
          } catch (unbindErr) {
            reportNonFatal(`window.${type}.unbind`, unbindErr, 6000);
          }
        });
      } catch (bindErr) {
        reportNonFatal(`window.${type}.bind`, bindErr, 6000);
      }
    };

    const onWindowError: EventListener = function (ev): void {
      try {
        if (shouldIgnoreErrorMessage(readWindowErrorMessage(ev))) return;
      } catch (ignoreErr) {
        reportNonFatal('window.error.ignoreFilter', ignoreErr, 6000);
      }

      try {
        errors.fatal?.(readWindowErrorValue(ev), fatalCtx('window.error'));
      } catch (fatalErr) {
        reportNonFatal('window.error.primaryFatal', fatalErr, 6000);
        try {
          errors.fatal?.(ev, fatalCtx('window.error'));
        } catch (fallbackErr) {
          reportNonFatal('window.error.fallbackFatal', fallbackErr, 6000);
        }
      }
    };

    const onUnhandledRejection: EventListener = function (ev): void {
      try {
        if (shouldIgnoreErrorMessage(readWindowRejectionMessage(ev))) return;
      } catch (ignoreErr) {
        reportNonFatal('window.unhandledrejection.ignoreFilter', ignoreErr, 6000);
      }

      try {
        errors.fatal?.(readWindowRejectionValue(ev), fatalCtx('window.unhandledrejection'));
      } catch (fatalErr) {
        reportNonFatal('window.unhandledrejection.fatal', fatalErr, 6000);
      }
    };

    bindWindowListener('error', onWindowError, { passive: true });
    bindWindowListener('unhandledrejection', onUnhandledRejection, { passive: true });
    setErrorsWindowEventsCleanup(App, () => {
      while (cleanups.length > 0) {
        const cleanup = cleanups.pop();
        cleanup?.();
      }
    });
  };
}
