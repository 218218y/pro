import type { AppContainer } from '../../../types';

import { createErrorsInstallReportNonFatal } from './errors_install_support.js';
import { ensureErrorsSurface } from './errors_install_shared.js';
import { installErrorsSurfaceMethods } from './errors_install_surface.js';
import { installPlatformReportErrorBridge } from './errors_install_platform.js';
import { installErrorsWindowRuntime } from './errors_install_runtime.js';

export function installErrorsSurface(App: AppContainer): void {
  if (!App || typeof App !== 'object') return;

  const errors = ensureErrorsSurface(App);
  if (!errors) return;

  const hasHealthySurface =
    typeof errors.install === 'function' &&
    typeof errors.report === 'function' &&
    typeof errors.fatal === 'function' &&
    typeof errors.getHistory === 'function' &&
    typeof errors.createDebugSnapshot === 'function';

  if (hasHealthySurface) return;

  const reportNonFatal = createErrorsInstallReportNonFatal(App);
  installErrorsSurfaceMethods(App, errors, reportNonFatal);
  installPlatformReportErrorBridge(App, errors, reportNonFatal);
  installErrorsWindowRuntime(App, errors, reportNonFatal);
}
