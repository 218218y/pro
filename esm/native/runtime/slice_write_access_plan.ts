import type { ActionMetaLike, PatchPayload } from '../../../types';

import { createResolvedWriteContext, type ResolvedWriteContext } from './slice_write_access_context.js';
import {
  createDefaultSliceWriteOptions,
  hasMetaTouchDispatchSeam,
  hasRootPatchDispatchSeam,
  hasSliceDispatchSeam,
  patchRootWithResolvedContext,
  patchSliceWithResolvedContext,
  resolveCanonicalMetaTouchOptions,
  resolveMetaTouchDispatchTargets,
  resolveRootFallbackDispatchTargets,
  resolveSliceDispatchTargets,
  touchMetaWithResolvedContext,
} from './slice_write_access_dispatch.js';
import {
  asRecord,
  getDefinedPatchKeys,
  hasOwnKeys,
  readPatchPayload,
  readSingleSlicePatchRoute,
} from './slice_write_access_shared.js';
import type {
  CanonicalPatchDispatchOptions,
  MetaTouchDispatchTarget,
  MetaTouchOptions,
  RootPatchDispatchTarget,
  SliceDispatchTarget,
  SlicePatchRoute,
  SliceWriteOptions,
} from './slice_write_access_shared.js';

export type CanonicalDispatchRoute =
  | {
      kind: 'noop';
    }
  | {
      kind: 'metaTouch';
      metaTouchOptions: MetaTouchOptions;
      targets: readonly MetaTouchDispatchTarget[];
    }
  | {
      kind: 'slicePatch';
      route: SlicePatchRoute;
      sliceOptions: SliceWriteOptions;
      targets: readonly SliceDispatchTarget[];
    }
  | {
      kind: 'rootPatch';
      payload: PatchPayload;
      targets: readonly RootPatchDispatchTarget[];
    };

export type ResolvedCanonicalDispatchPlan = {
  context: ResolvedWriteContext | null;
  route: CanonicalDispatchRoute;
};

export function resolveCanonicalDispatchRoute(
  patchObj: unknown,
  opts?: CanonicalPatchDispatchOptions
): CanonicalDispatchRoute {
  const patch = asRecord(patchObj) ?? {};
  const keys = getDefinedPatchKeys(patch);

  if (!keys.length) {
    const metaTouchOptions = resolveCanonicalMetaTouchOptions(opts);
    return {
      kind: 'metaTouch',
      metaTouchOptions,
      targets: resolveMetaTouchDispatchTargets(metaTouchOptions),
    };
  }

  const route = readSingleSlicePatchRoute(patch);
  if (route) {
    const sliceOptions =
      opts?.sliceOptions?.[route.namespace] ??
      createDefaultSliceWriteOptions(route.namespace, {
        allowRootActionPatchFallback: opts?.allowRootActionPatchFallback,
        allowRootStorePatchFallback: opts?.allowRootStorePatchFallback,
      });
    return {
      kind: 'slicePatch',
      route,
      sliceOptions,
      targets: resolveSliceDispatchTargets(sliceOptions),
    };
  }

  const payload = readPatchPayload(patch);
  if (!hasOwnKeys(payload)) {
    return {
      kind: 'noop',
    };
  }

  return {
    kind: 'rootPatch',
    payload,
    targets: resolveRootFallbackDispatchTargets(opts),
  };
}

function hasCanonicalDispatchRouteWithResolvedContext(
  context: ResolvedWriteContext,
  route: CanonicalDispatchRoute
): boolean {
  if (route.kind === 'noop') {
    return false;
  }

  if (route.kind === 'metaTouch') {
    return hasMetaTouchDispatchSeam(context, route.metaTouchOptions, route.targets);
  }

  if (route.kind === 'slicePatch') {
    return hasSliceDispatchSeam(context, route.route.namespace, route.sliceOptions, route.targets);
  }

  return hasRootPatchDispatchSeam(context, route.targets);
}

function dispatchCanonicalRouteWithResolvedContext(
  context: ResolvedWriteContext,
  route: CanonicalDispatchRoute,
  meta?: ActionMetaLike
): unknown {
  if (route.kind === 'noop') {
    return undefined;
  }

  if (route.kind === 'metaTouch') {
    return touchMetaWithResolvedContext(context, meta, route.metaTouchOptions, route.targets);
  }

  if (route.kind === 'slicePatch') {
    return patchSliceWithResolvedContext(
      context,
      route.route.namespace,
      route.route.payload,
      meta,
      route.sliceOptions,
      route.targets
    );
  }

  return patchRootWithResolvedContext(context, route.payload, meta, route.targets);
}

export function createResolvedCanonicalDispatchPlan(
  App: unknown,
  patchObj: unknown,
  opts?: CanonicalPatchDispatchOptions
): ResolvedCanonicalDispatchPlan {
  const route = resolveCanonicalDispatchRoute(patchObj, opts);
  return {
    context: route.kind === 'noop' ? null : createResolvedWriteContext(App),
    route,
  };
}

export function hasResolvedCanonicalDispatchPlan(plan: ResolvedCanonicalDispatchPlan): boolean {
  return !!plan.context && hasCanonicalDispatchRouteWithResolvedContext(plan.context, plan.route);
}

export function dispatchResolvedCanonicalDispatchPlan(
  plan: ResolvedCanonicalDispatchPlan,
  meta?: ActionMetaLike
): unknown {
  return plan.context ? dispatchCanonicalRouteWithResolvedContext(plan.context, plan.route, meta) : undefined;
}
