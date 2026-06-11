import type { AppContainer, TimeoutHandleLike } from '../../../types/index.js';

import { getBrowserTimers, reportError } from '../runtime/api.js';
import { readDebounceDep } from './scheduler_shared_deps.js';
import { ensureSchedulerState } from './scheduler_shared_state.js';

type DebouncedRunnerOpts = {
  readScheduledVersion?: (() => number) | null;
  onStaleTimerFire?: (() => void) | null;
};

type BuilderWaitScheduleOpts = {
  version?: number;
  onStaleWakeup?: (() => void) | null;
};

function clearTimeoutHandle(
  clearFn: (handle: TimeoutHandleLike | undefined) => void,
  handle: TimeoutHandleLike
): void {
  try {
    clearFn(handle);
  } catch {
    // The scheduler can keep running even if a host-provided timer clear throws.
  }
}

function createDebouncedRunner(
  App: AppContainer,
  fn: () => void,
  ms: number,
  opts?: DebouncedRunnerOpts | null
): () => void {
  const fire = () => {
    const state = ensureSchedulerState(App);
    if (!state.debouncedRunScheduled) return;
    fn();
  };

  const s = ensureSchedulerState(App);
  const debounce = readDebounceDep(App, s.deps);
  if (typeof debounce === 'function') {
    s.debouncedUsesFallbackTimer = false;
    const debounced = debounce(fire, ms);
    return () => {
      Reflect.apply(debounced, undefined, []);
    };
  }

  s.debouncedUsesFallbackTimer = true;
  let pendingHandle: TimeoutHandleLike | undefined;
  const handleVersions = new Map<TimeoutHandleLike, number>();
  return () => {
    const scheduledVersion =
      typeof opts?.readScheduledVersion === 'function' ? Number(opts.readScheduledVersion() || 0) : 0;
    const fireWhenCurrent = (handle: TimeoutHandleLike | undefined) => {
      if (pendingHandle === handle) pendingHandle = undefined;
      const capturedVersion =
        handle !== undefined && handleVersions.has(handle)
          ? Number(handleVersions.get(handle) || 0)
          : scheduledVersion;
      if (handle !== undefined) handleVersions.delete(handle);
      const state = ensureSchedulerState(App);
      if (capturedVersion > 0) {
        const activeVersion = typeof state.debouncedRunVersion === 'number' ? state.debouncedRunVersion : 0;
        if (!state.debouncedRunScheduled || activeVersion !== capturedVersion) {
          if (typeof opts?.onStaleTimerFire === 'function') opts.onStaleTimerFire();
          return;
        }
      }
      fire();
    };

    const timers = getBrowserTimers(App);
    if (pendingHandle !== undefined) {
      handleVersions.delete(pendingHandle);
      clearTimeoutHandle(timers.clearTimeout, pendingHandle);
    }
    let nextHandle: TimeoutHandleLike | undefined;
    nextHandle = timers.setTimeout(() => {
      fireWhenCurrent(nextHandle);
    }, ms);
    pendingHandle = nextHandle;
    if (nextHandle !== undefined) handleVersions.set(nextHandle, scheduledVersion);
  };
}

export function makeDebouncedBuild(
  App: AppContainer,
  runPendingBuild: (reason: string) => void,
  opts?: DebouncedRunnerOpts | null
): () => void {
  return createDebouncedRunner(App, () => runPendingBuild('debounced'), 60, opts);
}

export function scheduleBuilderWait(
  App: AppContainer,
  runPendingBuild: (reason: string) => void,
  reasonIn: unknown = 'builder-ready',
  opts?: BuilderWaitScheduleOpts | null
): void {
  const s = ensureSchedulerState(App);
  if (s.waitingForBuilder) return;
  s.waitingForBuilder = true;

  const runReason = typeof reasonIn === 'string' && reasonIn.trim() ? reasonIn.trim() : 'builder-ready';

  const scheduledVersion = typeof opts?.version === 'number' ? Math.max(0, opts.version) : 0;
  if (scheduledVersion > 0) s.waitingForBuilderVersion = scheduledVersion;

  const run = () => {
    const current = ensureSchedulerState(App);
    const activeVersion =
      typeof current.waitingForBuilderVersion === 'number' ? current.waitingForBuilderVersion : 0;
    if (!current.waitingForBuilder || (scheduledVersion > 0 && activeVersion !== scheduledVersion)) {
      if (typeof opts?.onStaleWakeup === 'function') opts.onStaleWakeup();
      return;
    }
    current.waitingForBuilder = false;
    current.waitingForBuilderVersion = 0;
    try {
      runPendingBuild(runReason);
    } catch (e) {
      reportError(App, e, { where: 'builder/scheduler', op: 'runPendingBuild(wait)' });
    }
  };

  const timers = getBrowserTimers(App);
  timers.setTimeout(run, 0);
}
