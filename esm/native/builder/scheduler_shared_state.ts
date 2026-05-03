import type { AppContainer, BuilderSchedulerStateInternalLike } from '../../../types/index.js';

import { assertApp, reportError } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

export function ensureSchedulerState(App: AppContainer): BuilderSchedulerStateInternalLike {
  const a = assertApp(App, 'native/builder/scheduler.state');
  const B = ensureBuilderService(a, 'native/builder/scheduler.state');

  if (B.__schedulerState) return B.__schedulerState;

  const next: BuilderSchedulerStateInternalLike = {
    deps: {},
    pendingPlan: null,
    pendingReason: '',
    pendingImmediate: false,
    pendingForceBuild: false,
    debouncedRunScheduled: false,
    debouncedRunVersion: 0,
    debouncedUsesFallbackTimer: false,
    pendingScheduleVersion: 0,
    scheduleVersionSeq: 0,
    lastExecutedSignature: null,
    lastTs: 0,
    waitingForBuilder: false,
    waitingForBuilderVersion: 0,
    buildWardrobeDebounced: null,
    debugStats: undefined,
  };
  B.__schedulerState = next;
  return next;
}

export function readActiveId(App: AppContainer): string {
  const s = ensureSchedulerState(App);
  const fn = typeof s.deps.getActiveElementId === 'function' ? s.deps.getActiveElementId : null;
  if (typeof fn !== 'function') return '';

  try {
    const v = fn();
    return v ? String(v) : '';
  } catch (e) {
    reportError(App, e, { where: 'builder/scheduler', op: 'getActiveElementId' });
    return '';
  }
}
