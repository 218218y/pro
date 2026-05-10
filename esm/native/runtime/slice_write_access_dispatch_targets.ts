import type { ActionMetaLike, PatchPayload } from '../../../types';

import { callDedicatedMetaStoreWriter, readSlicePatchValue } from './slice_write_access_shared.js';
import type {
  MetaTouchDispatchTarget,
  RootPatchDispatchTarget,
  SliceDispatchTarget,
  SlicePatchNamespace,
  SlicePatchValue,
  SliceStoreWriter,
  SliceWriteOptions,
} from './slice_write_access_shared.js';
import {
  getSliceNamespaceFromContext,
  type ResolvedWriteContext,
  type SliceWriteStoreLike,
} from './slice_write_access_context.js';

export type RootPayloadReader = () => PatchPayload;

type RootPatchTargetHandler = {
  hasSeam: (context: ResolvedWriteContext) => boolean;
  dispatch: (
    context: ResolvedWriteContext,
    readRootPayload: RootPayloadReader,
    meta?: ActionMetaLike
  ) => unknown;
};

type MetaTouchTargetHandler = {
  hasSeam: (context: ResolvedWriteContext) => boolean;
  dispatch: (context: ResolvedWriteContext, meta?: ActionMetaLike) => unknown;
};

type SliceStoreWriterHandler = {
  hasSeam: (store: SliceWriteStoreLike | null) => boolean;
  dispatch: <N extends SlicePatchNamespace>(
    store: SliceWriteStoreLike,
    namespace: N,
    payload: SlicePatchValue<N>,
    meta?: ActionMetaLike
  ) => unknown;
};

type SliceDispatchTargetHandler = {
  hasSeam: <N extends SlicePatchNamespace>(
    context: ResolvedWriteContext,
    namespace: N,
    opts: SliceWriteOptions
  ) => boolean;
  dispatch: <N extends SlicePatchNamespace>(args: {
    context: ResolvedWriteContext;
    namespace: N;
    payload: SlicePatchValue<N>;
    meta?: ActionMetaLike;
    opts: SliceWriteOptions;
    readRootPayload: RootPayloadReader;
  }) => unknown;
};

export const ROOT_PATCH_TARGET_HANDLERS: Record<RootPatchDispatchTarget, RootPatchTargetHandler> = {
  rootActionPatch: {
    hasSeam: context => !!context.rootPatchAction,
    dispatch: (context, readRootPayload, meta) => context.rootPatchAction?.(readRootPayload(), meta),
  },
  rootStorePatch: {
    hasSeam: context => typeof context.store?.patch === 'function',
    dispatch: (context, readRootPayload, meta) => context.store?.patch?.(readRootPayload(), meta),
  },
};

export const META_TOUCH_TARGET_HANDLERS: Record<MetaTouchDispatchTarget, MetaTouchTargetHandler> = {
  metaTouch: {
    hasSeam: context => !!context.liveMetaTouchAction,
    dispatch: (context, meta) => context.liveMetaTouchAction?.(meta),
  },
  metaStoreWriter: {
    hasSeam: context => typeof context.store?.setMeta === 'function',
    dispatch: (context, meta) => callDedicatedMetaStoreWriter(context.store?.setMeta, meta),
  },
  rootActionPatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.hasSeam(context),
    dispatch: (context, meta) =>
      ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.dispatch(context, () => ({}), meta),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: (context, meta) =>
      ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.dispatch(context, () => ({}), meta),
  },
};

export const SLICE_STORE_WRITER_HANDLERS: Record<SliceStoreWriter, SliceStoreWriterHandler> = {
  setUi: {
    hasSeam: store => typeof store?.setUi === 'function',
    dispatch: (store, _namespace, payload, meta) => store.setUi?.(readSlicePatchValue('ui', payload), meta),
  },
  setRuntime: {
    hasSeam: store => typeof store?.setRuntime === 'function',
    dispatch: (store, _namespace, payload, meta) =>
      store.setRuntime?.(readSlicePatchValue('runtime', payload), meta),
  },
  setModePatch: {
    hasSeam: store => typeof store?.setModePatch === 'function',
    dispatch: (store, _namespace, payload, meta) =>
      store.setModePatch?.(readSlicePatchValue('mode', payload), meta),
  },
  setConfig: {
    hasSeam: store => typeof store?.setConfig === 'function',
    dispatch: (store, _namespace, payload, meta) =>
      store.setConfig?.(readSlicePatchValue('config', payload), meta),
  },
  setMeta: {
    hasSeam: store => typeof store?.setMeta === 'function',
    dispatch: (store, _namespace, payload, meta) =>
      store.setMeta?.(readSlicePatchValue('meta', payload), meta),
  },
};

export const SLICE_DISPATCH_TARGET_HANDLERS: Record<SliceDispatchTarget, SliceDispatchTargetHandler> = {
  namespacePatch: {
    hasSeam: (context, namespace) => {
      const ns = getSliceNamespaceFromContext(context, namespace);
      return typeof ns?.patch === 'function';
    },
    dispatch: ({ context, namespace, payload, meta }) => {
      const ns = getSliceNamespaceFromContext(context, namespace);
      if (typeof ns?.patch !== 'function') return undefined;
      return ns.patch(payload, meta);
    },
  },
  storeWriter: {
    hasSeam: (context, _namespace, opts) =>
      SLICE_STORE_WRITER_HANDLERS[opts.storeWriter].hasSeam(context.store),
    dispatch: ({ context, namespace, payload, meta, opts }) => {
      const store = context.store;
      if (!store) return undefined;
      return SLICE_STORE_WRITER_HANDLERS[opts.storeWriter].dispatch(store, namespace, payload, meta);
    },
  },
  rootActionPatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.hasSeam(context),
    dispatch: ({ context, meta, readRootPayload }) =>
      ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.dispatch(context, readRootPayload, meta),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: ({ context, meta, readRootPayload }) =>
      ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.dispatch(context, readRootPayload, meta),
  },
};

export function hasRootPatchDispatchSeamForTarget(
  context: ResolvedWriteContext,
  target: RootPatchDispatchTarget
): boolean {
  return ROOT_PATCH_TARGET_HANDLERS[target].hasSeam(context);
}

export function hasSliceDispatchTargetSeam<N extends SlicePatchNamespace>(
  context: ResolvedWriteContext,
  namespace: N,
  opts: SliceWriteOptions,
  target: SliceDispatchTarget
): boolean {
  return SLICE_DISPATCH_TARGET_HANDLERS[target].hasSeam(context, namespace, opts);
}

export function hasMetaTouchDispatchTargetSeam(
  context: ResolvedWriteContext,
  target: MetaTouchDispatchTarget
): boolean {
  return META_TOUCH_TARGET_HANDLERS[target].hasSeam(context);
}

export function dispatchRootPatchTarget(
  context: ResolvedWriteContext,
  target: RootPatchDispatchTarget,
  readRootPayload: RootPayloadReader,
  meta?: ActionMetaLike
): unknown {
  return ROOT_PATCH_TARGET_HANDLERS[target].dispatch(context, readRootPayload, meta);
}

export function dispatchSliceTarget<N extends SlicePatchNamespace>(args: {
  context: ResolvedWriteContext;
  namespace: N;
  payload: SlicePatchValue<N>;
  meta?: ActionMetaLike;
  opts: SliceWriteOptions;
  target: SliceDispatchTarget;
  readRootPayload: RootPayloadReader;
}): unknown {
  const { target, ...dispatchArgs } = args;
  return SLICE_DISPATCH_TARGET_HANDLERS[target].dispatch(dispatchArgs);
}

export function dispatchMetaTouchTarget(
  context: ResolvedWriteContext,
  target: MetaTouchDispatchTarget,
  meta?: ActionMetaLike
): unknown {
  return META_TOUCH_TARGET_HANDLERS[target].dispatch(context, meta);
}
