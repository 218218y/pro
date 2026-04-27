// UI boot / Three.js renderer initialization (Native ESM)
//
// Converted from `js/ui/pro_ui_boot_main.js` to a real ESM module:
// - No IIFE
// - No implicit reliance on `window App` (accepts an App reference)
// - No auto-run on import (call `installUiBootMain(App)` explicitly)
//
// Installs entrypoints:
// - App.services.uiBoot.bootMain
import {
  get$,
  getDocumentMaybe,
  ensureUiBootService,
  isUiBootMainInstalled,
  markUiBootMainInstalled,
  beginUiBootSession,
  clearUiBootRuntimeState,
  installUiBootReadyTimers,
  installStableSurfaceMethod,
} from '../services/api.js';
import {
  createUiBootReporter,
  ensureUiBootModelsLoaded,
  ensureUiBootViewportContext,
  installUiBootInteractions,
  installUiBootStoreSeedAndHistory,
  primeUiBootCamera,
} from './ui_boot_controller_runtime.js';

import type { AppContainer, UnknownRecord } from '../../../types';

type UiBootServiceLike = UnknownRecord & {
  bootMain?: () => void;
  start?: () => void;
};

const UI_BOOT_MAIN_CANONICAL_KEY = '__wpCanonicalUiBootMain';

type UiBootInstallable = UiBootServiceLike & {
  __wpCanonicalUiBootMain?: () => void;
};

export function bootMain(App: AppContainer) {
  if (!App || typeof App !== 'object') return;
  const doc = getDocumentMaybe(App);
  if (!doc) return;

  if (!beginUiBootSession(App)) return;

  const reporter = createUiBootReporter(App);

  try {
    ensureUiBootModelsLoaded(App, reporter);

    // React UI renders camera/undo/redo overlays and does not rely on attribute-based click delegation delegation.
    const $ = get$(App);
    const container = $('viewer-container');
    if (!container) throw new Error('[WardrobePro] viewer-container not found');

    const ctx = ensureUiBootViewportContext(App, container, reporter);
    primeUiBootCamera(App, reporter);
    installUiBootStoreSeedAndHistory(App, reporter);
    installUiBootInteractions(App, ctx, reporter);
    installUiBootReadyTimers(App, reporter.soft);
  } catch (err) {
    clearUiBootRuntimeState(App);
    throw err;
  }
}

export function installUiBootMain(App: AppContainer) {
  if (!App || typeof App !== 'object') return null;

  const uiBoot = ensureUiBootService(App) as UiBootInstallable;
  const canonicalBootMain = installStableSurfaceMethod(uiBoot, 'bootMain', UI_BOOT_MAIN_CANONICAL_KEY, () => {
    return () => bootMain(App);
  });
  const currentStart = typeof uiBoot.start === 'function' ? uiBoot.start : null;
  const canonicalStart = currentStart || canonicalBootMain;

  if (uiBoot.start !== canonicalStart) uiBoot.start = canonicalStart;
  if (!isUiBootMainInstalled(App)) markUiBootMainInstalled(App);

  return uiBoot;
}
