// Native Builder Plan (ESM)
//
// Converted from `js/builder/pro_builder_plan.js` into a real ES module.
//
// Goals:
// - DOM-free and THREE-free.
// - No implicit globals / IIFE side-effects.
// - Pure DI: no module-level App state.
// - Canonical API lives on `App.services.builder.plan` (no `App.builder.*`).

import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { assertApp } from '../runtime/api.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { getBuildStateMaybe } from './store_access.js';

import type { AppContainer, BuildPlanLike, BuildStateLike, BuilderPlanServiceLike } from '../../../types';

type ValueRecord = Record<string, unknown>;

const BUILDER_PLAN_CREATE_CANONICAL_KEY = '__wpBuilderCreateBuildPlan';

type PlanDepsLike = {
  App?: AppContainer;
  getBuildState?: ((input: unknown) => unknown) | null;
};

type BuildShapeLike = {
  signature?: unknown;
  modulesStructure?: unknown;
};

type BuilderPlanInstallSurface = BuilderPlanServiceLike &
  ValueRecord & {
    __esm_v1?: boolean;
    __deps?: ValueRecord;
    __planDeps?: PlanDepsLike;
    __wpBuilderCreateBuildPlan?: (input: unknown, meta?: ValueRecord) => BuildPlanLike;
  };

function isValueRecord(x: unknown): x is ValueRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function readValueRecord(x: unknown): ValueRecord | null {
  return isValueRecord(x) ? x : null;
}

function __readPlanDeps(deps: unknown): PlanDepsLike | null {
  const rec = readValueRecord(deps);
  if (!rec) return null;
  const out: PlanDepsLike = {};
  try {
    if (rec.App && typeof rec.App === 'object') out.App = assertApp(rec.App, 'builder/plan.setPlanDeps');
  } catch {
    // ignore invalid App-like input
  }
  if (typeof rec.getBuildState === 'function') {
    const getBuildState = rec.getBuildState;
    out.getBuildState = (input: unknown) => Reflect.apply(getBuildState, rec, [input]);
  }
  return out;
}

function readBuildShape(state: BuildStateLike): BuildShapeLike | null {
  const envelope = readValueRecord(state);
  return envelope ? readValueRecord(envelope.build) : null;
}

function readDoorsCount(moduleShape: unknown): number | null {
  const rec = readValueRecord(moduleShape);
  if (!rec || rec.doors == null) return null;
  const parsed = Number.parseInt(String(rec.doors), 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBuildState(value: unknown): BuildStateLike | null {
  const rec = readValueRecord(value);
  if (!rec) return null;
  if (!('ui' in rec || 'config' in rec || 'mode' in rec || 'runtime' in rec || 'build' in rec)) return null;
  return {
    ...rec,
    ui: readValueRecord(rec.ui) || {},
    config: readValueRecord(rec.config) || {},
    mode: readValueRecord(rec.mode) || { primary: 'none', opts: {} },
    runtime: readValueRecord(rec.runtime) || {},
    build: readValueRecord(rec.build) || {},
  };
}

/**
 * Normalize and pick the plan dependencies.
 */
export function setPlanDeps(deps: unknown): PlanDepsLike {
  const d = __readPlanDeps(deps);
  return d ? { ...d } : {};
}

function readBuilderPlanInstallSurface(value: unknown): BuilderPlanInstallSurface | null {
  return readValueRecord(value);
}

function readInstalledPlanDeps(plan: BuilderPlanInstallSurface): PlanDepsLike {
  const deps = plan.__planDeps;
  return deps ? { ...deps } : {};
}

function updateInstalledPlanDeps(plan: BuilderPlanInstallSurface, deps: PlanDepsLike): void {
  plan.__planDeps = { ...deps };
}

function shouldInvalidateLegacyPlanSurface(plan: BuilderPlanInstallSurface): boolean {
  return plan.__esm_v1 === true && typeof plan[BUILDER_PLAN_CREATE_CANONICAL_KEY] !== 'function';
}

function ensureState(input: unknown, deps: PlanDepsLike): BuildStateLike {
  const current = normalizeBuildState(input);
  if (current) return current;

  try {
    const getBuildState = typeof deps.getBuildState === 'function' ? deps.getBuildState : null;
    if (getBuildState) {
      const st = normalizeBuildState(getBuildState(input));
      if (st) return st;
    }
  } catch {
    // ignore
  }

  try {
    const app = deps.App;
    if (app && typeof app === 'object') {
      const st = normalizeBuildState(getBuildStateMaybe(app, input));
      if (st) return st;
    }
  } catch {
    // ignore
  }

  const ui = readValueRecord(input) || {};
  return { ui, config: {}, mode: { primary: 'none', opts: {} }, runtime: {}, build: {} };
}

function computeSignature(state: BuildStateLike): number[] | null {
  try {
    const build = readBuildShape(state);
    if (!build) return null;

    if (Array.isArray(build.signature)) {
      return build.signature.filter(
        (value): value is number => typeof value === 'number' && Number.isFinite(value)
      );
    }

    if (Array.isArray(build.modulesStructure)) {
      return build.modulesStructure.map(moduleShape => readDoorsCount(moduleShape) ?? 1);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Create a build plan from input (ui override or state), meta and injected deps.
 */
export function createBuildPlan(
  input: unknown,
  meta?: ValueRecord,
  deps?: ValueRecord | PlanDepsLike
): BuildPlanLike {
  const d = __readPlanDeps(deps) || {};
  const st = ensureState(input, d);
  const sig = computeSignature(st);

  return {
    kind: 'buildPlan_v1',
    createdAt: Date.now(),
    state: st,
    signature: sig,
    meta: readValueRecord(meta) || {},
  };
}

export const builderPlan = {
  createBuildPlan,
  setPlanDeps,
};

/**
 * Install Builder Plan service onto App.services.builder.plan
 */
export function installBuilderPlan(App: AppContainer, deps?: unknown): BuilderPlanServiceLike {
  const builderService = ensureBuilderService(App, 'native/builder/plan.install');
  const normalizedDeps = setPlanDeps(Object.assign({ App }, __readPlanDeps(deps) || {}));

  const plan: BuilderPlanInstallSurface = readBuilderPlanInstallSurface(builderService.plan) || {};
  builderService.plan = plan;

  updateInstalledPlanDeps(plan, normalizedDeps);

  if (shouldInvalidateLegacyPlanSurface(plan)) {
    delete plan.createBuildPlan;
  }

  installStableSurfaceMethod(plan, 'createBuildPlan', BUILDER_PLAN_CREATE_CANONICAL_KEY, () => {
    return (input2: unknown, meta2?: ValueRecord): BuildPlanLike =>
      createBuildPlan(input2, meta2, readInstalledPlanDeps(plan));
  });

  // Expose deps for debugging / future migration.
  try {
    const depsRecord = readValueRecord(plan.__deps) || {};
    if ('App' in normalizedDeps) depsRecord.App = normalizedDeps.App ?? null;
    plan.__deps = depsRecord;
  } catch {
    // ignore
  }

  try {
    plan.__esm_v1 = true;
  } catch {
    // ignore
  }

  return plan;
}
