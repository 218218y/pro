import type { AppContainer } from '../../../types';

import type { ReportNonFatalFn } from './errors_install_support.js';
import type { AppErrorsSurface, ErrorContext, ReportErrorFn } from './errors_install_shared.js';
import { isReportErrorFn, platformSurface } from './errors_install_shared.js';

export function installPlatformReportErrorBridge(
  App: AppContainer,
  errors: AppErrorsSurface,
  reportNonFatal: ReportNonFatalFn
): void {
  try {
    const plat = platformSurface(App);
    const prev: ReportErrorFn | null = plat && isReportErrorFn(plat.reportError) ? plat.reportError : null;

    if (plat && prev && !prev.__wpErrorsSurfaceWrapped) {
      const wrapped: ReportErrorFn = function (err: unknown, ctx?: ErrorContext) {
        try {
          if (errors.report) {
            errors.report(err, ctx);
            return;
          }
        } catch (reportErr) {
          reportNonFatal('platform.reportError.wrap.errors.report', reportErr, 6000);
        }

        try {
          prev(err, ctx);
        } catch (prevErr) {
          reportNonFatal('platform.reportError.wrap.prev', prevErr, 6000);
        }
      };

      wrapped.__wpErrorsSurfaceWrapped = true;
      wrapped.__wpPrev = prev;
      plat.reportError = wrapped;
    }

    if (plat && !plat.reportError) {
      plat.reportError = function (err: unknown, ctx?: ErrorContext): void {
        try {
          errors.report?.(err, ctx);
        } catch (fallbackErr) {
          reportNonFatal('platform.reportError.installFallback', fallbackErr, 6000);
        }
      };
    }
  } catch (outerErr) {
    reportNonFatal('platform.reportError.patch.outer', outerErr, 6000);
  }
}
