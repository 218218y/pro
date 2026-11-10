import {
  decodeHandleSize,
  HANDLE_SIZE_GLOBAL_KEY,
  readHandleSizeMm,
} from '../../../../shared/handle_catalog.js';
import { EDGE_HANDLE_VARIANT_GLOBAL_KEY } from '../actions/handles_actions.js';
import { isManualHandlePositionMode as isManualHandlePlacementMode } from '../../../features/manual_handle_position.js';
import {
  DEFAULT_HANDLE_FINISH_COLOR,
  HANDLE_COLOR_GLOBAL_KEY,
} from '../../../features/finish_palette/api.js';
import { asNum, readSketchDivisionManualToolId } from './interior_tab_helpers.js';
import {
  readEdgeHandleVariant,
  readHandleUiColor,
  readExtDrawerType,
  readGridShelfVariant,
  readHandleType,
  readLayoutTypeId,
  readManualToolId,
  readRecord,
} from './interior_tab_view_state_shared.js';

export type InteriorTabModeStateArgs = {
  primary: string;
  modeOptsRaw: unknown;
  layoutTypeUiRaw: unknown;
  modeLayout: string;
  modeManualLayout: string;
  modeBraceShelves: string;
  modeExtDrawer: string;
  modeDivider: string;
  modeHandle: string;
  modeDoorTrim: string;
};

export type InteriorTabUiToolStateArgs = {
  ui: {
    currentGridDivisions?: unknown;
    currentGridShelfVariant?: unknown;
    currentExtDrawerType?: unknown;
    currentExtDrawerCount?: unknown;
    internalDrawersEnabled?: unknown;
    handleControl?: unknown;
    currentHandleToolType?: unknown;
    currentHandleToolSize?: unknown;
    currentHandleToolColor?: unknown;
    currentHandleToolEdgeVariant?: unknown;
  };
  handleCfg: {
    globalHandleType?: unknown;
    handlesMap?: unknown;
  };
  modeOpts: Record<string, unknown>;
  isExtDrawerMode: boolean;
  isHandleMode: boolean;
};

export function deriveInteriorTabModeState(args: InteriorTabModeStateArgs) {
  const {
    primary,
    modeOptsRaw,
    layoutTypeUiRaw,
    modeLayout,
    modeManualLayout,
    modeBraceShelves,
    modeExtDrawer,
    modeDivider,
    modeHandle,
    modeDoorTrim,
  } = args;

  const modeOpts = readRecord(modeOptsRaw) || {};
  const layoutTypeUi = readLayoutTypeId(layoutTypeUiRaw, 'shelves');
  const isLayoutMode = primary === modeLayout;
  const isManualLayoutMode = primary === modeManualLayout;
  const isBraceShelvesMode = primary === modeBraceShelves;
  const isExtDrawerMode = primary === modeExtDrawer;
  const isDividerMode = primary === modeDivider;
  const isIntDrawerMode = false;
  const isHandleMode = primary === modeHandle;
  const isManualHandlePositionMode = isHandleMode && isManualHandlePlacementMode(modeOpts.handlePlacement);
  const isDoorTrimMode = primary === modeDoorTrim;
  const layoutType = isLayoutMode ? readLayoutTypeId(modeOpts.layoutType, layoutTypeUi) : layoutTypeUi;
  const manualToolRaw =
    isManualLayoutMode && typeof modeOpts.manualTool === 'string' ? modeOpts.manualTool : '';
  const isSketchToolActive = isManualLayoutMode && manualToolRaw.startsWith('sketch_');
  const sketchDivisionManualTool = readSketchDivisionManualToolId(manualToolRaw);
  const isSketchDivisionToolActive = isManualLayoutMode && sketchDivisionManualTool !== null;
  const manualTool = isManualLayoutMode
    ? sketchDivisionManualTool || readManualToolId(modeOpts.manualTool, 'shelf')
    : 'shelf';

  return {
    modeOpts,
    layoutTypeUi,
    isLayoutMode,
    isManualLayoutMode,
    isBraceShelvesMode,
    isExtDrawerMode,
    isDividerMode,
    isIntDrawerMode,
    isHandleMode,
    isManualHandlePositionMode,
    isDoorTrimMode,
    layoutType,
    manualTool,
    manualToolRaw,
    isSketchToolActive,
    isSketchDivisionToolActive,
  };
}

export function deriveInteriorTabUiToolState(args: InteriorTabUiToolStateArgs) {
  const { ui, handleCfg, modeOpts, isExtDrawerMode, isHandleMode } = args;
  const currentGridDivisions = asNum(ui.currentGridDivisions, 6);
  const gridShelfVariant = readGridShelfVariant(ui.currentGridShelfVariant);
  const extDrawerTypeUi = readExtDrawerType(ui.currentExtDrawerType, 'regular');
  const extDrawerCountUi = asNum(ui.currentExtDrawerCount, 1);
  const extDrawerType = isExtDrawerMode
    ? readExtDrawerType(modeOpts.extDrawerType, extDrawerTypeUi)
    : extDrawerTypeUi;
  const extDrawerCount = isExtDrawerMode
    ? asNum(modeOpts.extDrawerCount, extDrawerCountUi)
    : extDrawerCountUi;
  const internalDrawersEnabled = !!ui.internalDrawersEnabled;
  const handleControlEnabled = !!ui.handleControl;
  const globalHandleType = readHandleType(handleCfg.globalHandleType, 'standard');
  const handlesMap = readRecord(handleCfg.handlesMap) || {};
  const globalEdgeHandleVariant = readEdgeHandleVariant(handlesMap[EDGE_HANDLE_VARIANT_GLOBAL_KEY], 'short');
  const globalHandleColor = readHandleUiColor(
    handlesMap[HANDLE_COLOR_GLOBAL_KEY],
    DEFAULT_HANDLE_FINISH_COLOR
  );
  const storedHandleToolType = readHandleType(ui.currentHandleToolType, globalHandleType);
  const storedHandleToolColor = readHandleUiColor(ui.currentHandleToolColor, globalHandleColor);
  const storedHandleToolEdgeVariant = readEdgeHandleVariant(
    ui.currentHandleToolEdgeVariant,
    globalEdgeHandleVariant
  );
  const handleToolType = isHandleMode
    ? readHandleType(modeOpts.handleType, storedHandleToolType)
    : storedHandleToolType;
  const globalHandleSize =
    decodeHandleSize(globalHandleType, handlesMap[HANDLE_SIZE_GLOBAL_KEY]) ??
    readHandleSizeMm(globalHandleType);
  const storedToolSize =
    decodeHandleSize(handleToolType, ui.currentHandleToolSize) ??
    decodeHandleSize(handleToolType, handlesMap[HANDLE_SIZE_GLOBAL_KEY]);
  const handleToolSize = readHandleSizeMm(
    handleToolType,
    (isHandleMode ? modeOpts.handleSizeMm : undefined) ?? storedToolSize
  );
  const handleToolColor = isHandleMode
    ? readHandleUiColor(modeOpts.handleColor, storedHandleToolColor)
    : storedHandleToolColor;
  const handleToolEdgeVariant = isHandleMode
    ? readEdgeHandleVariant(modeOpts.edgeHandleVariant, storedHandleToolEdgeVariant)
    : storedHandleToolEdgeVariant;

  return {
    currentGridDivisions,
    gridShelfVariant,
    extDrawerType,
    extDrawerCount,
    internalDrawersEnabled,
    handleControlEnabled,
    globalHandleType,
    handleToolType,
    globalHandleSize,
    handleToolSize,
    isHandleResetMode: isHandleMode && modeOpts.handleReset === true,
    globalHandleColor,
    handleToolColor,
    globalEdgeHandleVariant,
    handleToolEdgeVariant,
  };
}
