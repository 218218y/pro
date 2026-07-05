import type {
  ActionMetaLike,
  ActionRootPatchPayload,
  ConfigNonMapPatch,
  UnknownRecord,
} from '../../../types';
import type { PatchPayload } from '../../../types/backend_patch_payload';

import { callDedicatedMetaStoreWriter, readSlicePatchValue } from './slice_write_access_shared.js';
import { isKnownMapName } from './maps_access_normalizers.js';
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

export type RootPayloadReader = {
  readActionPayload: () => ActionRootPatchPayload;
  readStorePayload: () => PatchPayload;
};

type RootPatchTargetHandler = {
  hasSeam: (context: ResolvedWriteContext) => boolean;
  dispatch: (
    context: ResolvedWriteContext,
    rootPayloadReader: RootPayloadReader,
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
    rootPayloadReader: RootPayloadReader;
  }) => unknown;
};

const CONFIG_REPLACE_KEY = `${'__'}replace`;

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function readKnownConfigMapPatchKeys(payload: PatchPayload): string[] {
  const config = asRecord(payload.config);
  if (!config) return [];
  return Object.keys(config).filter(key => key !== CONFIG_REPLACE_KEY && isKnownMapName(key));
}

function readKnownConfigMapReplaceKeys(payload: PatchPayload): string[] {
  const config = asRecord(payload.config);
  const replace = config ? asRecord(config[CONFIG_REPLACE_KEY]) : null;
  if (!replace) return [];
  return Object.keys(replace).filter(key => replace[key] && isKnownMapName(key));
}

function readActionRootConfigPatch(payload: PatchPayload): ConfigNonMapPatch | undefined {
  if (typeof payload.config === 'undefined') return undefined;
  const mapKeys = readKnownConfigMapPatchKeys(payload);
  const replaceKeys = readKnownConfigMapReplaceKeys(payload);
  if (mapKeys.length || replaceKeys.length) {
    const parts: string[] = [];
    if (mapKeys.length) parts.push(`branches (${mapKeys.join(', ')})`);
    if (replaceKeys.length) parts.push(`replace keys (${replaceKeys.join(', ')})`);
    throw new Error(
      `[WardrobePro][slice-write-access] root action patch cannot write known config map ${parts.join(
        ' and '
      )}; use actions.config.* or a semantic map writer.`
    );
  }
  return payload.config as ConfigNonMapPatch;
}

function toActionRootPatchPayload(payload: PatchPayload): ActionRootPatchPayload {
  const next: ActionRootPatchPayload = {};
  if (typeof payload.ui !== 'undefined') next.ui = payload.ui;
  const config = readActionRootConfigPatch(payload);
  if (typeof config !== 'undefined') next.config = config;
  if (typeof payload.runtime !== 'undefined') next.runtime = payload.runtime;
  if (typeof payload.mode !== 'undefined') next.mode = payload.mode;
  if (typeof payload.meta !== 'undefined') next.meta = payload.meta;
  return next;
}

export function createRootPayloadReader(createPayload: () => PatchPayload): RootPayloadReader {
  let storePayload: PatchPayload | null = null;
  let actionPayload: ActionRootPatchPayload | null = null;
  const readStorePayload = (): PatchPayload => {
    if (!storePayload) storePayload = createPayload();
    return storePayload;
  };
  return {
    readActionPayload: () => {
      if (!actionPayload) actionPayload = toActionRootPatchPayload(readStorePayload());
      return actionPayload;
    },
    readStorePayload,
  };
}

export const ROOT_PATCH_TARGET_HANDLERS: Record<RootPatchDispatchTarget, RootPatchTargetHandler> = {
  rootActionPatch: {
    hasSeam: context => !!context.rootPatchAction,
    dispatch: (context, rootPayloadReader, meta) =>
      context.rootPatchAction?.(rootPayloadReader.readActionPayload(), meta),
  },
  rootStorePatch: {
    hasSeam: context => typeof context.store?.patch === 'function',
    dispatch: (context, rootPayloadReader, meta) =>
      context.store?.patch?.(rootPayloadReader.readStorePayload(), meta),
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
      ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.dispatch(
        context,
        createRootPayloadReader(() => ({})),
        meta
      ),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: (context, meta) =>
      ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.dispatch(
        context,
        createRootPayloadReader(() => ({})),
        meta
      ),
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
    dispatch: ({ context, meta, rootPayloadReader }) =>
      ROOT_PATCH_TARGET_HANDLERS.rootActionPatch.dispatch(context, rootPayloadReader, meta),
  },
  rootStorePatch: {
    hasSeam: context => ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.hasSeam(context),
    dispatch: ({ context, meta, rootPayloadReader }) =>
      ROOT_PATCH_TARGET_HANDLERS.rootStorePatch.dispatch(context, rootPayloadReader, meta),
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
  rootPayloadReader: RootPayloadReader,
  meta?: ActionMetaLike
): unknown {
  return ROOT_PATCH_TARGET_HANDLERS[target].dispatch(context, rootPayloadReader, meta);
}

export function dispatchSliceTarget<N extends SlicePatchNamespace>(args: {
  context: ResolvedWriteContext;
  namespace: N;
  payload: SlicePatchValue<N>;
  meta?: ActionMetaLike;
  opts: SliceWriteOptions;
  target: SliceDispatchTarget;
  rootPayloadReader: RootPayloadReader;
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
