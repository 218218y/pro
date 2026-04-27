import type { ActionMetaLike } from '../../../types';
import {
  hasCanonicalPatchDispatch,
  hasSliceWriterSeam,
  patchSliceWithStoreFallback,
  touchMetaWithStoreFallback,
  dispatchCanonicalPatchPayload,
} from './slice_write_access_core.js';
import {
  toDedicatedCanonicalPatchDispatchOptions,
  toDedicatedMetaTouchOptions,
  toDedicatedSliceWriteOptions,
} from './slice_write_access_shared.js';
import type {
  DedicatedCanonicalPatchDispatchOptions,
  DedicatedMetaTouchOptions,
  DedicatedSliceWriteOptions,
  SlicePatchNamespace,
} from './slice_write_access_shared.js';

export function hasDedicatedSliceWriterSeam(
  App: unknown,
  namespace: SlicePatchNamespace,
  opts?: DedicatedSliceWriteOptions
): boolean {
  return hasSliceWriterSeam(App, namespace, toDedicatedSliceWriteOptions(namespace, opts));
}

export function patchSliceWithDedicatedWriter<N extends SlicePatchNamespace>(
  App: unknown,
  namespace: N,
  patchObj: unknown,
  meta?: ActionMetaLike,
  opts?: DedicatedSliceWriteOptions
): unknown {
  return patchSliceWithStoreFallback(
    App,
    namespace,
    patchObj,
    meta,
    toDedicatedSliceWriteOptions(namespace, opts)
  );
}

export function touchMetaWithDedicatedWriter(
  App: unknown,
  meta?: ActionMetaLike,
  opts?: DedicatedMetaTouchOptions
): unknown {
  return touchMetaWithStoreFallback(App, meta, toDedicatedMetaTouchOptions(opts));
}

export function hasDedicatedCanonicalPatchDispatch(
  App: unknown,
  patchObj: unknown,
  opts?: DedicatedCanonicalPatchDispatchOptions
): boolean {
  return hasCanonicalPatchDispatch(App, patchObj, toDedicatedCanonicalPatchDispatchOptions(opts));
}

export function dispatchDedicatedCanonicalPatchPayload(
  App: unknown,
  patchObj: unknown,
  meta?: ActionMetaLike,
  opts?: DedicatedCanonicalPatchDispatchOptions
): unknown {
  return dispatchCanonicalPatchPayload(App, patchObj, meta, toDedicatedCanonicalPatchDispatchOptions(opts));
}
