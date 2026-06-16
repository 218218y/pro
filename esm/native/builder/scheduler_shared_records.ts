import type {
  BuildPlanLike,
  BuildStateLike,
  BuilderSchedulerStateInternalLike,
} from '../../../types/index.js';

import { readBuildInputFingerprintFromState } from './build_input_fingerprint.js';
import { readBuildStructureSignature } from './build_structure_signature.js';

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
  return readBuildStructureSignature(state);
}

export function readStateInputFingerprint(state: BuildStateLike | null | undefined): unknown {
  return readBuildInputFingerprintFromState(state, next => readBuildSignature(next as BuildStateLike));
}

export function readPlanInputFingerprint(plan: unknown): unknown {
  const rec = readObject(plan);
  if (!rec || !Object.prototype.hasOwnProperty.call(rec, 'inputFingerprint')) return null;
  return typeof rec.inputFingerprint === 'undefined' ? null : rec.inputFingerprint;
}

export function createDefaultBuildPlan(state: BuildStateLike): BuildPlanLike {
  return {
    kind: 'buildPlan_v1',
    createdAt: Date.now(),
    state,
    signature: readBuildSignature(state),
    inputFingerprint: readStateInputFingerprint(state),
  };
}

export function readPlanState(plan: unknown): BuildStateLike | null {
  const rec = readObject(plan);
  return readBuildState(rec?.state);
}

export function createPendingPlanFromState(state: BuildStateLike): {
  state: BuildStateLike;
  inputFingerprint: unknown;
} {
  return { state, inputFingerprint: readStateInputFingerprint(state) };
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
