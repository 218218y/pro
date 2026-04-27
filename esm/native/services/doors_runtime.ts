// Native ESM implementation of doors + drawers runtime.
//
// Goals:
// - No legacy `js/**` imports on the ESM path.
// - No IIFE / implicit globals.
// - Install the canonical doors API directly onto `App.services.doors` without local install flags.
//
// Notes:
// - Keeps behavior identical to legacy `js/services/pro_services_doors_runtime.js`.
// - Avoids monkey-patching/wrapping external functions. Where other systems need
//   door-status sync (notes export CSS), this module updates `body[data-door-status]`
//   directly on state changes.

import type { AppContainer, DoorsServiceAccessLike, UnknownRecord } from '../../../types';

import { ensureDoorsService } from '../runtime/doors_access.js';
import { hasCallableContract } from '../runtime/install_idempotency_patterns.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import {
  type AppLike,
  type CaptureLocalOpenOptions,
  type DrawerId,
  type HoldEditOptions,
  type ReleaseEditHoldOptions,
  type SetDoorsOptions,
  type SyncVisualsOptions,
  ensureDoorsRuntimeDefaults,
  getDoorsLastToggleTime,
  getDoorsOpen,
  reportDoorsRuntimeNonFatal,
  setDoorStatusCss,
} from './doors_runtime_shared.js';
import {
  applyEditHoldAfterBuild,
  applyLocalOpenStateAfterBuild,
  captureLocalOpenStateBeforeBuild,
  closeAllLocal,
  closeDrawerById,
  holdOpenForEdit,
  releaseEditHold,
  setDoorsOpen,
  toggleDoors,
} from './doors_runtime_lifecycle.js';
import {
  forceUpdatePerState,
  getDrawerMetaMap,
  installDrawerMeta,
  isInternalDrawerIdStrict,
  rebuildDrawerMeta,
  snapDrawersToTargets,
  syncVisualsNow,
} from './doors_runtime_visuals.js';

export {
  getDoorsOpen,
  setDoorsOpen,
  toggleDoors,
  getDoorsLastToggleTime,
  holdOpenForEdit,
  releaseEditHold,
  applyEditHoldAfterBuild,
  closeAllLocal,
  closeDrawerById,
  captureLocalOpenStateBeforeBuild,
  applyLocalOpenStateAfterBuild,
  forceUpdatePerState,
  syncVisualsNow,
  snapDrawersToTargets,
  rebuildDrawerMeta,
  isInternalDrawerIdStrict,
  getDrawerMetaMap,
};

type DoorsServiceApi = DoorsServiceAccessLike &
  UnknownRecord & {
    getOpen?: () => boolean;
    getLastToggleTime?: () => number;
    setOpen?: (open: boolean, opts?: SetDoorsOptions) => void;
    toggle?: (opts?: SetDoorsOptions) => void;
    holdOpenForEdit?: (opts?: HoldEditOptions) => void;
    releaseEditHold?: (opts?: ReleaseEditHoldOptions) => void;
    applyEditHoldAfterBuild?: () => void;
    closeAllLocal?: () => void;
    closeDrawerById?: (id: DrawerId) => void;
    captureLocalOpenStateBeforeBuild?: (opts?: CaptureLocalOpenOptions) => void;
    applyLocalOpenStateAfterBuild?: () => void;
    forceUpdatePerState?: () => void;
    syncVisualsNow?: (opts?: SyncVisualsOptions) => void;
    snapDrawersToTargets?: () => void;
  };

type DoorsServiceInstallSurface = DoorsServiceApi & {
  __wpGetOpen?: () => boolean;
  __wpGetLastToggleTime?: () => number;
  __wpSetOpen?: (open: boolean, opts?: SetDoorsOptions) => void;
  __wpToggle?: (opts?: SetDoorsOptions) => void;
  __wpHoldOpenForEdit?: (opts?: HoldEditOptions) => void;
  __wpReleaseEditHold?: (opts?: ReleaseEditHoldOptions) => void;
  __wpApplyEditHoldAfterBuild?: () => void;
  __wpCloseAllLocal?: () => void;
  __wpCloseDrawerById?: (id: DrawerId) => void;
  __wpCaptureLocalOpenStateBeforeBuild?: (opts?: CaptureLocalOpenOptions) => void;
  __wpApplyLocalOpenStateAfterBuild?: () => void;
  __wpForceUpdatePerState?: () => void;
  __wpSyncVisualsNow?: (opts?: SyncVisualsOptions) => void;
  __wpSnapDrawersToTargets?: () => void;
};

const doorsServiceInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function resolveDoorsServiceInstallContext(
  service: DoorsServiceInstallSurface,
  App: AppContainer
): InstallContext<AppContainer> {
  return resolveInstallContext(doorsServiceInstallContexts, service, App);
}

/**
 * @param {AppContainer} App
 * @returns {UnknownRecord}
 */
export function installDoorsRuntimeService(App: AppContainer): UnknownRecord {
  if (!App || typeof App !== 'object') throw new Error('installDoorsRuntimeService(App): App is required');

  const appLike: AppLike = App;
  ensureDoorsRuntimeDefaults(appLike);
  installDrawerMeta(appLike);

  const doorsSvc = ensureDoorsService(App) as DoorsServiceInstallSurface;
  const context = resolveDoorsServiceInstallContext(doorsSvc, App);

  installStableSurfaceMethod(doorsSvc, 'getOpen', '__wpGetOpen', () => () => getDoorsOpen(context.App));
  installStableSurfaceMethod(doorsSvc, 'getLastToggleTime', '__wpGetLastToggleTime', () => {
    return () => getDoorsLastToggleTime(context.App);
  });
  installStableSurfaceMethod(doorsSvc, 'setOpen', '__wpSetOpen', () => {
    return (open: boolean, opts?: SetDoorsOptions): void => setDoorsOpen(context.App, open, opts);
  });
  installStableSurfaceMethod(doorsSvc, 'toggle', '__wpToggle', () => {
    return (opts?: SetDoorsOptions): void => toggleDoors(context.App, opts);
  });
  installStableSurfaceMethod(doorsSvc, 'holdOpenForEdit', '__wpHoldOpenForEdit', () => {
    return (opts?: HoldEditOptions): void => holdOpenForEdit(context.App, opts);
  });
  installStableSurfaceMethod(doorsSvc, 'releaseEditHold', '__wpReleaseEditHold', () => {
    return (opts?: ReleaseEditHoldOptions): void => releaseEditHold(context.App, opts);
  });
  installStableSurfaceMethod(doorsSvc, 'applyEditHoldAfterBuild', '__wpApplyEditHoldAfterBuild', () => {
    return (): void => applyEditHoldAfterBuild(context.App);
  });
  installStableSurfaceMethod(doorsSvc, 'closeAllLocal', '__wpCloseAllLocal', () => {
    return (): void => closeAllLocal(context.App);
  });
  installStableSurfaceMethod(doorsSvc, 'closeDrawerById', '__wpCloseDrawerById', () => {
    return (id: DrawerId): void => closeDrawerById(context.App, id);
  });
  installStableSurfaceMethod(
    doorsSvc,
    'captureLocalOpenStateBeforeBuild',
    '__wpCaptureLocalOpenStateBeforeBuild',
    () => {
      return (opts?: CaptureLocalOpenOptions): void => captureLocalOpenStateBeforeBuild(context.App, opts);
    }
  );
  installStableSurfaceMethod(
    doorsSvc,
    'applyLocalOpenStateAfterBuild',
    '__wpApplyLocalOpenStateAfterBuild',
    () => {
      return (): void => applyLocalOpenStateAfterBuild(context.App);
    }
  );
  installStableSurfaceMethod(doorsSvc, 'forceUpdatePerState', '__wpForceUpdatePerState', () => {
    return (): void => forceUpdatePerState(context.App);
  });
  installStableSurfaceMethod(doorsSvc, 'syncVisualsNow', '__wpSyncVisualsNow', () => {
    return (opts?: SyncVisualsOptions): void => syncVisualsNow(context.App, opts);
  });
  installStableSurfaceMethod(doorsSvc, 'snapDrawersToTargets', '__wpSnapDrawersToTargets', () => {
    return (): void => snapDrawersToTargets(context.App);
  });

  if (
    !hasCallableContract<DoorsServiceApi>(doorsSvc, [
      'getOpen',
      'getLastToggleTime',
      'setOpen',
      'toggle',
      'holdOpenForEdit',
      'releaseEditHold',
      'applyEditHoldAfterBuild',
      'closeAllLocal',
      'closeDrawerById',
      'captureLocalOpenStateBeforeBuild',
      'applyLocalOpenStateAfterBuild',
      'forceUpdatePerState',
      'syncVisualsNow',
      'snapDrawersToTargets',
    ])
  ) {
    throw new Error('installDoorsRuntimeService(App): canonical doors service contract is incomplete');
  }

  try {
    setDoorStatusCss(context.App, getDoorsOpen(context.App));
  } catch (_) {
    reportDoorsRuntimeNonFatal('L889', _);
  }

  return doorsSvc;
}
