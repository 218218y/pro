// App start orchestration (Pure ESM)
//
// Purpose:
// - Provide a single start entrypoint that platform boot can prefer over UI-owned boot glue.
// - Keep the existing, battle-tested UI boot behavior intact while moving orchestration ownership
//   to a dedicated service seam.
// - Create a clean place for future migration toward a thinner UI boot / richer engine boot.

import type { AppContainer, AppStartServiceLike, UnknownRecord } from '../../../types';

import { assertApp, reportError } from '../runtime/api.js';
import {
  isAppStartInstalled,
  isAppStartStarted,
  markAppStartInstalled,
  setAppStartStarted,
} from '../runtime/install_state_access.js';
import {
  ensureAppStartService,
  ensureUiBootService,
  getUiBootServiceMaybe,
} from '../runtime/boot_entry_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

const APP_START_CANONICAL_KEY = '__wpCanonicalStart';
const UI_BOOT_START_CANONICAL_KEY = '__wpCanonicalUiStart';

const appStartInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function softReport(App: AppContainer, op: string, err: unknown): void {
  try {
    reportError(App, err, { where: 'native/services/app_start', op, fatal: false });
  } catch {
    try {
      console.warn(`[WardrobePro][app_start] ${op}`, err);
    } catch {
      // ignore
    }
  }
}

function resolveUiBootEntry(App: AppContainer): (() => unknown) | null {
  try {
    const uiBoot = getUiBootServiceMaybe(App);
    if (uiBoot && typeof uiBoot.bootMain === 'function') return uiBoot.bootMain.bind(uiBoot);
  } catch {
    // ignore
  }
  return null;
}

type InstallableAppStartService = AppStartServiceLike & UnknownRecord;

function startInternal(App: AppContainer): void {
  ensureAppStartService(App);
  if (isAppStartStarted(App)) return;
  setAppStartStarted(App, true);

  const uiEntry = resolveUiBootEntry(App);
  if (typeof uiEntry !== 'function') {
    setAppStartStarted(App, false);
    throw new Error('[WardrobePro][ESM] Missing App.services.uiBoot.bootMain for appStart.start().');
  }

  try {
    uiEntry();
  } catch (err) {
    setAppStartStarted(App, false);
    softReport(App, 'uiBoot.bootMain', err);
    throw err;
  }
}

export type AppStartService = InstallableAppStartService & {
  start?: () => void;
};

function ensureCanonicalStart(context: InstallContext<AppContainer>, svc: AppStartService): () => void {
  return installStableSurfaceMethod(
    svc,
    'start',
    APP_START_CANONICAL_KEY,
    () => () => startInternal(context.App)
  );
}

function ensureUiCompatAlias(App: AppContainer, startFn: () => unknown): void {
  try {
    const uiBoot = ensureUiBootService(App);
    installStableSurfaceMethod(uiBoot, 'start', UI_BOOT_START_CANONICAL_KEY, () => startFn);
  } catch {
    // ignore
  }
}

function fillAppStartSurface(context: InstallContext<AppContainer>, svc: AppStartService): AppStartService {
  ensureCanonicalStart(context, svc);
  return svc;
}

export function installAppStartService(App: AppContainer): AppStartService {
  const app = assertApp(App, 'app_start.install');
  const svc = ensureAppStartService(app);
  const context = resolveInstallContext(appStartInstallContexts, svc, app);
  fillAppStartSurface(context, svc);

  if (!isAppStartInstalled(app)) markAppStartInstalled(app);
  if (typeof svc.start === 'function') ensureUiCompatAlias(app, svc.start);
  return svc;
}
