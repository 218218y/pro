import type {
  ActionMetaLike,
  MetaSlicePatch,
  ModeSlicePatch,
  RuntimeSlicePatch,
  UiSlicePatch,
  UnknownRecord,
} from '../../../types';
import type { ConfigSlicePatch, PatchPayload } from '../../../types/backend_patch_payload';
import type { StoreConfigMapWriteCapability } from './store_config_map_write_capability.js';

export type SlicePatchNamespace = 'ui' | 'runtime' | 'mode' | 'config' | 'meta';
export type SliceStoreWriter = 'setUi' | 'setRuntime' | 'setModePatch' | 'setConfig' | 'setMeta';
export type SliceDispatchTarget = 'namespacePatch' | 'storeWriter' | 'rootActionPatch' | 'rootStorePatch';
export type MetaTouchDispatchTarget = 'metaTouch' | 'metaStoreWriter' | 'rootActionPatch' | 'rootStorePatch';
export type RootPatchDispatchTarget = 'rootActionPatch' | 'rootStorePatch';

export type SlicePatchValueMap = {
  ui: UiSlicePatch;
  runtime: RuntimeSlicePatch;
  mode: ModeSlicePatch;
  config: ConfigSlicePatch;
  meta: MetaSlicePatch;
};

export type SlicePatchValue<N extends SlicePatchNamespace = SlicePatchNamespace> = SlicePatchValueMap[N];

export type SlicePatchRoute<N extends SlicePatchNamespace = SlicePatchNamespace> = {
  namespace: N;
  payload: SlicePatchValue<N>;
};

export type SliceWriteOptions = {
  storeWriter: SliceStoreWriter;
  allowRootActionPatch?: boolean;
  allowRootStorePatch?: boolean;
  preferStoreWriter?: boolean;
  skipNamespacePatch?: boolean;
  configMapWriteCapability?: StoreConfigMapWriteCapability;
};

export type MetaTouchOptions = {
  allowRootActionPatch?: boolean;
  allowRootStorePatch?: boolean;
  preferStoreWriter?: boolean;
  skipNamespaceTouch?: boolean;
};

export type CanonicalPatchDispatchOptions = {
  allowRootActionPatch?: boolean;
  allowRootStorePatch?: boolean;
  sliceOptions?: Partial<Record<SlicePatchNamespace, SliceWriteOptions>>;
  metaTouchOptions?: MetaTouchOptions;
};

export type DedicatedSliceWriteOptions = Pick<
  SliceWriteOptions,
  'storeWriter' | 'preferStoreWriter' | 'skipNamespacePatch' | 'configMapWriteCapability'
>;

export type DedicatedMetaTouchOptions = Pick<MetaTouchOptions, 'preferStoreWriter' | 'skipNamespaceTouch'>;

export type DedicatedCanonicalPatchDispatchOptions = {
  sliceOptions?: Partial<Record<SlicePatchNamespace, DedicatedSliceWriteOptions>>;
  metaTouchOptions?: DedicatedMetaTouchOptions;
};

const SLICE_PATCH_NAMESPACES: SlicePatchNamespace[] = ['ui', 'runtime', 'mode', 'config', 'meta'];

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function asRecord(v: unknown): UnknownRecord | null {
  return readRecord(v);
}

export function hasOwnKeys(v: unknown): boolean {
  const rec = asRecord(v);
  return !!rec && Object.keys(rec).length > 0;
}

function readUiPatch(payload: unknown): UiSlicePatch {
  return asRecord(payload) ?? {};
}

function readRuntimePatch(payload: unknown): RuntimeSlicePatch {
  return asRecord(payload) ?? {};
}

function readModePatch(payload: unknown): ModeSlicePatch {
  return asRecord(payload) ?? {};
}

function readConfigPatch(payload: unknown): ConfigSlicePatch {
  return asRecord(payload) ?? {};
}

function readMetaPatch(payload: unknown): MetaSlicePatch {
  return asRecord(payload) ?? {};
}

export function readSlicePatchValue<N extends SlicePatchNamespace>(
  namespace: N,
  payload: unknown
): SlicePatchValueMap[N];
export function readSlicePatchValue(namespace: SlicePatchNamespace, payload: unknown): SlicePatchValue {
  switch (namespace) {
    case 'ui':
      return readUiPatch(payload);
    case 'runtime':
      return readRuntimePatch(payload);
    case 'mode':
      return readModePatch(payload);
    case 'config':
      return readConfigPatch(payload);
    case 'meta':
      return readMetaPatch(payload);
  }
}

export function getAllSliceNamespaces(): SlicePatchNamespace[] {
  return SLICE_PATCH_NAMESPACES;
}

export function isSlicePatchNamespace(key: unknown): key is SlicePatchNamespace {
  return key === 'ui' || key === 'runtime' || key === 'mode' || key === 'config' || key === 'meta';
}

const DEFAULT_SLICE_STORE_WRITERS: Record<SlicePatchNamespace, SliceStoreWriter> = {
  ui: 'setUi',
  runtime: 'setRuntime',
  mode: 'setModePatch',
  config: 'setConfig',
  meta: 'setMeta',
};

function getDefaultStoreWriter(namespace: SlicePatchNamespace): SliceStoreWriter {
  return DEFAULT_SLICE_STORE_WRITERS[namespace];
}

export function createSliceWriteOptions(
  namespace: SlicePatchNamespace,
  opts?: Partial<SliceWriteOptions>
): SliceWriteOptions {
  return {
    storeWriter: opts?.storeWriter ?? getDefaultStoreWriter(namespace),
    allowRootActionPatch: opts?.allowRootActionPatch,
    allowRootStorePatch: opts?.allowRootStorePatch,
    preferStoreWriter: opts?.preferStoreWriter,
    skipNamespacePatch: opts?.skipNamespacePatch,
    configMapWriteCapability: opts?.configMapWriteCapability,
  };
}

export function toDedicatedSliceWriteOptions(
  namespace: SlicePatchNamespace,
  opts?: DedicatedSliceWriteOptions
): SliceWriteOptions {
  return {
    storeWriter: opts?.storeWriter || getDefaultStoreWriter(namespace),
    allowRootActionPatch: false,
    allowRootStorePatch: false,
    preferStoreWriter: opts?.preferStoreWriter !== false,
    skipNamespacePatch: opts?.skipNamespacePatch === true,
    configMapWriteCapability: opts?.configMapWriteCapability,
  };
}

export function toDedicatedMetaTouchOptions(opts?: DedicatedMetaTouchOptions): MetaTouchOptions {
  return {
    allowRootActionPatch: false,
    allowRootStorePatch: false,
    preferStoreWriter: opts?.preferStoreWriter !== false,
    skipNamespaceTouch: opts?.skipNamespaceTouch === true,
  };
}

export function toDedicatedCanonicalPatchDispatchOptions(
  opts?: DedicatedCanonicalPatchDispatchOptions
): CanonicalPatchDispatchOptions {
  const source = opts?.sliceOptions;
  let sliceOptions: Partial<Record<SlicePatchNamespace, SliceWriteOptions>> | undefined;

  if (source) {
    const next: Partial<Record<SlicePatchNamespace, SliceWriteOptions>> = {};
    for (const namespace of getAllSliceNamespaces()) {
      const value = source[namespace];
      if (!value) continue;
      next[namespace] = toDedicatedSliceWriteOptions(namespace, value);
    }
    sliceOptions = hasOwnKeys(next) ? next : undefined;
  }

  return {
    allowRootActionPatch: false,
    allowRootStorePatch: false,
    sliceOptions,
    metaTouchOptions: opts?.metaTouchOptions ? toDedicatedMetaTouchOptions(opts.metaTouchOptions) : undefined,
  };
}

export function toRootPatchPayload<N extends SlicePatchNamespace>(
  namespace: N,
  payload: SlicePatchValue<N>
): PatchPayload {
  switch (namespace) {
    case 'ui':
      return { ui: readSlicePatchValue('ui', payload) };
    case 'runtime':
      return { runtime: readSlicePatchValue('runtime', payload) };
    case 'mode':
      return { mode: readSlicePatchValue('mode', payload) };
    case 'config':
      return { config: readSlicePatchValue('config', payload) };
    case 'meta':
      return { meta: readSlicePatchValue('meta', payload) };
  }
}

export function readPatchPayload(patchObj: unknown): PatchPayload {
  const patch = asRecord(patchObj);
  if (!patch) return {};
  const next: PatchPayload = {};
  for (const namespace of getAllSliceNamespaces()) {
    if (typeof patch[namespace] === 'undefined') continue;
    const value = readSlicePatchValue(namespace, patch[namespace]);
    if (!hasOwnKeys(value)) continue;
    Object.assign(next, toRootPatchPayload(namespace, value));
  }
  return next;
}

export function getDefinedPatchKeys(patchObj: unknown): string[] {
  const patch = asRecord(patchObj);
  if (!patch) return [];
  return Object.keys(patch).filter(key => typeof patch[key] !== 'undefined');
}

function readSingleSlicePatchRouteFromRecord(patch: UnknownRecord): SlicePatchRoute | null {
  const keys = getDefinedPatchKeys(patch);
  if (keys.length !== 1) return null;

  const key = keys[0];
  if (!isSlicePatchNamespace(key)) return null;

  const payload = readSlicePatchValue(key, patch[key]);
  if (!hasOwnKeys(payload)) return null;

  return {
    namespace: key,
    payload,
  };
}

export function readSingleSlicePatchRoute(patchObj: unknown): SlicePatchRoute | null {
  const patch = asRecord(patchObj);
  if (!patch) return null;

  const directRoute = readSingleSlicePatchRouteFromRecord(patch);
  if (directRoute) return directRoute;

  return readSingleSlicePatchRouteFromRecord(asRecord(readPatchPayload(patch)) ?? {});
}

export function callDedicatedMetaStoreWriter(
  setMeta: ((patch: MetaSlicePatch, meta?: ActionMetaLike) => unknown) | undefined,
  meta?: ActionMetaLike
): unknown {
  if (typeof setMeta !== 'function') return undefined;
  return setMeta({}, meta);
}
