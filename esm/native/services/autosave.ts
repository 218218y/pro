import { ensureAutosaveService } from '../runtime/autosave_access.js';
import { isAutosaveInstalled, markAutosaveInstalled } from '../runtime/install_state_access.js';
import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

export { captureAutosaveSnapshot } from './autosave_snapshot.js';
export { canAutosaveRun } from './autosave_shared.js';
export { commitAutosaveNow, getAutosaveService } from './autosave_runtime.js';
export { cancelAutosaveTimer, flushAutosavePending, scheduleAutosave } from './autosave_schedule.js';

import {
  bootstrapAutosaveInfoUi,
  cancelAutosaveScheduleState,
  ensureAutosaveScheduleState,
} from './autosave_shared.js';
import { commitAutosaveNow } from './autosave_runtime.js';
import { flushAutosavePending, scheduleAutosave } from './autosave_schedule.js';
import type { AppContainer, AutosaveServiceLike } from '../../../types';

type InstallableAutosaveService = AutosaveServiceLike & {
  __wpSchedule?: () => void;
  __wpCancelPending?: () => boolean;
  __wpFlushPending?: () => boolean;
  __wpForceSaveNow?: () => boolean;
};

const autosaveInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function fillAutosaveServiceSurface(
  context: InstallContext<AppContainer>,
  svc: InstallableAutosaveService
): InstallableAutosaveService {
  installStableSurfaceMethod(svc, 'schedule', '__wpSchedule', () => () => scheduleAutosave(context.App));
  installStableSurfaceMethod(svc, 'cancelPending', '__wpCancelPending', () => () => {
    cancelAutosaveScheduleState(ensureAutosaveScheduleState(context.App));
    return true;
  });
  installStableSurfaceMethod(
    svc,
    'flushPending',
    '__wpFlushPending',
    () => () => flushAutosavePending(context.App)
  );
  installStableSurfaceMethod(svc, 'forceSaveNow', '__wpForceSaveNow', () => {
    return () => {
      cancelAutosaveScheduleState(ensureAutosaveScheduleState(context.App));
      return commitAutosaveNow(context.App);
    };
  });
  return svc;
}

export function installAutosaveService(App: AppContainer): AutosaveServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installAutosaveService(App): App is required');

  const svc = ensureAutosaveService(App) as InstallableAutosaveService;
  const context = resolveInstallContext(autosaveInstallContexts, svc, App);
  fillAutosaveServiceSurface(context, svc);
  ensureAutosaveScheduleState(App);

  bootstrapAutosaveInfoUi(App);
  if (!isAutosaveInstalled(App)) markAutosaveInstalled(App);

  return svc;
}
