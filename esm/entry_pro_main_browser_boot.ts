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

async function mountReactUi(app: AppContainer, w: Window, doc: Document): Promise<void> {
  const reactMod = await import('./native/ui/react/boot_react_ui.js');
  const bootReactUi = getBootReactUiCallback(reactMod, 'bootReactUi');
  if (!bootReactUi) return;
  bootReactUi({
    app,
    window: w,
    document: doc,
    mountId: 'reactSidebarRoot',
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
      addReactBodyClass: true,
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
