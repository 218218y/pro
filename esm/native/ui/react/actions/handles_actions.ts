// React UI actions: handles (global type + handle edit mode)

import type {
  AppContainer,
  ActionMetaLike,
  ConfigStateLike,
  HandleType,
  UiStateLike,
  UnknownRecord,
} from '../../../../../types';

import { getPrimaryMode, getModeState, enterPrimaryMode, exitPrimaryMode } from './modes_actions.js';
import { MODES, getBrowserTimers } from '../../../services/api.js';
import { refreshBuilderHandles } from '../../../services/api.js';
import { setCfgGlobalHandleType, setCfgHandlesMap, setUiFlag } from './store_actions.js';
import { getDoorsActionFn, getMetaActionFn } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
  normalizeHandleFinishColor,
} from '../../../features/handle_finish_shared.js';
import {
  MANUAL_HANDLE_POSITION_MODE,
  isManualHandlePositionMode,
} from '../../../features/manual_handle_position.js';

export const EDGE_HANDLE_VARIANT_GLOBAL_KEY = '__wp_edge_handle_variant_global';

type StoreStateLike = UnknownRecord & {
  config?: unknown;
  ui?: unknown;
};

type ModesBagLike = UnknownRecord & {
  HANDLE?: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readStoreStateShape(value: unknown): StoreStateLike | null {
  return readRecord(value);
}

function readConfigState(value: unknown): ConfigStateLike | null {
  return readRecord(value);
}

function readUiState(value: unknown): UiStateLike | null {
  return readRecord(value);
}

function readModesBag(value: unknown): ModesBagLike | null {
  return readRecord(value);
}

function createImmediateBuildMeta(source: string): ActionMetaLike {
  return { source, immediate: true, forceBuild: true };
}

function readStoreState(app: AppContainer): StoreStateLike | null {
  try {
    return readStoreStateShape(readStoreStateMaybe(app));
  } catch {
    return null;
  }
}

function getCfgSnap(app: AppContainer): ConfigStateLike {
  try {
    return readConfigState(readStoreState(app)?.config) || {};
  } catch {
    return {};
  }
}

function getUiSnap(app: AppContainer): UiStateLike {
  try {
    return readUiState(readStoreState(app)?.ui) || {};
  } catch {
    return {};
  }
}

function getModesBag(): ModesBagLike {
  const modes = readModesBag(MODES) || {};
  return { HANDLE: modes.HANDLE };
}

function getHandleModeId(): string {
  return String(getModesBag().HANDLE || 'handle');
}

function normEdgeHandleVariant(v: unknown): 'short' | 'long' {
  return v === 'long' ? 'long' : 'short';
}

function readHandleColor(value: unknown) {
  return normalizeHandleFinishColor(value ?? DEFAULT_HANDLE_FINISH_COLOR);
}

function readModeHandleType(value: unknown): HandleType {
  const raw = String(value || '').trim();
  return raw === 'edge' || raw === 'none' ? (raw as HandleType) : 'standard';
}

function readManualModeHandleType(value: unknown): HandleType {
  const type = readModeHandleType(value);
  return type === 'none' ? 'standard' : type;
}

function applyHandlesBestEffort(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, { purgeRemovedDoors: true });
  } catch {
    // ignore
  }
}

function patchHandlesMapReservedKey(app: AppContainer, key: string, value: unknown, source: string): void {
  try {
    const cfg = getCfgSnap(app);
    const curHm = readRecord(cfg.handlesMap) || {};
    const nextHm: UnknownRecord = { ...curHm };
    if (value === undefined || value === null) delete nextHm[key];
    else nextHm[key] = value;

    const meta = createImmediateBuildMeta(source);
    setCfgHandlesMap(app, nextHm, meta);
  } catch {
    // ignore
  }
}

function getNoHistoryForceBuildMeta(app: AppContainer): ActionMetaLike {
  const noHistoryForceBuildImmediate = getMetaActionFn<(source: string) => ActionMetaLike>(
    app,
    'noHistoryForceBuildImmediate'
  );
  if (typeof noHistoryForceBuildImmediate === 'function') {
    return noHistoryForceBuildImmediate('react:handles:toggle');
  }
  return {
    source: 'react:handles:toggle',
    immediate: true,
    noHistory: true,
    forceBuild: true,
  };
}

export function setHandleControlEnabled(app: AppContainer, on: unknown): void {
  const enabled = !!on;
  try {
    setUiFlag(app, 'handleControl', enabled, getNoHistoryForceBuildMeta(app));
  } catch {
    // ignore
  }

  try {
    const run = () => applyHandlesBestEffort(app);
    try {
      getBrowserTimers(app).setTimeout(run, 0);
    } catch {
      run();
    }
  } catch {
    // ignore
  }

  if (!enabled) {
    try {
      const modeHandle = getHandleModeId();
      const cur = getPrimaryMode(app);
      if (String(cur) === modeHandle) exitPrimaryMode(app, modeHandle, { preserveDoors: true });
    } catch {
      // ignore
    }
  }
}

export function setGlobalHandleType(app: AppContainer, t: HandleType): void {
  const type = String(t || 'standard');

  try {
    const setGlobalHandleTypeAction = getDoorsActionFn<(type: string, meta?: ActionMetaLike) => unknown>(
      app,
      'setGlobalHandleType'
    );
    if (typeof setGlobalHandleTypeAction === 'function') {
      setGlobalHandleTypeAction(type, createImmediateBuildMeta('react:handles:globalType'));
    } else {
      setCfgGlobalHandleType(app, type, { source: 'react:handles:globalType', immediate: true });
    }
  } catch {
    // ignore
  }

  applyHandlesBestEffort(app);
}

export function setGlobalHandleColor(app: AppContainer, color: unknown): void {
  patchHandlesMapReservedKey(
    app,
    HANDLE_COLOR_GLOBAL_KEY,
    readHandleColor(color),
    'react:handles:globalColor'
  );
  applyHandlesBestEffort(app);
}

export function setGlobalEdgeHandleVariant(app: AppContainer, v: 'short' | 'long' | unknown): void {
  const next = normEdgeHandleVariant(v);
  patchHandlesMapReservedKey(app, EDGE_HANDLE_VARIANT_GLOBAL_KEY, next, 'react:handles:globalEdgeVariant');
  applyHandlesBestEffort(app);
}

export function setHandleModeEdgeVariant(app: AppContainer, v: 'short' | 'long' | unknown): void {
  const next = normEdgeHandleVariant(v);
  const modeHandle = getHandleModeId();

  const curMode = getModeState(app);
  const primary = String(curMode.primary || '');
  if (primary !== modeHandle) return;

  const curOpts = readRecord(curMode.opts) || {};
  const curType = String(curOpts.handleType || 'standard');

  enterPrimaryMode(app, modeHandle, {
    modeOpts: { ...curOpts, handleType: curType, edgeHandleVariant: next },
    preserveDoors: true,
    cursor: 'pointer',
  });
}

export function setHandleModeColor(app: AppContainer, color: unknown): void {
  const modeHandle = getHandleModeId();
  const curMode = getModeState(app);
  const primary = String(curMode.primary || '');
  if (primary !== modeHandle) return;

  const curOpts = readRecord(curMode.opts) || {};
  const curType = String(curOpts.handleType || 'standard');

  enterPrimaryMode(app, modeHandle, {
    modeOpts: { ...curOpts, handleType: curType, handleColor: readHandleColor(color) },
    preserveDoors: true,
    cursor: 'pointer',
  });
}

export function enterManualHandlePositionMode(app: AppContainer): void {
  try {
    const enabled = !!getUiSnap(app).handleControl;
    if (!enabled) setHandleControlEnabled(app, true);
  } catch {
    // ignore
  }

  const modeHandle = getHandleModeId();
  const curMode = getModeState(app);
  const curOpts = readRecord(curMode.opts) || {};
  const currentIsManual =
    String(curMode.primary || '') === modeHandle && isManualHandlePositionMode(curOpts.handlePlacement);
  if (currentIsManual) {
    exitPrimaryMode(app, modeHandle, { preserveDoors: true });
    return;
  }

  const selectedType =
    String(curMode.primary || '') === modeHandle ? readManualModeHandleType(curOpts.handleType) : 'standard';
  const hm = readRecord(getCfgSnap(app).handlesMap) || {};
  const selectedColor =
    String(curMode.primary || '') === modeHandle
      ? readHandleColor(curOpts.handleColor)
      : DEFAULT_HANDLE_FINISH_COLOR;
  const selectedEdgeVariant =
    selectedType === 'edge'
      ? normEdgeHandleVariant(curOpts.edgeHandleVariant)
      : normEdgeHandleVariant(hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY]);

  enterPrimaryMode(app, modeHandle, {
    modeOpts: {
      handleType: selectedType,
      edgeHandleVariant: selectedEdgeVariant,
      handleColor: selectedColor,
      handlePlacement: MANUAL_HANDLE_POSITION_MODE,
    },
    preserveDoors: true,
    cursor: 'crosshair',
    toast: 'מיקום ידיות ידני: רחף ולחץ על דלת כדי למקם ידית',
  });
}

export function toggleHandleMode(app: AppContainer, t?: unknown): void {
  try {
    const enabled = !!getUiSnap(app).handleControl;
    if (!enabled) setHandleControlEnabled(app, true);
  } catch {
    // ignore
  }

  const modeHandle = getHandleModeId();

  const cur = getPrimaryMode(app);
  if (String(cur) === modeHandle) {
    exitPrimaryMode(app, modeHandle, { preserveDoors: true });
    return;
  }

  let handleType = String(t || '');
  let edgeHandleVariant: 'short' | 'long' = 'short';

  const cfg = getCfgSnap(app);
  const hm = readRecord(cfg.handlesMap) || {};
  const handleColor = readHandleColor(hm[HANDLE_COLOR_GLOBAL_KEY]);

  if (!handleType) {
    handleType = String(cfg.globalHandleType || 'standard');
    edgeHandleVariant = normEdgeHandleVariant(hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY]);
  } else if (handleType !== 'edge') {
    edgeHandleVariant = normEdgeHandleVariant(hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY]);
  }

  enterPrimaryMode(app, modeHandle, {
    modeOpts: { handleType, edgeHandleVariant, handleColor },
    preserveDoors: true,
    cursor: 'pointer',
    toast: 'עריכת ידיות: לחץ על דלת כדי לשנות ידית',
  });
}
