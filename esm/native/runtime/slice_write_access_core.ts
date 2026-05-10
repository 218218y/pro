import type { ActionMetaLike, ActionsNamespaceLike } from '../../../types';

import {
  createResolvedWriteContext,
  getSliceNamespaceFromContext,
  getWriteAppLikeFromContext,
  type SliceNamespaceSurface,
  type SliceWriteAppLike,
  type SliceWriteStoreLike,
} from './slice_write_access_context.js';
import {
  hasSliceDispatchSeam,
  patchSliceWithResolvedContext,
  touchMetaWithResolvedContext,
} from './slice_write_access_dispatch.js';
import {
  createResolvedCanonicalDispatchPlan,
  dispatchResolvedCanonicalDispatchPlan,
  hasResolvedCanonicalDispatchPlan,
} from './slice_write_access_plan.js';
import { hasOwnKeys, readSingleSlicePatchRoute, readSlicePatchValue } from './slice_write_access_shared.js';
import type {
  CanonicalPatchDispatchOptions,
  MetaTouchOptions,
  SlicePatchNamespace,
  SlicePatchRoute,
  SliceWriteOptions,
} from './slice_write_access_shared.js';

export { asRecord } from './slice_write_access_shared.js';

export function getWriteAppLike(App: unknown): SliceWriteAppLike | null {
  return getWriteAppLikeFromContext(createResolvedWriteContext(App));
}

export function getWriteActions(App: unknown): ActionsNamespaceLike | null {
  return createResolvedWriteContext(App).actions;
}

export function getWriteStore(App: unknown): SliceWriteStoreLike | null {
  return createResolvedWriteContext(App).store;
}

export function getSliceNamespace(
  App: unknown,
  namespace: SlicePatchNamespace
): SliceNamespaceSurface | null {
  return getSliceNamespaceFromContext(createResolvedWriteContext(App), namespace);
}

export function getSingleSlicePatchRoute(patchObj: unknown): SlicePatchRoute | null {
  return readSingleSlicePatchRoute(patchObj);
}

export function hasSliceWriterSeam(
  App: unknown,
  namespace: SlicePatchNamespace,
  opts: SliceWriteOptions
): boolean {
  return hasSliceDispatchSeam(createResolvedWriteContext(App), namespace, opts);
}

export function patchSliceCanonical<N extends SlicePatchNamespace>(
  App: unknown,
  namespace: N,
  patchObj: unknown,
  meta: ActionMetaLike | undefined,
  opts: SliceWriteOptions
): unknown {
  const payload = readSlicePatchValue(namespace, patchObj);
  if (!hasOwnKeys(payload)) return undefined;
  return patchSliceWithResolvedContext(createResolvedWriteContext(App), namespace, payload, meta, opts);
}

export function touchMetaCanonical(App: unknown, meta?: ActionMetaLike, opts?: MetaTouchOptions): unknown {
  return touchMetaWithResolvedContext(createResolvedWriteContext(App), meta, opts);
}

export function hasCanonicalPatchDispatch(
  App: unknown,
  patchObj: unknown,
  opts?: CanonicalPatchDispatchOptions
): boolean {
  return hasResolvedCanonicalDispatchPlan(createResolvedCanonicalDispatchPlan(App, patchObj, opts));
}

export function dispatchCanonicalPatchPayload(
  App: unknown,
  patchObj: unknown,
  meta?: ActionMetaLike,
  opts?: CanonicalPatchDispatchOptions
): unknown {
  return dispatchResolvedCanonicalDispatchPlan(
    createResolvedCanonicalDispatchPlan(App, patchObj, opts),
    meta
  );
}
