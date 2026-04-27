import type {
  ActionMetaLike,
  ActionsNamespaceLike,
  PatchPayload,
  RootStoreLike,
  UnknownRecord,
} from '../../../types';

import { getActions } from './actions_access_core.js';
import { isActionStubFn } from './actions_access_shared.js';
import { getStoreRootMaybe } from './app_roots_access.js';
import { asRecord } from './slice_write_access_shared.js';
import type { SlicePatchNamespace } from './slice_write_access_shared.js';

export type SliceWriteStoreLike = Partial<
  Pick<RootStoreLike, 'patch' | 'setUi' | 'setRuntime' | 'setModePatch' | 'setConfig' | 'setMeta'>
> &
  UnknownRecord;

export type SliceWriteAppLike = {
  actions?: ActionsNamespaceLike;
  store?: SliceWriteStoreLike;
};

export type SliceNamespaceSurface = UnknownRecord & {
  patch?: (payload: UnknownRecord, meta?: ActionMetaLike) => unknown;
  touch?: (meta?: ActionMetaLike) => unknown;
};

export type BoundRootPatchAction = (payload: PatchPayload, meta?: ActionMetaLike) => unknown;
export type BoundMetaTouchAction = (meta?: ActionMetaLike) => unknown;

type NamespaceCacheEntry = {
  source: unknown;
  value: SliceNamespaceSurface | null;
};

export type ResolvedWriteContext = {
  actions: ActionsNamespaceLike | null;
  store: SliceWriteStoreLike | null;
  rootPatchActionSource: ActionsNamespaceLike | null;
  rootPatchAction: BoundRootPatchAction | null;
  liveMetaTouchSource: SliceNamespaceSurface | null;
  liveMetaTouchAction: BoundMetaTouchAction | null;
  namespaces: Partial<Record<SlicePatchNamespace, NamespaceCacheEntry | undefined>>;
};

const resolvedWriteContextOwners = new WeakMap<object, ResolvedWriteContext>();

function isActionsNamespaceLike(value: unknown): value is ActionsNamespaceLike {
  return !!asRecord(value);
}

function isSliceWriteStoreLike(value: unknown): value is SliceWriteStoreLike {
  const store = asRecord(value);
  if (!store) return false;
  return (
    typeof store.patch === 'function' ||
    typeof store.setUi === 'function' ||
    typeof store.setRuntime === 'function' ||
    typeof store.setModePatch === 'function' ||
    typeof store.setConfig === 'function' ||
    typeof store.setMeta === 'function'
  );
}

function isSliceNamespaceSurface(value: unknown): value is SliceNamespaceSurface {
  return !!asRecord(value);
}

function bindRootPatchAction(actions: ActionsNamespaceLike | null): BoundRootPatchAction | null {
  if (typeof actions?.patch !== 'function') return null;
  return (payload: PatchPayload, meta?: ActionMetaLike) => actions.patch?.(payload, meta);
}

function bindLiveMetaTouchAction(actions: ActionsNamespaceLike | null): BoundMetaTouchAction | null {
  const meta = isSliceNamespaceSurface(actions?.meta) ? actions.meta : null;
  if (typeof meta?.touch !== 'function') return null;
  if (isActionStubFn(meta.touch, 'meta:touch')) return null;
  return (actionMeta?: ActionMetaLike) => meta.touch?.(actionMeta);
}

function createEmptyResolvedWriteContext(): ResolvedWriteContext {
  return {
    actions: null,
    store: null,
    rootPatchActionSource: null,
    rootPatchAction: null,
    liveMetaTouchSource: null,
    liveMetaTouchAction: null,
    namespaces: {},
  };
}

function refreshResolvedWriteContext(context: ResolvedWriteContext, App: unknown): ResolvedWriteContext {
  const actions = getActions(App);
  const store = getStoreRootMaybe<SliceWriteStoreLike>(App);
  const resolvedActions = isActionsNamespaceLike(actions) ? actions : null;
  const resolvedStore = isSliceWriteStoreLike(store) ? store : null;
  context.actions = resolvedActions;
  context.store = resolvedStore;

  const rootPatchActionSource =
    resolvedActions && typeof resolvedActions.patch === 'function' ? resolvedActions : null;
  if (context.rootPatchActionSource !== rootPatchActionSource) {
    context.rootPatchActionSource = rootPatchActionSource;
    context.rootPatchAction = bindRootPatchAction(rootPatchActionSource);
  }

  const liveMetaTouchSource =
    resolvedActions &&
    isSliceNamespaceSurface(resolvedActions.meta) &&
    typeof resolvedActions.meta.touch === 'function'
      ? resolvedActions.meta
      : null;
  if (context.liveMetaTouchSource !== liveMetaTouchSource) {
    context.liveMetaTouchSource = liveMetaTouchSource;
    context.liveMetaTouchAction = bindLiveMetaTouchAction(resolvedActions);
  }

  return context;
}

export function createResolvedWriteContext(App: unknown): ResolvedWriteContext {
  const owner = asRecord(App);
  if (!owner) {
    return refreshResolvedWriteContext(createEmptyResolvedWriteContext(), App);
  }

  let context = resolvedWriteContextOwners.get(owner);
  if (!context) {
    context = createEmptyResolvedWriteContext();
    resolvedWriteContextOwners.set(owner, context);
    return refreshResolvedWriteContext(context, owner);
  }
  return refreshResolvedWriteContext(context, owner);
}

export function getSliceNamespaceFromContext(
  context: ResolvedWriteContext,
  namespace: SlicePatchNamespace
): SliceNamespaceSurface | null {
  const source = context.actions?.[namespace];
  const cached = context.namespaces[namespace];
  if (cached && cached.source === source) {
    return cached.value;
  }

  const next = isSliceNamespaceSurface(source) ? source : null;
  context.namespaces[namespace] = { source, value: next };
  return next;
}

export function getWriteAppLikeFromContext(context: ResolvedWriteContext): SliceWriteAppLike | null {
  const next: SliceWriteAppLike = {};
  if (context.actions) next.actions = context.actions;
  if (context.store) next.store = context.store;
  return next.actions || next.store ? next : null;
}
