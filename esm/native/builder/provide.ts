// Builder provider (Pure ESM)
//
// Purpose:
// - Replace long boot-time installer chains with a single explicit entry point.
// - Keep initialization order explicit and idempotent.
// - Canonicalize builder public API onto `App.services.builder`.

import type {
  AppContainer,
  BuildPlanLike,
  BuilderPlanServiceLike,
  BuilderServiceLike,
} from '../../../types/index.js';

import { assertApp } from '../runtime/api.js';
import { getBuilderDepsRoot } from '../runtime/builder_deps_access.js';
import { ensureBuilderService, getBuilderPlanService } from '../runtime/builder_service_access.js';

import { installBuilderCorePure } from './core_pure.js';
import { installBuilderPlan } from './plan.js';
import { installBuilderScheduler } from './scheduler.js';
import { installBuilderRenderAdapter } from './render_adapter.js';
import { installBuilderRegistry } from './registry.js';
import { installBuilderRenderOps } from './render_ops.js';
import { installBuilderRenderOpsExtras } from './render_ops_extras.js';
import { installBuilderVisualsAndContents } from './visuals_and_contents.js';
import { installBuilderCornerWing } from './corner_wing_install.js';
import { installBuilderMaterialsFactory } from './materials_factory.js';
import { installBuilderMaterialsApply } from './materials_apply.js';
import { installBuilderHandlesV7 } from './handles.js';
import { installBuilderBootstrap } from './bootstrap.js';

type AnyObj = Record<string, unknown>;
type AppWithDeps = AppContainer & { deps?: AnyObj | null };
type BuilderServiceRecord = BuilderServiceLike & AnyObj;
type BuilderDepsLike = { getActiveElementId?: (() => string) | null };
type PlanServiceLike = BuilderPlanServiceLike & {
  createBuildPlan?: ((input: unknown, meta?: AnyObj) => BuildPlanLike) | null;
};

function isObjectRecord(x: unknown): x is AnyObj {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function readNestedObject(root: unknown, key: string): AnyObj | null {
  if (!isObjectRecord(root)) return null;
  const value = root[key];
  return isObjectRecord(value) ? value : null;
}

function readBuilderDeps(root: unknown): BuilderDepsLike | null {
  const rec = isObjectRecord(root) ? root : null;
  if (!rec) return null;
  return typeof rec.getActiveElementId === 'function' || typeof rec.getActiveElementId === 'undefined'
    ? rec
    : null;
}

function hasProvidedFlag(root: unknown): boolean {
  const rec = isObjectRecord(root) ? root : null;
  return rec?.__provided_v1 === true;
}

export function isBuilderProvided(App: AppContainer): boolean {
  try {
    const services = readNestedObject(App, 'services');
    const builder = services ? readNestedObject(services, 'builder') : null;
    return hasProvidedFlag(builder);
  } catch {
    return false;
  }
}

/**
 * Public boot entry point.
 */
export function provideBuilder(App: AppContainer): BuilderServiceLike {
  const A: AppWithDeps = assertApp(App, 'native/builder/provide');

  // No hard kernel dependency here: plan/scheduler prefer canonical store/actions seams.
  // Any remaining compat probing is centralized in builder/store_access helpers.

  // Canonical namespace:
  // - Builder is a service: `App.services.builder`.
  // - We avoid writing to `App.builder` (legacy compatibility should migrate off it).
  const B: BuilderServiceRecord = ensureBuilderService(A, 'native/builder/provide');

  // Idempotency marker lives on the canonical namespace.
  if (B.__provided_v1 === true) {
    // Still refresh builder deps wiring (fill-missing) when called again.
    try {
      installBuilderBootstrap(A);
    } catch {
      // ignore
    }
    return B;
  }

  // ---------------------------------------------------------------------------
  // Core pure computations (DOM-free, THREE-free)
  // ---------------------------------------------------------------------------
  installBuilderCorePure(A);

  // ---------------------------------------------------------------------------
  // Render adapter (scene wiring)
  // ---------------------------------------------------------------------------
  installBuilderRenderAdapter(A);

  // ---------------------------------------------------------------------------
  // Builder registry + render ops
  // ---------------------------------------------------------------------------
  installBuilderRegistry(A);
  installBuilderRenderOps(A);
  installBuilderRenderOpsExtras(A);

  // ---------------------------------------------------------------------------
  // Visuals/modules + contents
  // ---------------------------------------------------------------------------
  installBuilderVisualsAndContents(A);
  installBuilderCornerWing(A);

  // ---------------------------------------------------------------------------
  // Materials
  // ---------------------------------------------------------------------------
  installBuilderMaterialsFactory(A);
  installBuilderMaterialsApply(A);

  // ---------------------------------------------------------------------------
  // Handles (UI interaction affordances)
  // ---------------------------------------------------------------------------
  installBuilderHandlesV7(A);

  // ---------------------------------------------------------------------------
  // Plan + Scheduler
  // ---------------------------------------------------------------------------
  installBuilderPlan(A, { App: A });

  const plan: PlanServiceLike | null = getBuilderPlanService(A);
  const createBuildPlan = typeof plan?.createBuildPlan === 'function' ? plan.createBuildPlan : null;
  const getActiveElementId = (() => {
    try {
      const bdeps = readBuilderDeps(getBuilderDepsRoot(A));
      const fn = typeof bdeps?.getActiveElementId === 'function' ? bdeps.getActiveElementId : null;
      return typeof fn === 'function' ? fn : () => '';
    } catch {
      return () => '';
    }
  })();

  installBuilderScheduler(A, {
    createBuildPlan: typeof createBuildPlan === 'function' ? createBuildPlan : null,
    getActiveElementId,
  });

  // ---------------------------------------------------------------------------
  // Builder deps (explicit dependency surface for BuilderCore)
  // ---------------------------------------------------------------------------
  // IMPORTANT: bootstrap is designed to be safely callable multiple times.
  // We call it here so BuilderCore (loaded later) can start immediately.
  try {
    installBuilderBootstrap(A);
  } catch {
    // ignore
  }

  // Mark provider as installed.
  try {
    B.__provided_v1 = true;
  } catch {
    // ignore
  }

  return B;
}
