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
import { captureBuilderOutlineBinding, refreshBuilderHandles } from '../../../services/api.js';
import { patchUiSoft, setCfgGlobalHandleType, setCfgHandlesMap, setUiFlag } from './store_actions.js';
import { getDoorsActionFn, getMetaActionFn } from '../../../services/api.js';
import { readStoreStateMaybe } from '../../../services/api.js';
import {
  applyImmediateStructuralConfigMutation,
  applyImmediateStructuralUiMutation,
  createImmediateStructuralMutationMeta,
} from './structural_build_refresh_actions.js';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
  normalizeHandleFinishColor,
} from '../../../features/finish_palette/api.js';
import {
  MANUAL_HANDLE_POSITION_MODE,
  isManualHandlePositionMode,
} from '../../../features/manual_handle_position.js';
import { resolveRemoveDoorsEnabledFromSnapshots } from '../../../features/door_authoring/api.js';

export const EDGE_HANDLE_VARIANT_GLOBAL_KEY = '__wp_edge_handle_variant_global';

const HANDLE_TOOL_TYPE_UI_KEY = 'currentHandleToolType';
const HANDLE_TOOL_COLOR_UI_KEY = 'currentHandleToolColor';
const HANDLE_TOOL_EDGE_VARIANT_UI_KEY = 'currentHandleToolEdgeVariant';
const HANDLE_COLOR_PART_PREFIX = '__wp_handle_color:';
const EDGE_HANDLE_VARIANT_PART_PREFIX = '__wp_edge_handle_variant:';
const MANUAL_HANDLE_POSITION_KEY_PREFIX = '__wp_manual_handle_position:';
const HANDLE_EDIT_TOAST = 'עריכת ידיות: לחץ על דלת או מגירה כדי לשנות ידית';

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
  return createImmediateStructuralMutationMeta(source, { forceBuild: true });
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

function readStoredHandleToolType(app: AppContainer): HandleType {
  const ui = getUiSnap(app);
  const cfg = getCfgSnap(app);
  return readModeHandleType(ui[HANDLE_TOOL_TYPE_UI_KEY] ?? cfg.globalHandleType ?? 'standard');
}

function readStoredHandleToolColor(app: AppContainer): ReturnType<typeof readHandleColor> {
  const ui = getUiSnap(app);
  const cfg = getCfgSnap(app);
  const hm = readRecord(cfg.handlesMap) || {};
  return readHandleColor(ui[HANDLE_TOOL_COLOR_UI_KEY] ?? hm[HANDLE_COLOR_GLOBAL_KEY]);
}

function readStoredHandleToolEdgeVariant(app: AppContainer): 'short' | 'long' {
  const ui = getUiSnap(app);
  const cfg = getCfgSnap(app);
  const hm = readRecord(cfg.handlesMap) || {};
  return normEdgeHandleVariant(ui[HANDLE_TOOL_EDGE_VARIANT_UI_KEY] ?? hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY]);
}

function patchHandleToolUi(app: AppContainer, patch: UnknownRecord, source: string): void {
  try {
    patchUiSoft(app, patch, { source, noBuild: true, noHistory: true, noAutosave: true, noPersist: true });
  } catch {
    // Tool choices are UI-only hints. Mode opts below remain the source of truth while editing.
  }
}

function isGlobalHandleToolMapKey(key: string): boolean {
  return key === HANDLE_COLOR_GLOBAL_KEY || key === EDGE_HANDLE_VARIANT_GLOBAL_KEY;
}

function isPerPartHandleToolMapKey(key: string): boolean {
  return (
    key.startsWith(HANDLE_COLOR_PART_PREFIX) ||
    key.startsWith(EDGE_HANDLE_VARIANT_PART_PREFIX) ||
    key.startsWith(MANUAL_HANDLE_POSITION_KEY_PREFIX)
  );
}

function isMeaningfulHandleOverrideValue(value: unknown): boolean {
  return value !== undefined && value !== null && String(value || '').trim() !== '';
}

function hasDirtyHandleOverrides(app: AppContainer): boolean {
  const hm = readRecord(getCfgSnap(app).handlesMap);
  if (!hm) return false;
  try {
    return Object.keys(hm).some(key => {
      if (isGlobalHandleToolMapKey(key)) return false;
      const value = hm[key];
      if (!isMeaningfulHandleOverrideValue(value)) return false;
      // Direct part-id entries are the actual handle-type override. The known
      // prefixed keys are per-part color/edge/manual-position metadata written
      // together with that override, so they are also real user changes.
      return !key.startsWith('__wp_') || isPerPartHandleToolMapKey(key);
    });
  } catch {
    return false;
  }
}

function enterDefaultHandleEditModeIfClean(app: AppContainer): void {
  try {
    const modeHandle = getHandleModeId();
    if (String(getPrimaryMode(app)) === modeHandle) return;
    if (hasDirtyHandleOverrides(app)) return;
  } catch {
    return;
  }

  toggleHandleMode(app);
}

function enterHandleEditMode(app: AppContainer, modeOpts: UnknownRecord, cursor = 'pointer'): void {
  enterPrimaryMode(app, getHandleModeId(), {
    modeOpts,
    preserveDoors: true,
    cursor,
    toast: HANDLE_EDIT_TOAST,
  });
}

function applyHandlesBestEffort(app: AppContainer): void {
  try {
    refreshBuilderHandles(app, {
      cfgSnapshot: getCfgSnap(app),
      addOutlines: captureBuilderOutlineBinding(app),
      removeDoorsEnabled: resolveRemoveDoorsEnabledFromSnapshots(getUiSnap(app), getModeState(app)),
      purgeRemovedDoors: true,
    });
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

    applyImmediateStructuralConfigMutation(
      app,
      source,
      { handlesMap: nextHm },
      meta => {
        setCfgHandlesMap(app, nextHm, meta);
      },
      { forceBuild: true }
    );
  } catch {
    // ignore
  }
}

function getNoHistoryForceBuildMeta(app: AppContainer, source: string): ActionMetaLike {
  const noHistoryForceBuildImmediate = getMetaActionFn<(source: string) => ActionMetaLike>(
    app,
    'noHistoryForceBuildImmediate'
  );
  if (typeof noHistoryForceBuildImmediate === 'function') {
    return noHistoryForceBuildImmediate(source);
  }
  return {
    immediate: true,
    noHistory: true,
    noCapture: true,
    forceBuild: true,
  };
}

function setHandleControlEnabledCore(
  app: AppContainer,
  on: unknown,
  opts: { autoEnterCleanDefault?: boolean } = {}
): void {
  const enabled = !!on;
  const source = 'react:handles:toggle';
  try {
    applyImmediateStructuralUiMutation(
      app,
      source,
      { handleControl: enabled },
      meta => {
        setUiFlag(app, 'handleControl', enabled, meta);
      },
      getNoHistoryForceBuildMeta(app, source)
    );
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

  if (enabled) {
    if (opts.autoEnterCleanDefault !== false) enterDefaultHandleEditModeIfClean(app);
    return;
  }

  try {
    const modeHandle = getHandleModeId();
    const cur = getPrimaryMode(app);
    if (String(cur) === modeHandle) exitPrimaryMode(app, modeHandle, { preserveDoors: true });
  } catch {
    // ignore
  }
}

export function setHandleControlEnabled(app: AppContainer, on: unknown): void {
  setHandleControlEnabledCore(app, on, { autoEnterCleanDefault: true });
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
      applyImmediateStructuralConfigMutation(
        app,
        'react:handles:globalType',
        { globalHandleType: type },
        meta => {
          setCfgGlobalHandleType(app, type, meta);
        },
        { forceBuild: true }
      );
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
  const curOpts = primary === modeHandle ? readRecord(curMode.opts) || {} : {};
  const handleColor =
    primary === modeHandle ? readHandleColor(curOpts.handleColor) : readStoredHandleToolColor(app);

  patchHandleToolUi(
    app,
    {
      [HANDLE_TOOL_TYPE_UI_KEY]: 'edge',
      [HANDLE_TOOL_EDGE_VARIANT_UI_KEY]: next,
      [HANDLE_TOOL_COLOR_UI_KEY]: handleColor,
    },
    'react:handles:toolEdgeVariant'
  );

  enterHandleEditMode(app, {
    ...curOpts,
    handleType: 'edge',
    edgeHandleVariant: next,
    handleColor,
  });
}

export function setHandleModeColor(app: AppContainer, color: unknown): void {
  const nextColor = readHandleColor(color);
  const modeHandle = getHandleModeId();
  const curMode = getModeState(app);
  const primary = String(curMode.primary || '');
  const curOpts = primary === modeHandle ? readRecord(curMode.opts) || {} : {};
  const handleType =
    primary === modeHandle ? readModeHandleType(curOpts.handleType) : readStoredHandleToolType(app);
  const edgeHandleVariant =
    primary === modeHandle
      ? normEdgeHandleVariant(curOpts.edgeHandleVariant)
      : readStoredHandleToolEdgeVariant(app);

  patchHandleToolUi(
    app,
    {
      [HANDLE_TOOL_TYPE_UI_KEY]: handleType,
      [HANDLE_TOOL_EDGE_VARIANT_UI_KEY]: edgeHandleVariant,
      [HANDLE_TOOL_COLOR_UI_KEY]: nextColor,
    },
    'react:handles:toolColor'
  );

  enterHandleEditMode(app, {
    ...curOpts,
    handleType,
    edgeHandleVariant,
    handleColor: nextColor,
  });
}

export function enterManualHandlePositionMode(app: AppContainer): void {
  try {
    const enabled = !!getUiSnap(app).handleControl;
    if (!enabled) setHandleControlEnabledCore(app, true, { autoEnterCleanDefault: false });
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
    String(curMode.primary || '') === modeHandle
      ? readManualModeHandleType(curOpts.handleType)
      : readManualModeHandleType(readStoredHandleToolType(app));
  const selectedColor =
    String(curMode.primary || '') === modeHandle
      ? readHandleColor(curOpts.handleColor)
      : readStoredHandleToolColor(app);
  const selectedEdgeVariant =
    selectedType === 'edge'
      ? String(curMode.primary || '') === modeHandle
        ? normEdgeHandleVariant(curOpts.edgeHandleVariant)
        : readStoredHandleToolEdgeVariant(app)
      : readStoredHandleToolEdgeVariant(app);

  patchHandleToolUi(
    app,
    {
      [HANDLE_TOOL_TYPE_UI_KEY]: selectedType,
      [HANDLE_TOOL_EDGE_VARIANT_UI_KEY]: selectedEdgeVariant,
      [HANDLE_TOOL_COLOR_UI_KEY]: selectedColor,
    },
    'react:handles:manualPositionTool'
  );

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
    if (!enabled) setHandleControlEnabledCore(app, true, { autoEnterCleanDefault: false });
  } catch {
    // ignore
  }

  const modeHandle = getHandleModeId();
  const curMode = getModeState(app);
  const primary = String(curMode.primary || '');
  const currentHandleMode = primary === modeHandle;
  const requestedType = t == null ? '' : String(t || '').trim();

  if (currentHandleMode && !requestedType) {
    exitPrimaryMode(app, modeHandle, { preserveDoors: true });
    return;
  }

  const curOpts = currentHandleMode ? readRecord(curMode.opts) || {} : {};
  const cfg = getCfgSnap(app);
  const hm = readRecord(cfg.handlesMap) || {};

  const handleType = requestedType
    ? readModeHandleType(requestedType)
    : currentHandleMode
      ? readModeHandleType(curOpts.handleType)
      : readStoredHandleToolType(app);
  const edgeHandleVariant =
    handleType === 'edge'
      ? currentHandleMode && curOpts.edgeHandleVariant != null
        ? normEdgeHandleVariant(curOpts.edgeHandleVariant)
        : readStoredHandleToolEdgeVariant(app)
      : readStoredHandleToolEdgeVariant(app) || normEdgeHandleVariant(hm[EDGE_HANDLE_VARIANT_GLOBAL_KEY]);
  const handleColor = currentHandleMode
    ? readHandleColor(curOpts.handleColor)
    : readStoredHandleToolColor(app);

  patchHandleToolUi(
    app,
    {
      [HANDLE_TOOL_TYPE_UI_KEY]: handleType,
      [HANDLE_TOOL_EDGE_VARIANT_UI_KEY]: edgeHandleVariant,
      [HANDLE_TOOL_COLOR_UI_KEY]: handleColor,
    },
    'react:handles:toolType'
  );

  enterHandleEditMode(app, { ...curOpts, handleType, edgeHandleVariant, handleColor });
}
