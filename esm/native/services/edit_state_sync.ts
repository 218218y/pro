import type { ActionMetaLike, AppContainer, TimeoutHandleLike, UnknownRecord } from '../../../types';

import {
  clearBuilderBuildUi,
  ensureBuilderBuildUi,
  getBuilderBuildUi,
} from '../runtime/builder_service_access.js';
import { isDimensionBurstActiveId, syncDimensionRuntimePatch } from '../runtime/dimension_sync_coalescer.js';
import { getBrowserTimers } from '../runtime/api.js';

import {
  type AppLike,
  asApp,
  buildDimsSyncMeta,
  readActiveDimensionEditId,
  readWardrobeUiSnapshot,
} from './edit_state_shared.js';
import {
  createEditStateOperationRejectedError,
  reportEditStateNonFatal,
} from './edit_state_observability.js';

type DimensionRuntimePatch = {
  wardrobeWidthM: number;
  wardrobeHeightM: number;
  wardrobeDepthM: number;
  wardrobeDoorsCount?: number;
};

type DimensionBuildUiPatch = {
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;
  raw: Record<string, unknown>;
};

type DimensionSyncTransaction = {
  buildUiPatch: DimensionBuildUiPatch;
  runtimePatch: DimensionRuntimePatch | null;
  meta: ActionMetaLike | undefined;
};

type DimensionSyncState = {
  timer: TimeoutHandleLike | undefined;
  token: number;
  transaction: DimensionSyncTransaction | null;
};

type PropertySnapshot = {
  present: boolean;
  value: unknown;
};

type BuilderBuildUiSnapshot = {
  existed: boolean;
  scalar: Record<'width' | 'height' | 'depth' | 'doors', PropertySnapshot>;
  raw: Record<'width' | 'height' | 'depth' | 'doors', PropertySnapshot>;
};

const DIMENSION_SYNC_DELAY_MS = 90;
const BUILD_UI_KEYS = Object.freeze(['width', 'height', 'depth', 'doors'] as const);
const dimensionSyncStates = new WeakMap<object, DimensionSyncState>();

function cloneBuildUiPatch(patch: DimensionBuildUiPatch): DimensionBuildUiPatch {
  return { ...patch, raw: { ...patch.raw } };
}

function cloneRuntimePatch(patch: DimensionRuntimePatch | null): DimensionRuntimePatch | null {
  return patch ? { ...patch } : null;
}

function cloneMeta(meta: ActionMetaLike | undefined): ActionMetaLike | undefined {
  return meta ? { ...meta } : undefined;
}

function cloneTransaction(transaction: DimensionSyncTransaction): DimensionSyncTransaction {
  return {
    buildUiPatch: cloneBuildUiPatch(transaction.buildUiPatch),
    runtimePatch: cloneRuntimePatch(transaction.runtimePatch),
    meta: cloneMeta(transaction.meta),
  };
}

function getDimensionSyncState(app: AppContainer): DimensionSyncState {
  let state = dimensionSyncStates.get(app);
  if (!state) {
    state = { timer: undefined, token: 0, transaction: null };
    dimensionSyncStates.set(app, state);
  }
  return state;
}

function clearDimensionSyncTimer(app: AppContainer, state: DimensionSyncState): boolean {
  if (typeof state.timer === 'undefined') return true;
  const timer = state.timer;
  state.timer = undefined;
  try {
    getBrowserTimers(app).clearTimeout(timer);
    return true;
  } catch (error) {
    reportEditStateNonFatal(app, 'sync.timer.clear', error);
    return false;
  }
}

function snapshotProperty(record: object, key: PropertyKey): PropertySnapshot {
  return {
    present: Object.prototype.hasOwnProperty.call(record, key),
    value: Reflect.get(record, key),
  };
}

function captureBuilderBuildUiSnapshot(app: AppContainer): BuilderBuildUiSnapshot {
  const buildUi = getBuilderBuildUi(app);
  const raw = buildUi?.raw && typeof buildUi.raw === 'object' ? buildUi.raw : {};
  return {
    existed: !!buildUi,
    scalar: Object.fromEntries(
      BUILD_UI_KEYS.map(key => [key, snapshotProperty(buildUi || {}, key)])
    ) as Record<(typeof BUILD_UI_KEYS)[number], PropertySnapshot>,
    raw: Object.fromEntries(BUILD_UI_KEYS.map(key => [key, snapshotProperty(raw, key)])) as Record<
      (typeof BUILD_UI_KEYS)[number],
      PropertySnapshot
    >,
  };
}

function restoreProperty(record: object, key: PropertyKey, snapshot: PropertySnapshot): void {
  if (snapshot.present) {
    Reflect.set(record, key, snapshot.value);
    return;
  }
  Reflect.deleteProperty(record, key);
}

function restoreBuilderBuildUiSnapshot(app: AppContainer, snapshot: BuilderBuildUiSnapshot): boolean {
  try {
    if (!snapshot.existed) return clearBuilderBuildUi(app) || getBuilderBuildUi(app) === null;

    const buildUi = ensureBuilderBuildUi(app, 'services/edit_state.syncWardrobeState.rollback');
    const raw = buildUi.raw || (buildUi.raw = {});
    for (const key of BUILD_UI_KEYS) {
      restoreProperty(buildUi, key, snapshot.scalar[key]);
      restoreProperty(raw, key, snapshot.raw[key]);
    }
    return true;
  } catch (error) {
    reportEditStateNonFatal(app, 'sync.builder.rollback', error);
    return false;
  }
}

function applyBuilderBuildUiPatch(app: AppContainer, patch: DimensionBuildUiPatch): boolean {
  try {
    const buildUi = ensureBuilderBuildUi(app, 'services/edit_state.syncWardrobeState');
    const buildUiRaw = buildUi.raw || (buildUi.raw = {});

    if (typeof patch.width === 'number') buildUi.width = patch.width;
    if (typeof patch.height === 'number') buildUi.height = patch.height;
    if (typeof patch.depth === 'number') buildUi.depth = patch.depth;
    if (typeof patch.doors === 'number') buildUi.doors = patch.doors;

    for (const key of BUILD_UI_KEYS) {
      const value = patch.raw[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        buildUiRaw[key] = value;
        continue;
      }
      if (value === null) buildUiRaw[key] = null;
    }
    return true;
  } catch (error) {
    reportEditStateNonFatal(app, 'sync.builder.apply', error);
    return false;
  }
}

function applyDimensionSyncTransaction(app: AppContainer, transaction: DimensionSyncTransaction): boolean {
  let snapshot: BuilderBuildUiSnapshot;
  try {
    snapshot = captureBuilderBuildUiSnapshot(app);
  } catch (error) {
    reportEditStateNonFatal(app, 'sync.builder.captureSnapshot', error);
    return false;
  }
  if (!applyBuilderBuildUiPatch(app, transaction.buildUiPatch)) {
    restoreBuilderBuildUiSnapshot(app, snapshot);
    return false;
  }

  if (!transaction.runtimePatch) return true;

  const runtimeResult = syncDimensionRuntimePatch(app, transaction.runtimePatch, transaction.meta, {
    activeId: '',
  });
  if (runtimeResult.flushed) return true;

  reportEditStateNonFatal(
    app,
    'sync.runtime.apply',
    createEditStateOperationRejectedError('runtime dimension synchronization')
  );
  restoreBuilderBuildUiSnapshot(app, snapshot);
  return false;
}

function flushDimensionSyncState(app: AppContainer, state: DimensionSyncState): boolean {
  clearDimensionSyncTimer(app, state);
  const transaction = state.transaction;
  if (!transaction) return false;
  state.transaction = null;
  return applyDimensionSyncTransaction(app, transaction);
}

function flushDimensionSyncToken(app: AppContainer, token: number): void {
  const state = dimensionSyncStates.get(app);
  if (!state || state.token !== token) return;
  state.timer = undefined;
  void flushDimensionSyncState(app, state);
}

function scheduleDimensionSyncTransaction(
  app: AppContainer,
  transaction: DimensionSyncTransaction,
  activeId: string
): boolean {
  const state = getDimensionSyncState(app);
  if (!isDimensionBurstActiveId(activeId)) {
    clearDimensionSyncTimer(app, state);
    state.transaction = null;
    return applyDimensionSyncTransaction(app, transaction);
  }

  state.transaction = cloneTransaction(transaction);
  state.token += 1;
  const token = state.token;
  clearDimensionSyncTimer(app, state);

  try {
    state.timer = getBrowserTimers(app).setTimeout(() => {
      flushDimensionSyncToken(app, token);
    }, DIMENSION_SYNC_DELAY_MS);
    return true;
  } catch (error) {
    state.timer = undefined;
    reportEditStateNonFatal(app, 'sync.timer.schedule', error);
    return flushDimensionSyncState(app, state);
  }
}

function buildDimensionBuildUiPatch(
  dims: { w: number; h: number; d: number } | null,
  doors: number | null,
  raw: Record<string, unknown>
): DimensionBuildUiPatch {
  const patch: DimensionBuildUiPatch = { raw: {} };
  if (dims) {
    patch.width = dims.w * 100;
    patch.height = dims.h * 100;
    patch.depth = dims.d * 100;
  }
  if (typeof doors === 'number' && Number.isFinite(doors)) patch.doors = doors;

  for (const key of BUILD_UI_KEYS) {
    const value = raw[key];
    if ((typeof value === 'number' && Number.isFinite(value)) || value === null) {
      patch.raw[key] = value;
    }
  }
  return patch;
}

function buildDimensionRuntimePatch(
  dims: { w: number; h: number; d: number } | null,
  doors: number | null
): DimensionRuntimePatch | null {
  if (!dims) return null;
  const patch: DimensionRuntimePatch = {
    wardrobeWidthM: dims.w,
    wardrobeHeightM: dims.h,
    wardrobeDepthM: dims.d,
  };
  if (typeof doors === 'number' && Number.isFinite(doors)) patch.wardrobeDoorsCount = doors;
  return patch;
}

export function syncWardrobeStateWithResult(App: AppLike): boolean {
  const app = asApp(App);
  if (!app) return false;

  try {
    const { raw, dims, doors } = readWardrobeUiSnapshot(app);
    const transaction: DimensionSyncTransaction = {
      buildUiPatch: buildDimensionBuildUiPatch(dims, doors, raw as UnknownRecord),
      runtimePatch: buildDimensionRuntimePatch(dims, doors),
      meta: buildDimsSyncMeta(app),
    };
    return scheduleDimensionSyncTransaction(app, transaction, readActiveDimensionEditId(app));
  } catch (error) {
    reportEditStateNonFatal(app, 'sync.outer', error);
    return false;
  }
}

export function syncWardrobeState(App: AppLike): void {
  void syncWardrobeStateWithResult(App);
}
