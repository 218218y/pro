import type {
  AppContainer,
  UnknownRecord,
  BuildStateLike,
  BuildPlanLike,
  BuilderSchedulerDepsLike,
  BuilderSchedulerStateInternalLike,
  BuilderServiceLike,
  BuilderCallable,
  TimeoutHandleLike,
} from '../../../types/index.js';

import { assertApp, reportError, getBrowserTimers } from '../runtime/api.js';
import { isBootReady as isAppBootReady, isLifecycleBootReady } from '../runtime/app_roots_access.js';
import {
  ensureBuilderService,
  getBuilderBuildWardrobe,
  hasBuilderBuildWardrobe,
} from '../runtime/builder_service_access.js';
import { getBuildStateMaybe } from './store_access.js';

export type AnyObj = Record<string, unknown>;
export type GetBuildStateDep = NonNullable<BuilderSchedulerDepsLike['getBuildState']>;
export type DebounceDep = NonNullable<BuilderSchedulerDepsLike['debounce']>;
export type SchedulerPendingPlan = BuilderSchedulerStateInternalLike['pendingPlan'];

type SchedulerUtilitySurface = {
  util?: { debounce?: DebounceDep };
};

type DebouncedRunnerOpts = {
  readScheduledVersion?: (() => number) | null;
  onStaleTimerFire?: (() => void) | null;
};

type BuilderWaitScheduleOpts = {
  version?: number;
  onStaleWakeup?: (() => void) | null;
};

function isObject(x: unknown): x is AnyObj {
  return !!x && typeof x === 'object';
}

export function readObject(x: unknown): AnyObj | null {
  return isObject(x) ? x : null;
}

export function readBuildState(x: unknown): BuildStateLike | null {
  return readObject(x);
}

function isBuildPlanLike(value: unknown): value is BuildPlanLike {
  const rec = readObject(value);
  if (!rec) return false;
  return typeof rec.kind === 'string' && typeof rec.createdAt === 'number' && !!readBuildState(rec.state);
}

function readBuildPlan(x: unknown): BuildPlanLike | null {
  return isBuildPlanLike(x) ? x : null;
}

function readUtilitySurface(x: unknown): SchedulerUtilitySurface | null {
  return readObject(x);
}

function createFallbackBuildPlan(state: BuildStateLike): BuildPlanLike {
  return {
    kind: 'buildPlan_v1',
    createdAt: Date.now(),
    state,
    signature: readBuildSignature(state),
  };
}

export function readPlanState(plan: unknown): BuildStateLike | null {
  const rec = readObject(plan);
  return readBuildState(rec?.state);
}

export function createPendingPlanFromState(state: BuildStateLike): { state: BuildStateLike } {
  return { state };
}

function readDebounceDep(App: AppContainer, deps: BuilderSchedulerDepsLike): DebounceDep | null {
  if (typeof deps.debounce === 'function') return deps.debounce;
  const util = readUtilitySurface(App)?.util;
  return util && typeof util.debounce === 'function' ? util.debounce : null;
}

function readGetBuildStateDep(deps: BuilderSchedulerDepsLike): GetBuildStateDep | null {
  return typeof deps.getBuildState === 'function' ? deps.getBuildState : null;
}

export type BuilderCoreLike = BuilderServiceLike & {
  buildWardrobe?: (state: BuildStateLike) => unknown;
};

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

function bindBuilderCallable(fn: BuilderCallable): BuilderCallable {
  return (...args) => Reflect.apply(fn, undefined, args);
}

function wrapBuilderCallable(value: unknown, fallback: BuilderCallable): BuilderCallable {
  return typeof value === 'function'
    ? (...args) => Reflect.apply(value, undefined, args)
    : bindBuilderCallable(fallback);
}

export function normalizeSchedulerDeps(deps: unknown): BuilderSchedulerDepsLike {
  const d = readObject(deps) || {};
  const out: BuilderSchedulerDepsLike = {};

  const createBuildPlan = d.createBuildPlan;
  if (typeof createBuildPlan === 'function') {
    out.createBuildPlan = (state: BuildStateLike) => {
      const plan = Reflect.apply(createBuildPlan, d, [state]);
      return readBuildPlan(plan) || createFallbackBuildPlan(state);
    };
  }

  const debounce = d.debounce;
  if (typeof debounce === 'function') {
    out.debounce = (fn: () => void, ms?: number) =>
      wrapBuilderCallable(Reflect.apply(debounce, d, [fn, ms]), fn);
  }

  const getBuildState = d.getBuildState;
  if (typeof getBuildState === 'function') {
    out.getBuildState = (uiOverride: UnknownRecord | null) => {
      const value = Reflect.apply(getBuildState, d, [uiOverride]);
      return readBuildState(value) || {};
    };
  }

  const getActiveElementId = d.getActiveElementId;
  if (typeof getActiveElementId === 'function') {
    out.getActiveElementId = () => {
      const value = Reflect.apply(getActiveElementId, d, []);
      return value == null ? '' : String(value);
    };
  }

  return out;
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

export function isBootReady(App: AppContainer): boolean {
  return isAppBootReady(App) || isLifecycleBootReady(App);
}

export function getBuilderCore(App: AppContainer): BuilderCoreLike | null {
  const buildWardrobe = getBuilderBuildWardrobe(App);
  return typeof buildWardrobe === 'function' ? { buildWardrobe } : null;
}

export function hasBuilder(App: AppContainer): boolean {
  return hasBuilderBuildWardrobe(App);
}

export function callBuild(App: AppContainer, state: BuildStateLike): unknown {
  const buildWardrobe = getBuilderBuildWardrobe(App);
  return typeof buildWardrobe === 'function' ? buildWardrobe(state) : null;
}

export function getBuildStateForScheduler(
  App: AppContainer,
  uiOverride: UnknownRecord | null
): BuildStateLike {
  const fromCanonical = getBuildStateMaybe(App, uiOverride);
  if (fromCanonical && typeof fromCanonical === 'object') return fromCanonical;

  const s = ensureSchedulerState(App);
  const getBuildStateDep = readGetBuildStateDep(s.deps);
  if (typeof getBuildStateDep === 'function') {
    const st = getBuildStateDep(uiOverride);
    return readBuildState(st) || {};
  }

  throw new Error('[WardrobePro] builder getBuildState seam is missing (actions/store seam not installed?)');
}

export function readBuildSignature(state: BuildStateLike): unknown {
  const build = readObject(state.build);
  return build?.signature ?? null;
}

export function getBuildPlanForScheduler(App: AppContainer, uiOverride: UnknownRecord | null): BuildPlanLike {
  const s = ensureSchedulerState(App);
  const state = getBuildStateForScheduler(App, uiOverride);

  const createBuildPlan = typeof s.deps.createBuildPlan === 'function' ? s.deps.createBuildPlan : null;
  if (typeof createBuildPlan === 'function') {
    let plan: unknown = null;
    try {
      plan = createBuildPlan(state);
    } catch (e) {
      reportError(App, e, { where: 'builder/scheduler', op: 'createBuildPlan' });
      plan = null;
    }

    const planObj = readBuildPlan(plan);
    if (planObj) {
      if (!readBuildState(planObj.state)) planObj.state = state;
      return planObj;
    }
  }

  return createFallbackBuildPlan(state);
}

export function withTransientBuildFlags(
  state: BuildStateLike,
  activeId: string,
  forceBuild: boolean
): BuildStateLike {
  if (!activeId && !forceBuild) return state;
  const ui = readObject(state.ui);
  if (!ui) return state;
  const nextUi: AnyObj = Object.assign({}, ui);
  if (activeId) nextUi.__activeId = activeId;
  if (forceBuild) nextUi.forceBuild = true;
  return Object.assign({}, state, { ui: nextUi });
}

function clearTimeoutHandle(
  clearFn: (handle: TimeoutHandleLike | undefined) => void,
  handle: TimeoutHandleLike
): void {
  try {
    clearFn(handle);
  } catch {
    // swallow
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
