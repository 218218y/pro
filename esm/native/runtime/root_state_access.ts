// Root store state access helpers (runtime).
//
// Purpose:
// - Remove scattered `App.store && App.store.getState` checks.
// - Provide a consistent, *typed* root state snapshot with guaranteed slices.
// - Stay fail-soft: never throw, never touch the DOM.

import type {
  RootStateLike,
  RootSliceKey,
  StoreLike,
  UiStateLike,
  ConfigStateLike,
  RuntimeStateLike,
  ModeStateLike,
  MetaStateLike,
  RootMetaStateLike,
  UiRawInputsLike,
  UiRawBooleanKey,
  UiRawNumericKey,
  UiRawScalarKey,
  UiRawScalarValueMap,
} from '../../../types';
import { asRecord } from './record.js';
import { getStoreSurfaceMaybe } from './store_surface_access.js';

type UnknownRecord = Record<string, unknown>;
type RootStateSeed = RootStateLike & UnknownRecord;
type RootStoreReader = Pick<StoreLike, 'getState'>;
type RootSliceCoercerMap = { [K in RootSliceKey]: (value: unknown) => RootStateLike[K] };

function asStoreLike(v: unknown): RootStoreReader | null {
  const store = asRecord<RootStoreReader>(v);
  return store && typeof store.getState === 'function' ? store : null;
}

function asUiState(v: unknown): UiStateLike {
  return { ...(asRecord<UiStateLike>(v) || {}) };
}

function asConfigState(v: unknown): ConfigStateLike {
  return { ...(asRecord<ConfigStateLike>(v) || {}) };
}

function asRuntimeState(v: unknown): RuntimeStateLike {
  return { ...(asRecord<RuntimeStateLike>(v) || {}) };
}

function asModeState(v: unknown): ModeStateLike {
  return { ...(asRecord<ModeStateLike>(v) || {}) };
}

function asMetaState(v: unknown): RootMetaStateLike {
  const meta: MetaStateLike = { ...(asRecord<MetaStateLike>(v) || {}) };
  const version = typeof meta.version === 'number' && Number.isFinite(meta.version) ? meta.version : 0;
  const updatedAt =
    typeof meta.updatedAt === 'number' && Number.isFinite(meta.updatedAt) ? meta.updatedAt : 0;
  const dirty = typeof meta.dirty === 'boolean' ? meta.dirty : false;
  return { ...meta, version, updatedAt, dirty };
}

const ROOT_SLICE_COERCERS: RootSliceCoercerMap = {
  ui: asUiState,
  config: asConfigState,
  runtime: asRuntimeState,
  mode: asModeState,
  meta: asMetaState,
} satisfies RootSliceCoercerMap;

function coerceSlice<K extends RootSliceKey>(sliceKey: K, value: unknown): RootStateLike[K] {
  return ROOT_SLICE_COERCERS[sliceKey](value);
}

export function asRootState(st: unknown): RootStateLike {
  const seed = asRecord<RootStateSeed>(st);
  return {
    ...(seed || {}),
    ui: asUiState(seed?.ui),
    config: asConfigState(seed?.config),
    runtime: asRuntimeState(seed?.runtime),
    mode: asModeState(seed?.mode),
    meta: asMetaState(seed?.meta),
  };
}

export function readRootStateFromStore(store: unknown): RootStateLike {
  const resolvedStore = asStoreLike(store);
  return resolvedStore ? asRootState(resolvedStore.getState()) : asRootState(null);
}

export function readSliceFromStore<K extends RootSliceKey>(store: unknown, sliceKey: K): RootStateLike[K] {
  const state = readRootStateFromStore(store);
  return coerceSlice(sliceKey, state[sliceKey]);
}

export function readUiStateFromStore(store: unknown): UiStateLike {
  return readSliceFromStore(store, 'ui');
}

export function readUiRawInputsFromStore(store: unknown): UiRawInputsLike {
  return { ...(asRecord<UiRawInputsLike>(readUiStateFromStore(store).raw) || {}) };
}

function readBooleanRawScalar(raw: UiRawInputsLike, key: UiRawBooleanKey): boolean | undefined {
  const value = raw[key];
  return typeof value === 'boolean' ? value : undefined;
}

function readNumericRawScalar(raw: UiRawInputsLike, key: UiRawNumericKey): number | null | undefined {
  const value = raw[key];
  if (value === null) return null;
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

type UiRawScalarReaderMap = {
  [K in UiRawScalarKey]: (raw: UiRawInputsLike) => UiRawScalarValueMap[K] | undefined;
};
const UI_RAW_SCALAR_READERS = {
  width: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'width'),
  height: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'height'),
  depth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'depth'),
  doors: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'doors'),
  chestDrawersCount: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'chestDrawersCount'),
  chestCommodeMirrorHeightCm: (raw: UiRawInputsLike) =>
    readNumericRawScalar(raw, 'chestCommodeMirrorHeightCm'),
  chestCommodeMirrorWidthCm: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'chestCommodeMirrorWidthCm'),
  chestCommodeMirrorWidthManual: (raw: UiRawInputsLike) =>
    readBooleanRawScalar(raw, 'chestCommodeMirrorWidthManual'),
  stackSplitLowerHeight: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'stackSplitLowerHeight'),
  stackSplitLowerDepth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'stackSplitLowerDepth'),
  stackSplitLowerWidth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'stackSplitLowerWidth'),
  stackSplitLowerDoors: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'stackSplitLowerDoors'),
  stackSplitLowerDepthManual: (raw: UiRawInputsLike) =>
    readBooleanRawScalar(raw, 'stackSplitLowerDepthManual'),
  stackSplitLowerWidthManual: (raw: UiRawInputsLike) =>
    readBooleanRawScalar(raw, 'stackSplitLowerWidthManual'),
  stackSplitLowerDoorsManual: (raw: UiRawInputsLike) =>
    readBooleanRawScalar(raw, 'stackSplitLowerDoorsManual'),
  cornerWidth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cornerWidth'),
  cornerHeight: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cornerHeight'),
  cornerDepth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cornerDepth'),
  cornerDoors: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cornerDoors'),
  cellDimsWidth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cellDimsWidth'),
  cellDimsHeight: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cellDimsHeight'),
  cellDimsDepth: (raw: UiRawInputsLike) => readNumericRawScalar(raw, 'cellDimsDepth'),
} satisfies UiRawScalarReaderMap;

export function readUiRawScalarFromStore<K extends UiRawScalarKey>(
  store: unknown,
  key: K
): UiRawScalarValueMap[K] | undefined {
  const raw = readUiRawInputsFromStore(store);
  const reader: UiRawScalarReaderMap[K] = UI_RAW_SCALAR_READERS[key];
  return reader(raw);
}

export function readConfigStateFromStore(store: unknown): ConfigStateLike {
  return readSliceFromStore(store, 'config');
}

export function readRuntimeStateFromStore(store: unknown): RuntimeStateLike {
  return readSliceFromStore(store, 'runtime');
}

export function readModeStateFromStore(store: unknown): ModeStateLike {
  return readSliceFromStore(store, 'mode');
}

export function readMetaStateFromStore(store: unknown): MetaStateLike {
  return readSliceFromStore(store, 'meta');
}

export function readRootState(App: unknown): RootStateLike {
  return readRootStateFromStore(getStoreSurfaceMaybe(App));
}

export function readSliceFromApp<K extends RootSliceKey>(App: unknown, sliceKey: K): RootStateLike[K] {
  return readSliceFromStore(getStoreSurfaceMaybe(App), sliceKey);
}

export function readUiStateFromApp(App: unknown): UiStateLike {
  return readSliceFromApp(App, 'ui');
}

export function readConfigStateFromApp(App: unknown): ConfigStateLike {
  return readSliceFromApp(App, 'config');
}

export function readRuntimeStateFromApp(App: unknown): RuntimeStateLike {
  return readSliceFromApp(App, 'runtime');
}

export function readModeStateFromApp(App: unknown): ModeStateLike {
  return readSliceFromApp(App, 'mode');
}

export function readMetaStateFromApp(App: unknown): MetaStateLike {
  return readSliceFromApp(App, 'meta');
}
