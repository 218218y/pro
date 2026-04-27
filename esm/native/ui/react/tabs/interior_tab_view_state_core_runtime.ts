import type { AppContainer, ModeActionOptsLike } from '../../../../../types';

import { MODES } from '../../../services/api.js';
import { asStr } from './interior_tab_helpers.js';
import {
  deriveInteriorTabModeState,
  deriveInteriorTabUiToolState,
  deriveInteriorTabVisibilityState,
} from './interior_tab_view_state_runtime.js';

export type InteriorHandleCfgView = {
  globalHandleType?: unknown;
  handlesMap?: unknown;
};

export type InteriorModeView = {
  primary?: unknown;
  opts?: ModeActionOptsLike;
};

export type InteriorUiSnapshot = {
  currentLayoutType?: unknown;
  currentGridDivisions?: unknown;
  currentGridShelfVariant?: unknown;
  currentExtDrawerType?: unknown;
  currentExtDrawerCount?: unknown;
  internalDrawersEnabled?: unknown;
  handleControl?: unknown;
};

export type InteriorModeConsts = {
  modeNone: string;
  modeLayout: string;
  modeManualLayout: string;
  modeBraceShelves: string;
  modeExtDrawer: string;
  modeDivider: string;
  modeIntDrawer: string;
  modeHandle: string;
  modeDoorTrim: string;
};

export function readInteriorTabUiSnapshot(ui: InteriorUiSnapshot): InteriorUiSnapshot {
  return {
    currentLayoutType: ui.currentLayoutType,
    currentGridDivisions: ui.currentGridDivisions,
    currentGridShelfVariant: ui.currentGridShelfVariant,
    currentExtDrawerType: ui.currentExtDrawerType,
    currentExtDrawerCount: ui.currentExtDrawerCount,
    internalDrawersEnabled: ui.internalDrawersEnabled,
    handleControl: ui.handleControl,
  };
}

export function readInteriorTabHandleCfgSnapshot(cfg: InteriorHandleCfgView): InteriorHandleCfgView {
  return {
    globalHandleType: cfg.globalHandleType,
    handlesMap: cfg.handlesMap,
  };
}

export function readInteriorTabModeSnapshot(mode: InteriorModeView): InteriorModeView {
  return {
    primary: mode.primary,
    opts: mode.opts,
  };
}

export function readInteriorTabModeConsts(_app: AppContainer): InteriorModeConsts {
  return {
    modeNone: asStr(MODES.NONE, 'none'),
    modeLayout: asStr(MODES.LAYOUT, 'layout'),
    modeManualLayout: asStr(MODES.MANUAL_LAYOUT, 'manual_layout'),
    modeBraceShelves: asStr(MODES.BRACE_SHELVES, 'brace_shelves'),
    modeExtDrawer: asStr(MODES.EXT_DRAWER, 'ext_drawer'),
    modeDivider: asStr(MODES.DIVIDER, 'divider'),
    modeIntDrawer: asStr(MODES.INT_DRAWER, 'int_drawer'),
    modeHandle: asStr(MODES.HANDLE, 'handle'),
    modeDoorTrim: asStr(MODES.DOOR_TRIM, 'door_trim'),
  };
}

export type InteriorTabDerivedStateArgs = {
  ui: InteriorUiSnapshot;
  handleCfg: InteriorHandleCfgView;
  mode: InteriorModeView;
  modeConsts: InteriorModeConsts;
  manualRowOpen: boolean;
  manualUiTool: 'shelf' | 'rod' | 'storage';
};

export function deriveInteriorTabCoreState(args: InteriorTabDerivedStateArgs) {
  const { ui, handleCfg, mode, modeConsts, manualRowOpen, manualUiTool } = args;
  const primary = asStr(mode.primary, modeConsts.modeNone);
  const modeState = deriveInteriorTabModeState({
    primary,
    modeOptsRaw: mode.opts,
    layoutTypeUiRaw: ui.currentLayoutType,
    modeLayout: modeConsts.modeLayout,
    modeManualLayout: modeConsts.modeManualLayout,
    modeBraceShelves: modeConsts.modeBraceShelves,
    modeExtDrawer: modeConsts.modeExtDrawer,
    modeDivider: modeConsts.modeDivider,
    modeIntDrawer: modeConsts.modeIntDrawer,
    modeHandle: modeConsts.modeHandle,
    modeDoorTrim: modeConsts.modeDoorTrim,
  });

  const uiToolState = deriveInteriorTabUiToolState({
    ui,
    handleCfg,
    modeOpts: modeState.modeOpts,
    isExtDrawerMode: modeState.isExtDrawerMode,
    isHandleMode: modeState.isHandleMode,
  });

  const visibilityState = deriveInteriorTabVisibilityState({
    manualRowOpen,
    isManualLayoutMode: modeState.isManualLayoutMode,
    isSketchToolActive: modeState.isSketchToolActive,
    manualTool: modeState.manualTool,
    manualUiTool,
  });

  return {
    primary,
    ...modeState,
    ...uiToolState,
    ...visibilityState,
  };
}
