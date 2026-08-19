import { runBrowserBootRuntime } from './boot/boot_browser_runtime.js';
import {
  endPerfSpan,
  installObservabilityForBuild,
  startPerfSpan,
} from './native/runtime/observability_surface.js';

import type { AppContainer } from '../types';

import { installBrowserCspTelemetry } from './native/adapters/browser/csp_telemetry.js';
import { getBootReactUiCallback } from './entry_pro_main_shared.js';

type BootReporter = (err: unknown, meta: { op: string; phase?: string }) => void;
type BootReactUiCallback = NonNullable<ReturnType<typeof getBootReactUiCallback>>;

type BrowserBootSetupOpts = {
  app: AppContainer;
  window: Window | null;
  document: Document | null;
  report: BootReporter;
};

async function loadBootReactUi(app: AppContainer): Promise<BootReactUiCallback> {
  const perfSpanId = startPerfSpan(app, 'boot.browser.react-module-load');
  try {
    const reactMod = await import('./native/ui/react/boot_react_ui.js');
    const bootReactUi = getBootReactUiCallback(reactMod, 'bootReactUi');
    if (!bootReactUi) {
      throw new Error('[WardrobePro][React] bootReactUi export is missing.');
    }
    endPerfSpan(app, perfSpanId);
    return bootReactUi;
  } catch (error) {
    endPerfSpan(app, perfSpanId, { status: 'error', error });
    throw error;
  }
}

export async function runBrowserBootSetup(opts: BrowserBootSetupOpts): Promise<void> {
  const { app: bootApp, window: bootWindow, document: bootDocument, report } = opts;
  installBrowserCspTelemetry(bootWindow, bootDocument);
  installObservabilityForBuild(bootApp, bootWindow);
  const bootReactUi = bootWindow && bootDocument ? await loadBootReactUi(bootApp) : null;
  const perfSpanId = startPerfSpan(bootApp, 'boot.browser.setup');
  try {
    await runBrowserBootRuntime({
      app: bootApp,
      window: bootWindow,
      document: bootDocument,
      report,
      mountReactUi: bootReactUi
        ? (app, _win, doc) => {
            bootReactUi({ app, document: doc });
          }
        : null,
      startBootUi: true,
      installBeforeUnloadGuard: true,
    });
    endPerfSpan(bootApp, perfSpanId);
  } catch (error) {
    endPerfSpan(bootApp, perfSpanId, { status: 'error', error });
    throw error;
  }
}
