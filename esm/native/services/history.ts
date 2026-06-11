// Native ESM implementation of the History push scheduling service.
//
// Goals:
// - No legacy `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Installs stable service APIs on `App.services.history` (no top-level `App.history` shim).
// - Debounce state is owned per-App/per-service (no module-global timer bleed across app instances).
//
// New code may import and call the exported functions directly.

import type {
  ActionMetaLike,
  AppContainer,
  HistoryPushRequestLike,
  HistoryServiceLike,
} from '../../../types';

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  type InstallableHistoryServiceLike,
  ensureHistoryRuntimeState,
  ensureInstallableHistoryService,
} from './history_shared.js';
import { cancelPendingPush, flushPendingPush, hasPendingPush, schedulePush } from './history_schedule.js';
import { pause, resume } from './history_runtime.js';

export {
  type HistoryRuntimeState,
  type InstallableHistoryServiceLike,
  ensureHistoryRuntimeState,
  hasPendingPush,
} from './history_shared.js';

export { cancelPendingPush, flushPendingPush, schedulePush } from './history_schedule.js';
export { pause, pushNow, resume } from './history_runtime.js';

/**
 * @param {AppContainer} App
 * @returns {import('../../../types').HistoryServiceLike}
 */
type InstallableHistoryServiceStableRefs = InstallableHistoryServiceLike & {
  __wpSchedulePush?: (action?: ActionMetaLike) => void;
  __wpFlushPendingPush?: (opts?: HistoryPushRequestLike) => void;
  __wpCancelPendingPush?: () => void;
  __wpHasPendingPush?: () => boolean;
  __wpPause?: () => void;
  __wpResume?: () => void;
};

type HistoryInstallContext = {
  App: AppContainer;
};

const historyInstallContexts = new WeakMap<object, HistoryInstallContext>();

function createHistoryInstallContext(App: AppContainer): HistoryInstallContext {
  return { App };
}

function refreshHistoryInstallContext(
  context: HistoryInstallContext,
  App: AppContainer
): HistoryInstallContext {
  context.App = App;
  return context;
}

function resolveHistoryInstallContext(
  svc: InstallableHistoryServiceStableRefs,
  App: AppContainer
): HistoryInstallContext {
  let context = historyInstallContexts.get(svc);
  if (!context) {
    context = createHistoryInstallContext(App);
    historyInstallContexts.set(svc, context);
    return context;
  }
  return refreshHistoryInstallContext(context, App);
}

export function installHistoryService(App: AppContainer): HistoryServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installHistoryService(App): App is required');

  const svc = ensureInstallableHistoryService(App) as InstallableHistoryServiceStableRefs | null;
  if (!svc) throw new Error('installHistoryService(App): failed to init App.services.history');

  ensureHistoryRuntimeState(App);

  const context = resolveHistoryInstallContext(svc, App);

  installStableSurfaceMethod(svc, 'schedulePush', '__wpSchedulePush', () => {
    return (action?: ActionMetaLike) => schedulePush(context.App, action);
  });
  installStableSurfaceMethod(svc, 'flushPendingPush', '__wpFlushPendingPush', () => {
    return (opts?: HistoryPushRequestLike) => flushPendingPush(context.App, opts);
  });
  installStableSurfaceMethod(svc, 'cancelPendingPush', '__wpCancelPendingPush', () => {
    return () => cancelPendingPush(context.App);
  });
  installStableSurfaceMethod(svc, 'hasPendingPush', '__wpHasPendingPush', () => {
    return () => hasPendingPush(context.App);
  });
  installStableSurfaceMethod(svc, 'pause', '__wpPause', () => {
    return () => pause(context.App);
  });
  installStableSurfaceMethod(svc, 'resume', '__wpResume', () => {
    return () => resume(context.App);
  });

  return svc;
}
