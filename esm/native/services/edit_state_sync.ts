import type { AppContainer, TimeoutHandleLike } from '../../../types';

import { ensureBuilderBuildUi } from '../runtime/builder_service_access.js';
import { isDimensionBurstActiveId, syncDimensionRuntimePatch } from '../runtime/dimension_sync_coalescer.js';
import { getBrowserTimers } from '../runtime/api.js';

import {
  type AppLike,
  asApp,
  buildDimsSyncMeta,
  readActiveDimensionEditId,
  readWardrobeUiSnapshot,
} from './edit_state_shared.js';

type DimensionBuildUiPatch = {
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;
  raw: Record<string, unknown>;
};

type DimensionBuildUiSyncState = {
  timer: TimeoutHandleLike | undefined;
  token: number;
  patch: DimensionBuildUiPatch | null;
};

const DIMENSION_BUILD_UI_SYNC_DELAY_MS = 90;
const dimensionBuildUiSyncStates = new WeakMap<object, DimensionBuildUiSyncState>();

function cloneBuildUiPatch(patch: DimensionBuildUiPatch): DimensionBuildUiPatch {
  return { ...patch, raw: { ...patch.raw } };
}

function getBuildUiSyncState(app: AppContainer): DimensionBuildUiSyncState {
  let state = dimensionBuildUiSyncStates.get(app);
  if (!state) {
    state = {
      timer: undefined,
      token: 0,
      patch: null,
    };
    dimensionBuildUiSyncStates.set(app, state);
  }
  return state;
}

function clearBuildUiSyncTimer(app: AppContainer, state: DimensionBuildUiSyncState): void {
  if (typeof state.timer === 'undefined') return;
  try {
    getBrowserTimers(app).clearTimeout(state.timer);
  } catch {
    // ignore
  }
  state.timer = undefined;
}

function applyBuilderBuildUiPatch(app: AppContainer, patch: DimensionBuildUiPatch): void {
  const buildUi = ensureBuilderBuildUi(app, 'services/edit_state.syncWardrobeState');
  if (!buildUi) return;

  const buildUiRaw = buildUi.raw || {};
  if (typeof patch.width === 'number') buildUi.width = patch.width;
  if (typeof patch.height === 'number') buildUi.height = patch.height;
  if (typeof patch.depth === 'number') buildUi.depth = patch.depth;
  if (typeof patch.doors === 'number') buildUi.doors = patch.doors;

  const buildUiKeys: ReadonlyArray<'width' | 'height' | 'depth' | 'doors'> = [
    'width',
    'height',
    'depth',
    'doors',
  ];
  for (const key of buildUiKeys) {
    const value = patch.raw[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      buildUiRaw[key] = value;
      continue;
    }
    if (value === null) buildUiRaw[key] = null;
  }
}

function flushBuildUiState(app: AppContainer, state: DimensionBuildUiSyncState): boolean {
  clearBuildUiSyncTimer(app, state);
  const patch = state.patch;
  if (!patch) return false;
  state.patch = null;
  applyBuilderBuildUiPatch(app, patch);
  return true;
}

function flushBuildUiSyncToken(app: AppContainer, token: number): void {
  const state = dimensionBuildUiSyncStates.get(app);
  if (!state || state.token !== token) return;
  state.timer = undefined;
  void flushBuildUiState(app, state);
}

function syncDimensionBuildUiPatch(app: AppContainer, patch: DimensionBuildUiPatch, activeId: string): void {
  const state = getBuildUiSyncState(app);
  if (!isDimensionBurstActiveId(activeId)) {
    clearBuildUiSyncTimer(app, state);
    state.patch = null;
    applyBuilderBuildUiPatch(app, patch);
    return;
  }

  state.patch = cloneBuildUiPatch(patch);
  state.token += 1;
  const token = state.token;
  clearBuildUiSyncTimer(app, state);
  state.timer = getBrowserTimers(app).setTimeout(() => {
    flushBuildUiSyncToken(app, token);
  }, DIMENSION_BUILD_UI_SYNC_DELAY_MS);
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

  const buildUiKeys: ReadonlyArray<'width' | 'height' | 'depth' | 'doors'> = [
    'width',
    'height',
    'depth',
    'doors',
  ];
  for (const key of buildUiKeys) {
    const value = raw[key];
    if ((typeof value === 'number' && Number.isFinite(value)) || value === null) {
      patch.raw[key] = value;
    }
  }
  return patch;
}

function syncBuilderBuildUi(
  app: AppContainer,
  dims: { w: number; h: number; d: number } | null,
  doors: number | null,
  raw: Record<string, unknown>,
  activeId: string
): void {
  try {
    syncDimensionBuildUiPatch(app, buildDimensionBuildUiPatch(dims, doors, raw), activeId);
  } catch {
    // ignore
  }
}

function syncRuntimeDims(
  app: AppContainer,
  dims: { w: number; h: number; d: number } | null,
  doors: number | null,
  activeId: string
): void {
  try {
    if (!dims) return;

    const patch: {
      wardrobeWidthM: number;
      wardrobeHeightM: number;
      wardrobeDepthM: number;
      wardrobeDoorsCount?: number;
    } = {
      wardrobeWidthM: dims.w,
      wardrobeHeightM: dims.h,
      wardrobeDepthM: dims.d,
    };
    if (typeof doors === 'number' && Number.isFinite(doors)) patch.wardrobeDoorsCount = doors;

    syncDimensionRuntimePatch(app, patch, buildDimsSyncMeta(app), { activeId });
  } catch {
    // ignore
  }
}

export function syncWardrobeState(App: AppLike): void {
  const app = asApp(App);
  if (!app) return;

  try {
    const { raw, dims, doors } = readWardrobeUiSnapshot(app);
    const activeId = readActiveDimensionEditId(app);
    syncBuilderBuildUi(app, dims, doors, raw, activeId);
    syncRuntimeDims(app, dims, doors, activeId);
  } catch {
    // ignore
  }
}
