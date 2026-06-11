import type {
  AppContainer,
  RootStateLike,
  UnknownRecord,
  ActionMetaLike,
  ConfigSlicePatch,
  PatchPayload,
  UiSlicePatch,
} from '../../../types';

import {
  dispatchDedicatedCanonicalPatchPayload,
  patchSliceWithDedicatedWriter,
  touchMetaWithDedicatedWriter,
} from '../runtime/slice_write_access.js';

import type {
  DedicatedSliceWriteOptions,
  SlicePatchNamespace,
  SlicePatchValueMap,
} from '../runtime/slice_write_access_shared.js';
import { getAllSliceNamespaces, readSlicePatchValue } from '../runtime/slice_write_access_shared.js';
import { asRecord as asObj } from '../runtime/record.js';
import { snapshotStoreValueEqual, uiSnapshotValueEqual } from './kernel_snapshot_store_shared.js';
import { asPatchPayload, hasMultipleDefinedRootSlices, hasOnlyUiSlice } from './state_api_shared.js';

const CONFIG_REPLACE_KEY = `${'__'}replace`;

const INTERNAL_SLICE_WRITE_OPTS: Record<SlicePatchNamespace, DedicatedSliceWriteOptions> = {
  ui: {
    storeWriter: 'setUi',
    preferStoreWriter: false,
    skipNamespacePatch: true,
  },
  runtime: {
    storeWriter: 'setRuntime',
    preferStoreWriter: true,
    skipNamespacePatch: true,
  },
  mode: {
    storeWriter: 'setModePatch',
    preferStoreWriter: true,
    skipNamespacePatch: true,
  },
  config: {
    storeWriter: 'setConfig',
    preferStoreWriter: true,
    skipNamespacePatch: true,
  },
  meta: {
    storeWriter: 'setMeta',
    preferStoreWriter: true,
    skipNamespacePatch: true,
  },
};

const INTERNAL_CANONICAL_DISPATCH_OPTS = {
  sliceOptions: INTERNAL_SLICE_WRITE_OPTS,
  metaTouchOptions: {
    preferStoreWriter: true,
    skipNamespaceTouch: true,
  },
};

type WritableStoreLike = {
  getState?: () => unknown;
  patch?: (payload: PatchPayload, meta: ActionMetaLike) => unknown;
  [key: string]: unknown;
};

export type StateApiInstallSupport = {
  callStoreWriter: (
    methodName: 'setUi' | 'setRuntime' | 'setMode' | 'setModePatch' | 'setConfig' | 'setMeta',
    ...args: readonly unknown[]
  ) => unknown;
  commitUiPatch: (patch: UiSlicePatch, meta: ActionMetaLike) => unknown;
  commitRuntimePatch: (patch: UnknownRecord, meta: ActionMetaLike) => unknown;
  commitModePatch: (patch: UnknownRecord, meta: ActionMetaLike) => unknown;
  commitConfigPatch: (patch: ConfigSlicePatch, meta: ActionMetaLike) => unknown;
  commitMetaPatch: (patch: UnknownRecord, meta: ActionMetaLike) => unknown;
  commitMetaTouch: (meta?: ActionMetaLike) => unknown;
  dispatchCanonicalPatch: (payload: PatchPayload, meta: ActionMetaLike) => unknown;
  readRootSnapshot: () => RootStateLike | null;
  readCfgSnapshot: () => UnknownRecord;
  readUiSnapshot: () => UnknownRecord;
};

function isSliceRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function cloneComparableArray(input: readonly unknown[]): unknown[] {
  return input.map(item => {
    if (Array.isArray(item)) return cloneComparableArray(item);
    if (isSliceRecord(item)) return cloneComparableRecord(item);
    return item;
  });
}

function cloneComparableRecord(input: UnknownRecord): UnknownRecord {
  const out: UnknownRecord = {};
  for (const key of Object.keys(input)) {
    const value = input[key];
    if (Array.isArray(value)) {
      out[key] = cloneComparableArray(value);
      continue;
    }
    if (isSliceRecord(value)) {
      out[key] = cloneComparableRecord(value);
      continue;
    }
    out[key] = value;
  }
  return out;
}

function diffComparableValue(prev: unknown, patch: unknown): unknown {
  if (Array.isArray(patch)) {
    return Array.isArray(prev) && snapshotStoreValueEqual(prev, patch)
      ? undefined
      : cloneComparableArray(patch);
  }

  if (isSliceRecord(patch)) {
    const prevRec = asObj<UnknownRecord>(prev);
    if (!Object.keys(patch).length) {
      return !prevRec || !Object.keys(prevRec).length ? undefined : {};
    }
    const next: UnknownRecord = {};
    for (const key of Object.keys(patch)) {
      const diff = diffComparableValue(prevRec ? prevRec[key] : undefined, patch[key]);
      if (typeof diff !== 'undefined') next[key] = diff;
    }
    return Object.keys(next).length ? next : undefined;
  }

  return Object.is(prev, patch) ? undefined : patch;
}

function readConfigReplaceRecord(patch: ConfigSlicePatch): UnknownRecord | null {
  const patchRec = asObj<UnknownRecord>(patch);
  return patchRec ? asObj<UnknownRecord>(patchRec[CONFIG_REPLACE_KEY]) || null : null;
}

function filterNoopSlicePatch<N extends SlicePatchNamespace>(
  namespace: N,
  prevSlice: unknown,
  patchIn: SlicePatchValueMap[N]
): SlicePatchValueMap[N] | null {
  const patch = asObj<SlicePatchValueMap[N]>(patchIn);
  if (!patch || !Object.keys(patch).length) return null;

  if (patch.__snapshot === true) {
    const equal =
      namespace === 'ui' ? uiSnapshotValueEqual(prevSlice, patch) : snapshotStoreValueEqual(prevSlice, patch);
    return equal ? null : patch;
  }

  const prevRec = asObj<UnknownRecord>(prevSlice) || {};
  const next: UnknownRecord = {};
  const replaceRec =
    namespace === 'config' ? readConfigReplaceRecord(readSlicePatchValue('config', patch)) : null;
  const nextReplace: UnknownRecord | null = replaceRec ? {} : null;

  for (const key of Object.keys(patch)) {
    if (key === CONFIG_REPLACE_KEY) continue;
    if (replaceRec && replaceRec[key]) {
      const nextValue = patch[key];
      if (!snapshotStoreValueEqual(prevRec[key], nextValue)) {
        next[key] = nextValue;
        if (nextReplace) nextReplace[key] = true;
      }
      continue;
    }
    const diff = diffComparableValue(prevRec[key], patch[key]);
    if (typeof diff !== 'undefined') next[key] = diff;
  }

  if (nextReplace && Object.keys(nextReplace).length) next[CONFIG_REPLACE_KEY] = nextReplace;
  return Object.keys(next).length ? readSlicePatchValue(namespace, next) : null;
}

function readSliceSnapshot(root: RootStateLike | null, namespace: SlicePatchNamespace): unknown {
  switch (namespace) {
    case 'ui':
      return root?.ui;
    case 'runtime':
      return root?.runtime;
    case 'mode':
      return root?.mode;
    case 'config':
      return root?.config;
    case 'meta':
      return root?.meta;
  }
}

function normalizeSlicePatchInput<N extends SlicePatchNamespace>(
  namespace: N,
  patchIn: SlicePatchValueMap[N]
): SlicePatchValueMap[N] {
  return readSlicePatchValue(namespace, namespace === 'ui' ? { ...patchIn } : patchIn);
}

function filterSlicePatchAgainstRoot<N extends SlicePatchNamespace>(
  root: RootStateLike | null,
  namespace: N,
  patchIn: SlicePatchValueMap[N]
): SlicePatchValueMap[N] | null {
  return filterNoopSlicePatch(
    namespace,
    readSliceSnapshot(root, namespace),
    normalizeSlicePatchInput(namespace, patchIn)
  );
}

export function createStateApiInstallSupport(App: AppContainer, storeInput: unknown): StateApiInstallSupport {
  const store = asObj<WritableStoreLike>(storeInput) || {};
  const callStoreWriter: StateApiInstallSupport['callStoreWriter'] = (methodName, ...args) => {
    const fn: unknown = store[methodName];
    if (typeof fn !== 'function') return undefined;
    return Reflect.apply(fn, store, args);
  };

  const readRootSnapshot = (): RootStateLike | null => {
    if (typeof store.getState !== 'function') return null;
    return asObj<RootStateLike>(store.getState());
  };

  const readCfgSnapshot = (): UnknownRecord => {
    const cfg = asObj(readRootSnapshot()?.config);
    return cfg || {};
  };

  const readUiSnapshot = (): UnknownRecord => {
    const ui = asObj(readRootSnapshot()?.ui);
    return ui || {};
  };

  const commitFilteredSlicePatch = <N extends SlicePatchNamespace>(
    namespace: N,
    patchIn: SlicePatchValueMap[N],
    meta: ActionMetaLike
  ): unknown => {
    const root = readRootSnapshot();
    const filtered = filterSlicePatchAgainstRoot(root, namespace, patchIn);
    if (!filtered) return undefined;

    if (namespace === 'ui' && typeof store.patch === 'function') {
      const payload: PatchPayload = { ui: readSlicePatchValue('ui', filtered) };
      return store.patch(payload, meta);
    }

    return patchSliceWithDedicatedWriter(
      App,
      namespace,
      filtered,
      meta,
      INTERNAL_SLICE_WRITE_OPTS[namespace]
    );
  };

  const commitUiPatch = (patch: UiSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('ui', patch, meta);

  const commitRuntimePatch = (patch: UnknownRecord, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('runtime', patch, meta);

  const commitModePatch = (patch: UnknownRecord, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('mode', patch, meta);

  const commitConfigPatch = (patch: ConfigSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('config', patch, meta);

  const commitMetaPatch = (patch: UnknownRecord, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('meta', patch, meta);

  const commitMetaTouch = (meta?: ActionMetaLike): unknown =>
    touchMetaWithDedicatedWriter(App, meta, { preferStoreWriter: true, skipNamespaceTouch: true });

  const dispatchCanonicalPatch = (payloadIn: PatchPayload, meta: ActionMetaLike): unknown => {
    const payload = asPatchPayload(payloadIn);
    const root = readRootSnapshot();
    const filteredPayload: PatchPayload = {};

    for (const namespace of getAllSliceNamespaces()) {
      const patch = payload[namespace];
      if (typeof patch === 'undefined') continue;
      const filtered = filterSlicePatchAgainstRoot(root, namespace, patch);
      if (filtered) filteredPayload[namespace] = filtered;
    }

    if (!Object.keys(filteredPayload).length) return undefined;

    const onlyUi = hasOnlyUiSlice(filteredPayload);
    const hasManySlices = hasMultipleDefinedRootSlices(filteredPayload);
    if ((onlyUi || hasManySlices) && typeof store.patch === 'function') {
      return store.patch(filteredPayload, meta);
    }

    return dispatchDedicatedCanonicalPatchPayload(
      App,
      filteredPayload,
      meta,
      INTERNAL_CANONICAL_DISPATCH_OPTS
    );
  };

  return {
    callStoreWriter,
    commitUiPatch,
    commitRuntimePatch,
    commitModePatch,
    commitConfigPatch,
    commitMetaPatch,
    commitMetaTouch,
    dispatchCanonicalPatch,
    readRootSnapshot,
    readCfgSnapshot,
    readUiSnapshot,
  };
}
