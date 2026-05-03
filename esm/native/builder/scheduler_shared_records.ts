import type {
  BuildPlanLike,
  BuildStateLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

export type AnyObj = Record<string, unknown>;
export type SchedulerPendingPlan = BuilderSchedulerStateInternalLike['pendingPlan'];

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

export function readBuildPlan(x: unknown): BuildPlanLike | null {
  return isBuildPlanLike(x) ? x : null;
}

export function readBuildSignature(state: BuildStateLike): unknown {
  const build = readObject(state.build);
  return build?.signature ?? null;
}

export function createFallbackBuildPlan(state: BuildStateLike): BuildPlanLike {
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
