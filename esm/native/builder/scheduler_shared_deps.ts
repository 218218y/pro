import type {
  AppContainer,
  BuildStateLike,
  BuilderCallable,
  BuilderSchedulerDepsLike,
} from '../../../types/index.js';

import {
  createFallbackBuildPlan,
  readBuildPlan,
  readBuildState,
  readObject,
} from './scheduler_shared_records.js';

export type GetBuildStateDep = NonNullable<BuilderSchedulerDepsLike['getBuildState']>;
export type DebounceDep = NonNullable<BuilderSchedulerDepsLike['debounce']>;

type SchedulerUtilitySurface = {
  util?: { debounce?: DebounceDep };
};

function readUtilitySurface(x: unknown): SchedulerUtilitySurface | null {
  return readObject(x);
}

function bindBuilderCallable(fn: BuilderCallable): BuilderCallable {
  return (...args) => Reflect.apply(fn, undefined, args);
}

function wrapBuilderCallable(value: unknown, defaultCallable: BuilderCallable): BuilderCallable {
  return typeof value === 'function'
    ? (...args) => Reflect.apply(value, undefined, args)
    : bindBuilderCallable(defaultCallable);
}

export function readDebounceDep(App: AppContainer, deps: BuilderSchedulerDepsLike): DebounceDep | null {
  if (typeof deps.debounce === 'function') return deps.debounce;
  const util = readUtilitySurface(App)?.util;
  return util && typeof util.debounce === 'function' ? util.debounce : null;
}

export function readGetBuildStateDep(deps: BuilderSchedulerDepsLike): GetBuildStateDep | null {
  return typeof deps.getBuildState === 'function' ? deps.getBuildState : null;
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
    out.getBuildState = uiOverride => {
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
