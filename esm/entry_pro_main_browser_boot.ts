import { runBrowserBootRuntime } from './boot/boot_browser_runtime.js';
import {
  endPerfSpan,
  installObservabilityForBuild,
  startPerfSpan,
} from './native/runtime/observability_surface.js';

import type { AppContainer } from '../types';

import { getBootReactUiCallback } from './entry_pro_main_shared.js';

type BootReporter = (err: unknown, meta: { op: string; phase?: string }) => void;

type BrowserBootSetupOpts = {
  app: AppContainer;
  window: Window | null;
  document: Document | null;
  report: BootReporter;
};

async function mountReactUi(app: AppContainer, _w: Window, doc: Document): Promise<void> {
  const reactMod = await import('./native/ui/react/boot_react_ui.js');
  const bootReactUi = getBootReactUiCallback(reactMod, 'bootReactUi');
  if (!bootReactUi) {
    throw new Error('[WardrobePro][React] bootReactUi export is missing.');
  }
  bootReactUi({
    app,
    document: doc,
  });
}

export async function runBrowserBootSetup(opts: BrowserBootSetupOpts): Promise<void> {
  const { app: bootApp, window: bootWindow, document: bootDocument, report } = opts;
  installObservabilityForBuild(bootApp, bootWindow);
  const perfSpanId = startPerfSpan(bootApp, 'boot.browser.setup');
  try {
    await runBrowserBootRuntime({
      app: bootApp,
      window: bootWindow,
      document: bootDocument,
      report,
      mountReactUi,
      startBootUi: true,
      installBeforeUnloadGuard: true,
    });
    endPerfSpan(bootApp, perfSpanId);
  } catch (error) {
    endPerfSpan(bootApp, perfSpanId, { status: 'error', error });
    throw error;
  }
}
