import type {
  AppContainer,
  RootStateLike,
  UnknownRecord,
  ActionMetaLike,
  UiSlicePatch,
  RuntimeSlicePatch,
  ModeSlicePatch,
  MetaSlicePatch,
} from '../../../types';
import type { ConfigSlicePatch, PatchPayload } from '../../../types/backend_patch_payload';

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
import { isKnownMapName } from '../runtime/maps_access_normalizers.js';
import {
  attachConfigPatchReplaceMetadata,
  readConfigPatchDataKeys,
  readConfigPatchReplaceMap,
} from '../runtime/cfg_access_patch_metadata.js';
import { withStoreConfigMapWriteCapability } from '../runtime/store_config_map_write_capability.js';
import { asRecord as asObj } from '../runtime/record.js';
import { snapshotStoreValueEqual, uiSnapshotValueEqual } from './kernel_snapshot_store_shared.js';
import { asPatchPayload } from './state_api_shared.js';

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
  config: withStoreConfigMapWriteCapability({
    storeWriter: 'setConfig',
    preferStoreWriter: true,
    skipNamespacePatch: true,
  }),
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
  commitRuntimePatch: (patch: RuntimeSlicePatch, meta: ActionMetaLike) => unknown;
  commitModePatch: (patch: ModeSlicePatch, meta: ActionMetaLike) => unknown;
  commitConfigPatch: (patch: ConfigSlicePatch, meta: ActionMetaLike) => unknown;
  commitMetaPatch: (patch: MetaSlicePatch, meta: ActionMetaLike) => unknown;
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

function readConfigReplaceRecord(patch: ConfigSlicePatch): Record<string, boolean> | null {
  return readConfigPatchReplaceMap(patch);
}

function readKnownConfigMapPatchKeys(patch: unknown): string[] {
  return readConfigPatchDataKeys(patch).filter(key => isKnownMapName(key));
}

function readKnownConfigMapReplaceKeys(patch: unknown): string[] {
  const replace = readConfigPatchReplaceMap(patch);
  if (!replace) return [];
  return Object.keys(replace).filter(key => replace[key] && isKnownMapName(key));
}

function assertNoGenericRootConfigMapPatch(payload: PatchPayload): void {
  const mapKeys = readKnownConfigMapPatchKeys(payload.config);
  const replaceKeys = readKnownConfigMapReplaceKeys(payload.config);
  if (!mapKeys.length && !replaceKeys.length) return;
  const parts: string[] = [];
  if (mapKeys.length) parts.push(`branches (${mapKeys.join(', ')})`);
  if (replaceKeys.length) parts.push(`replace keys (${replaceKeys.join(', ')})`);
  throw new Error(
    `[WardrobePro] actions.patch cannot write known config map ${parts.join(
      ' and '
    )}; use applyProjectSnapshot/applyPaintSnapshot or a semantic map writer.`
  );
}

function filterNoopSlicePatch<N extends SlicePatchNamespace>(
  namespace: N,
  prevSlice: unknown,
  patchIn: SlicePatchValueMap[N]
): SlicePatchValueMap[N] | null {
  const patchRecord = asObj<UnknownRecord>(patchIn);
  if (!patchRecord || !Object.keys(patchRecord).length) return null;

  if (namespace === 'ui' && patchRecord.__snapshot === true) {
    const patch = readSlicePatchValue(namespace, patchRecord);
    return uiSnapshotValueEqual(prevSlice, patch) ? null : patch;
  }

  const prevRec = asObj<UnknownRecord>(prevSlice) || {};
  const next: UnknownRecord = {};
  const replaceRec =
    namespace === 'config' ? readConfigReplaceRecord(readSlicePatchValue('config', patchRecord)) : null;
  const nextReplace: UnknownRecord | null = replaceRec ? {} : null;

  const patchKeys = namespace === 'config' ? readConfigPatchDataKeys(patchRecord) : Object.keys(patchRecord);

  for (const key of patchKeys) {
    if (replaceRec && replaceRec[key]) {
      const nextValue = patchRecord[key];
      if (!snapshotStoreValueEqual(prevRec[key], nextValue)) {
        next[key] = nextValue;
        if (nextReplace) nextReplace[key] = true;
      }
      continue;
    }
    const diff = diffComparableValue(prevRec[key], patchRecord[key]);
    if (typeof diff !== 'undefined') next[key] = diff;
  }

  if (!Object.keys(next).length) return null;
  const filteredPatch =
    nextReplace && Object.keys(nextReplace).length
      ? attachConfigPatchReplaceMetadata(next, nextReplace)
      : next;
  return readSlicePatchValue(namespace, filteredPatch);
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

  const commitRuntimePatch = (patch: RuntimeSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('runtime', patch, meta);

  const commitModePatch = (patch: ModeSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('mode', patch, meta);

  const commitConfigPatch = (patch: ConfigSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('config', patch, meta);

  const commitMetaPatch = (patch: MetaSlicePatch, meta: ActionMetaLike): unknown =>
    commitFilteredSlicePatch('meta', patch, meta);

  const commitMetaTouch = (meta?: ActionMetaLike): unknown =>
    touchMetaWithDedicatedWriter(App, meta, { preferStoreWriter: true, skipNamespaceTouch: true });

  const dispatchCanonicalPatch = (payloadIn: PatchPayload, meta: ActionMetaLike): unknown => {
    const payload = asPatchPayload(payloadIn);
    assertNoGenericRootConfigMapPatch(payload);
    const root = readRootSnapshot();
    const filteredPayload: PatchPayload = {};

    for (const namespace of getAllSliceNamespaces()) {
      const patch = payload[namespace];
      if (typeof patch === 'undefined') continue;
      const filtered = filterSlicePatchAgainstRoot(root, namespace, patch);
      if (filtered) Object.assign(filteredPayload, { [namespace]: filtered });
    }

    const filteredKeys = Object.keys(filteredPayload);
    if (!filteredKeys.length) return undefined;

    const onlyMeta = filteredKeys.length === 1 && typeof filteredPayload.meta !== 'undefined';
    if (!onlyMeta && typeof store.patch === 'function') {
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
