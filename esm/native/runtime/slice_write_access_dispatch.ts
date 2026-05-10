import type { ActionMetaLike, PatchPayload } from '../../../types';

import { createSliceWriteOptions, hasOwnKeys, toRootPatchPayload } from './slice_write_access_shared.js';
import type {
  MetaTouchDispatchTarget,
  MetaTouchOptions,
  RootPatchDispatchTarget,
  SliceDispatchTarget,
  SlicePatchNamespace,
  SlicePatchValue,
  SliceWriteOptions,
} from './slice_write_access_shared.js';
import type { ResolvedWriteContext } from './slice_write_access_context.js';
import {
  resolveMetaTouchDispatchTargets,
  resolveRootPatchDispatchTargets,
  resolveSliceDispatchTargets,
} from './slice_write_access_dispatch_order.js';
import type { RootPatchDispatchOptions } from './slice_write_access_dispatch_order.js';
import {
  dispatchMetaTouchTarget,
  dispatchRootPatchTarget,
  dispatchSliceTarget,
  hasMetaTouchDispatchTargetSeam,
  hasRootPatchDispatchSeamForTarget,
  hasSliceDispatchTargetSeam,
  type RootPayloadReader,
} from './slice_write_access_dispatch_targets.js';

export {
  resolveCanonicalMetaTouchOptions,
  resolveMetaTouchDispatchTargets,
  resolveRootPatchDispatchTargets,
  resolveSliceDispatchTargets,
  type RootPatchDispatchOptions,
} from './slice_write_access_dispatch_order.js';

const READ_ROOT_PAYLOAD_UNSUPPORTED: RootPayloadReader = () => {
  throw new Error(
    '[WardrobePro] Unexpected root payload read: dispatch targets do not require root patch targets'
  );
};

function sliceDispatchTargetsNeedRootPayload(targets: readonly SliceDispatchTarget[]): boolean {
  for (const target of targets) {
    if (target === 'rootActionPatch' || target === 'rootStorePatch') return true;
  }
  return false;
}

export function hasSliceDispatchSeam<N extends SlicePatchNamespace>(
  context: ResolvedWriteContext,
  namespace: N,
  opts: SliceWriteOptions,
  targets: readonly SliceDispatchTarget[] = resolveSliceDispatchTargets(opts)
): boolean {
  return targets.some(target => hasSliceDispatchTargetSeam(context, namespace, opts, target));
}

export function hasMetaTouchDispatchSeam(
  context: ResolvedWriteContext,
  opts?: MetaTouchOptions,
  targets: readonly MetaTouchDispatchTarget[] = resolveMetaTouchDispatchTargets(opts)
): boolean {
  return targets.some(target => hasMetaTouchDispatchTargetSeam(context, target));
}

export function hasRootPatchDispatchSeam(
  context: ResolvedWriteContext,
  targets: readonly RootPatchDispatchTarget[] = resolveRootPatchDispatchTargets()
): boolean {
  return targets.some(target => hasRootPatchDispatchSeamForTarget(context, target));
}

function dispatchRootPatchWithResolvedContext(
  context: ResolvedWriteContext,
  createPayload: () => PatchPayload,
  meta: ActionMetaLike | undefined,
  targets: readonly RootPatchDispatchTarget[]
): unknown {
  let rootPayload: PatchPayload | null = null;
  const readRootPayload = (): PatchPayload => {
    if (!rootPayload) {
      rootPayload = createPayload();
    }
    return rootPayload;
  };

  for (const target of targets) {
    const out = dispatchRootPatchTarget(context, target, readRootPayload, meta);
    if (out !== undefined) return out;
  }

  return undefined;
}

export function patchSliceWithResolvedContext<N extends SlicePatchNamespace>(
  context: ResolvedWriteContext,
  namespace: N,
  payload: SlicePatchValue<N>,
  meta: ActionMetaLike | undefined,
  opts: SliceWriteOptions,
  targets: readonly SliceDispatchTarget[] = resolveSliceDispatchTargets(opts)
): unknown {
  if (!hasOwnKeys(payload)) return undefined;

  const needsRootPayload = sliceDispatchTargetsNeedRootPayload(targets);
  let rootPayload: PatchPayload | null = null;
  const readRootPayload: RootPayloadReader = needsRootPayload
    ? () => {
        if (!rootPayload) {
          rootPayload = toRootPatchPayload(namespace, payload);
        }
        return rootPayload;
      }
    : READ_ROOT_PAYLOAD_UNSUPPORTED;

  for (const target of targets) {
    if (!hasSliceDispatchTargetSeam(context, namespace, opts, target)) continue;
    const out = dispatchSliceTarget({ context, namespace, payload, meta, opts, target, readRootPayload });
    if (target === 'storeWriter') return out;
    if (out !== undefined) return out;
  }

  return undefined;
}

export function touchMetaWithResolvedContext(
  context: ResolvedWriteContext,
  meta?: ActionMetaLike,
  opts?: MetaTouchOptions,
  targets: readonly MetaTouchDispatchTarget[] = resolveMetaTouchDispatchTargets(opts)
): unknown {
  for (const target of targets) {
    if (!hasMetaTouchDispatchTargetSeam(context, target)) continue;
    const out = dispatchMetaTouchTarget(context, target, meta);
    if (target === 'metaStoreWriter') return out;
    if (out !== undefined) return out;
  }

  return undefined;
}

export function patchRootWithResolvedContext(
  context: ResolvedWriteContext,
  payload: PatchPayload,
  meta?: ActionMetaLike,
  targets: readonly RootPatchDispatchTarget[] = resolveRootPatchDispatchTargets()
): unknown {
  return dispatchRootPatchWithResolvedContext(context, () => payload, meta, targets);
}

export function createDefaultSliceWriteOptions(
  namespace: SlicePatchNamespace,
  opts?: RootPatchDispatchOptions
): SliceWriteOptions {
  return createSliceWriteOptions(namespace, opts);
}
