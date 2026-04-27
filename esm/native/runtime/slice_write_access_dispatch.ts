import type { ActionMetaLike, PatchPayload } from '../../../types';

import {
  callDedicatedMetaStoreWriter,
  createSliceWriteOptions,
  hasOwnKeys,
  readSlicePatchValue,
  toRootPatchPayload,
} from './slice_write_access_shared.js';
import type {
  CanonicalPatchDispatchOptions,
  MetaTouchDispatchTarget,
  MetaTouchOptions,
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

type RootFallbackOptions = Pick<
  CanonicalPatchDispatchOptions,
  'allowRootActionPatchFallback' | 'allowRootStorePatchFallback'
>;

type RootPayloadReader = () => PatchPayload;
type RootFallbackTargetHandler = {
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

function freezeRootPatchDispatchTargets(
  ...targets: RootPatchDispatchTarget[]
): readonly RootPatchDispatchTarget[] {
  return Object.freeze(targets.slice());
}

const DEFAULT_ROOT_FALLBACK_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootStorePatch');
const ROOT_FALLBACK_DISPATCH_TARGETS_WITH_ACTION = freezeRootPatchDispatchTargets(
  'rootActionPatch',
  'rootStorePatch'
);
const ROOT_FALLBACK_ACTION_ONLY_DISPATCH_TARGETS = freezeRootPatchDispatchTargets('rootActionPatch');
const EMPTY_ROOT_FALLBACK_DISPATCH_TARGETS = freezeRootPatchDispatchTargets();

const sliceDispatchTargetsCache = new Map<number, readonly SliceDispatchTarget[]>();
const metaTouchDispatchTargetsCache = new Map<number, readonly MetaTouchDispatchTarget[]>();

function createRootFallbackDispatchTargetSet(opts?: RootFallbackOptions): readonly RootPatchDispatchTarget[] {
  const allowRootActionPatchFallback = !!opts?.allowRootActionPatchFallback;
  const allowRootStorePatchFallback = opts?.allowRootStorePatchFallback !== false;
  if (!allowRootStorePatchFallback) {
    return allowRootActionPatchFallback
      ? ROOT_FALLBACK_ACTION_ONLY_DISPATCH_TARGETS
      : EMPTY_ROOT_FALLBACK_DISPATCH_TARGETS;
  }
  return allowRootActionPatchFallback
    ? ROOT_FALLBACK_DISPATCH_TARGETS_WITH_ACTION
    : DEFAULT_ROOT_FALLBACK_DISPATCH_TARGETS;
}

function createSliceDispatchTargetCacheKey(opts: SliceWriteOptions): number {
  return (
    (opts.preferStoreWriter ? 1 : 0) |
    (opts.skipNamespacePatch ? 2 : 0) |
    (opts.allowRootActionPatchFallback ? 4 : 0) |
    (opts.allowRootStorePatchFallback === false ? 0 : 8)
  );
}

function createMetaTouchDispatchTargetCacheKey(opts?: MetaTouchOptions): number {
  return (
    (opts?.preferStoreWriter ? 1 : 0) |
    (opts?.skipNamespaceTouch ? 2 : 0) |
    (opts?.allowRootActionPatchFallback ? 4 : 0) |
    (opts?.allowRootStorePatchFallback === false ? 0 : 8)
  );
}

function buildCanonicalDispatchTargetOrder<T>(args: {
  preferPrimary?: boolean;
  skipSecondary?: boolean;
  primary: T;
  secondary: T;
  fallbacks: readonly T[];
}): readonly T[] {
  const out: T[] = [];
  if (args.preferPrimary) out.push(args.primary);
  if (!args.skipSecondary) out.push(args.secondary);
  if (!args.preferPrimary) out.push(args.primary);
  out.push(...args.fallbacks);
  return Object.freeze(out.slice());
}

const ROOT_FALLBACK_TARGET_HANDLERS: Record<RootPatchDispatchTarget, RootFallbackTargetHandler> = {
  rootActionPatch: {
    hasSeam: context => !!context.rootPatchAction,
    dispatch: (context, readRootPayload, meta) => context.rootPatchAction?.(readRootPayload(), meta),
  },
  rootStorePatch: {
    hasSeam: context => typeof context.store?.patch === 'function',
    dispatch: (context, readRootPayload, meta) => context.store?.patch?.(readRootPayload(), meta),
  },
};

const META_TOUCH_TARGET_HANDLERS: Record<MetaTouchDispatchTarget, MetaTouchTargetHandler> = {
  metaTouch: {
    hasSeam: context => !!context.liveMetaTouchAction,
    dispatch: (context, meta) => context.liveMetaTouchAction?.(meta),
  },
  metaStoreWriter: {
    hasSeam: context => typeof context.store?.setMeta === 'function',
    dispatch: (context, meta) => callDedicatedMetaStoreWriter(context.store?.setMeta, meta),
  },
  rootActionPatch: {
    hasSeam: context => ROOT_FALLBACK_TARGET_HANDLERS.rootActionPatch.hasSeam(context),
    dispatch: (context, meta) =>
      ROOT_FALLBACK_TARGET_HANDLERS.rootActionPatch.dispatch(context, () => ({}), meta),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_FALLBACK_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: (context, meta) =>
      ROOT_FALLBACK_TARGET_HANDLERS.rootStorePatch.dispatch(context, () => ({}), meta),
  },
};

function dispatchRootPatchStoreWriter<N extends SlicePatchNamespace>(
  store: SliceWriteStoreLike,
  namespace: N,
  payload: SlicePatchValue<N>,
  meta?: ActionMetaLike
): unknown {
  return store.patch?.(toRootPatchPayload(namespace, payload), meta);
}

const SLICE_STORE_WRITER_HANDLERS: Record<SliceStoreWriter, SliceStoreWriterHandler> = {
  setUi: {
    hasSeam: store => typeof store?.patch === 'function',
    dispatch: dispatchRootPatchStoreWriter,
  },
  setRuntime: {
    hasSeam: store => typeof store?.patch === 'function',
    dispatch: dispatchRootPatchStoreWriter,
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

const SLICE_DISPATCH_TARGET_HANDLERS: Record<SliceDispatchTarget, SliceDispatchTargetHandler> = {
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
    hasSeam: context => ROOT_FALLBACK_TARGET_HANDLERS.rootActionPatch.hasSeam(context),
    dispatch: ({ context, meta, readRootPayload }) =>
      ROOT_FALLBACK_TARGET_HANDLERS.rootActionPatch.dispatch(context, readRootPayload, meta),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_FALLBACK_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: ({ context, meta, readRootPayload }) =>
      ROOT_FALLBACK_TARGET_HANDLERS.rootStorePatch.dispatch(context, readRootPayload, meta),
  },
};

export function resolveRootFallbackDispatchTargets(
  opts?: RootFallbackOptions
): readonly RootPatchDispatchTarget[] {
  return createRootFallbackDispatchTargetSet(opts);
}

export function resolveCanonicalMetaTouchOptions(opts?: CanonicalPatchDispatchOptions): MetaTouchOptions {
  const metaTouchOptions = opts?.metaTouchOptions;
  return {
    allowRootActionPatchFallback:
      metaTouchOptions?.allowRootActionPatchFallback ?? opts?.allowRootActionPatchFallback,
    allowRootStorePatchFallback:
      metaTouchOptions?.allowRootStorePatchFallback ?? opts?.allowRootStorePatchFallback,
    preferStoreWriter: metaTouchOptions?.preferStoreWriter,
    skipNamespaceTouch: metaTouchOptions?.skipNamespaceTouch,
  };
}

export function resolveSliceDispatchTargets(opts: SliceWriteOptions): readonly SliceDispatchTarget[] {
  const key = createSliceDispatchTargetCacheKey(opts);
  const cached = sliceDispatchTargetsCache.get(key);
  if (cached) return cached;

  const out = buildCanonicalDispatchTargetOrder<SliceDispatchTarget>({
    preferPrimary: opts.preferStoreWriter,
    skipSecondary: opts.skipNamespacePatch,
    primary: 'storeWriter',
    secondary: 'namespacePatch',
    fallbacks: resolveRootFallbackDispatchTargets(opts),
  });
  sliceDispatchTargetsCache.set(key, out);
  return out;
}

export function resolveMetaTouchDispatchTargets(opts?: MetaTouchOptions): readonly MetaTouchDispatchTarget[] {
  const key = createMetaTouchDispatchTargetCacheKey(opts);
  const cached = metaTouchDispatchTargetsCache.get(key);
  if (cached) return cached;

  const out = buildCanonicalDispatchTargetOrder<MetaTouchDispatchTarget>({
    preferPrimary: opts?.preferStoreWriter,
    skipSecondary: opts?.skipNamespaceTouch,
    primary: 'metaStoreWriter',
    secondary: 'metaTouch',
    fallbacks: resolveRootFallbackDispatchTargets(opts),
  });
  metaTouchDispatchTargetsCache.set(key, out);
  return out;
}

function hasRootPatchDispatchSeamForTarget(
  context: ResolvedWriteContext,
  target: RootPatchDispatchTarget
): boolean {
  return ROOT_FALLBACK_TARGET_HANDLERS[target].hasSeam(context);
}

function hasSliceDispatchTargetSeam<N extends SlicePatchNamespace>(
  context: ResolvedWriteContext,
  namespace: N,
  opts: SliceWriteOptions,
  target: SliceDispatchTarget
): boolean {
  return SLICE_DISPATCH_TARGET_HANDLERS[target].hasSeam(context, namespace, opts);
}

function hasMetaTouchDispatchTargetSeam(
  context: ResolvedWriteContext,
  target: MetaTouchDispatchTarget
): boolean {
  return META_TOUCH_TARGET_HANDLERS[target].hasSeam(context);
}

const READ_ROOT_PAYLOAD_UNSUPPORTED: RootPayloadReader = () => {
  throw new Error(
    '[WardrobePro] Unexpected root payload read: dispatch targets do not require root fallbacks'
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
  targets: readonly RootPatchDispatchTarget[] = resolveRootFallbackDispatchTargets()
): boolean {
  return targets.some(target => hasRootPatchDispatchSeamForTarget(context, target));
}

function dispatchRootFallbackTarget(
  context: ResolvedWriteContext,
  target: RootPatchDispatchTarget,
  readRootPayload: RootPayloadReader,
  meta?: ActionMetaLike
): unknown {
  return ROOT_FALLBACK_TARGET_HANDLERS[target].dispatch(context, readRootPayload, meta);
}

function dispatchRootFallbackWithResolvedContext(
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
    const out = dispatchRootFallbackTarget(context, target, readRootPayload, meta);
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
    const out = SLICE_DISPATCH_TARGET_HANDLERS[target].dispatch({
      context,
      namespace,
      payload,
      meta,
      opts,
      readRootPayload,
    });
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
    const out = META_TOUCH_TARGET_HANDLERS[target].dispatch(context, meta);
    if (out !== undefined) return out;
  }

  return undefined;
}

export function patchRootWithResolvedContext(
  context: ResolvedWriteContext,
  payload: PatchPayload,
  meta?: ActionMetaLike,
  targets: readonly RootPatchDispatchTarget[] = resolveRootFallbackDispatchTargets()
): unknown {
  return dispatchRootFallbackWithResolvedContext(context, () => payload, meta, targets);
}

export function createDefaultSliceWriteOptions(
  namespace: SlicePatchNamespace,
  opts?: Pick<CanonicalPatchDispatchOptions, 'allowRootActionPatchFallback' | 'allowRootStorePatchFallback'>
): SliceWriteOptions {
  return createSliceWriteOptions(namespace, opts);
}
