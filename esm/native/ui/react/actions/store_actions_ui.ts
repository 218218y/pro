import type { ActionMetaLike, AppContainer, UiRawScalarKey, UiRawScalarValueMap } from '../../../../../types';

import type { StoreUiActionRuntime } from './store_actions_ui_contracts.js';
import { getStoreUiActionRuntime } from './store_actions_ui_runtime.js';
import * as uiProject from './store_actions_ui_project.js';
import * as uiRender from './store_actions_ui_render.js';
import * as uiStructure from './store_actions_ui_structure.js';
import * as uiWrites from './store_actions_ui_writes.js';

type StoreUiRuntimeAction<TArgs extends unknown[], TResult> = (
  runtime: StoreUiActionRuntime,
  ...args: TArgs
) => TResult;

function bindStoreUiAction<TArgs extends unknown[], TResult>(
  action: StoreUiRuntimeAction<TArgs, TResult>
): (app: AppContainer, ...args: TArgs) => TResult {
  return (app, ...args) => action(getStoreUiActionRuntime(app), ...args);
}

type SetUiRawScalar = {
  <K extends UiRawScalarKey>(
    app: AppContainer,
    key: K,
    value: UiRawScalarValueMap[K],
    meta?: ActionMetaLike
  ): void;
  (app: AppContainer, key: string, value: unknown, meta?: ActionMetaLike): void;
};

const setUiRawScalar: SetUiRawScalar = (
  app: AppContainer,
  key: string,
  value: unknown,
  meta?: ActionMetaLike
): void => {
  uiWrites.setUiRawScalar(getStoreUiActionRuntime(app), key, value, meta);
};

const applyUiRawScalarPatch = bindStoreUiAction(uiWrites.applyUiRawScalarPatch);
const applyUiSoftScalarPatch = bindStoreUiAction(uiWrites.applyUiSoftScalarPatch);
const patchUi = bindStoreUiAction(uiWrites.patchUi);
const patchUiSoft = bindStoreUiAction(uiWrites.patchUiSoft);
const setUiFlag = bindStoreUiAction(uiWrites.setUiFlag);
const setUiScalar = bindStoreUiAction(uiWrites.setUiScalar);
const setUiScalarSoft = bindStoreUiAction(uiWrites.setUiScalarSoft);
const setUiActiveTab = bindStoreUiAction(uiProject.setUiActiveTab);
const setUiOrderPdfEditorDraft = bindStoreUiAction(uiProject.setUiOrderPdfEditorDraft);
const setUiOrderPdfEditorOpen = bindStoreUiAction(uiProject.setUiOrderPdfEditorOpen);
const setUiOrderPdfEditorZoom = bindStoreUiAction(uiProject.setUiOrderPdfEditorZoom);
const setUiProjectName = bindStoreUiAction(uiProject.setUiProjectName);
const setUiSelectedModelId = bindStoreUiAction(uiProject.setUiSelectedModelId);
const setUiSite2TabsGateOpen = bindStoreUiAction(uiProject.setUiSite2TabsGateOpen);
const setUiBaseLegColor = bindStoreUiAction(uiStructure.setUiBaseLegColor);
const setUiBaseLegPlatformMode = bindStoreUiAction(uiStructure.setUiBaseLegPlatformMode);
const setUiBaseLegPlatformSideMode = bindStoreUiAction(uiStructure.setUiBaseLegPlatformSideMode);
const setUiBaseLegPlatformSideOverhangCm = bindStoreUiAction(uiStructure.setUiBaseLegPlatformSideOverhangCm);
const setUiBaseLegPlatformFrontOverhangCm = bindStoreUiAction(
  uiStructure.setUiBaseLegPlatformFrontOverhangCm
);
const setUiBaseLegHeightCm = bindStoreUiAction(uiStructure.setUiBaseLegHeightCm);
const setUiBaseLegWidthCm = bindStoreUiAction(uiStructure.setUiBaseLegWidthCm);
const setUiBaseLegStyle = bindStoreUiAction(uiStructure.setUiBaseLegStyle);
const setUiBasePlinthHeightCm = bindStoreUiAction(uiStructure.setUiBasePlinthHeightCm);
const setUiBaseType = bindStoreUiAction(uiStructure.setUiBaseType);
const setUiCellDimsDepth = bindStoreUiAction(uiStructure.setUiCellDimsDepth);
const setUiCellDimsHeight = bindStoreUiAction(uiStructure.setUiCellDimsHeight);
const setUiCellDimsHexDoorWidth = bindStoreUiAction(uiStructure.setUiCellDimsHexDoorWidth);
const setUiCellDimsHexMode = bindStoreUiAction(uiStructure.setUiCellDimsHexMode);
const setUiCellDimsHexProtrusion = bindStoreUiAction(uiStructure.setUiCellDimsHexProtrusion);
const setUiCellDimsWidth = bindStoreUiAction(uiStructure.setUiCellDimsWidth);
const setUiChestCommodeEnabled = bindStoreUiAction(uiStructure.setUiChestCommodeEnabled);
const setUiChestCommodeMirrorHeightCm = bindStoreUiAction(uiStructure.setUiChestCommodeMirrorHeightCm);
const setUiChestCommodeMirrorWidthCm = bindStoreUiAction(uiStructure.setUiChestCommodeMirrorWidthCm);
const setUiChestCommodeMirrorWidthManual = bindStoreUiAction(uiStructure.setUiChestCommodeMirrorWidthManual);
const setUiChestDrawersCount = bindStoreUiAction(uiStructure.setUiChestDrawersCount);
const setUiChestMode = bindStoreUiAction(uiStructure.setUiChestMode);
const setUiColorChoice = bindStoreUiAction(uiStructure.setUiColorChoice);
const setUiFrontColorShelfInheritanceMode = bindStoreUiAction(
  uiStructure.setUiFrontColorShelfInheritanceMode
);
const setUiCornerDepth = bindStoreUiAction(uiStructure.setUiCornerDepth);
const setUiCornerDoors = bindStoreUiAction(uiStructure.setUiCornerDoors);
const setUiCornerHeight = bindStoreUiAction(uiStructure.setUiCornerHeight);
const setUiCornerMode = bindStoreUiAction(uiStructure.setUiCornerMode);
const setUiCornerSide = bindStoreUiAction(uiStructure.setUiCornerSide);
const setUiCornerWidth = bindStoreUiAction(uiStructure.setUiCornerWidth);
const setUiCorniceType = bindStoreUiAction(uiStructure.setUiCorniceType);
const setUiDepth = bindStoreUiAction(uiStructure.setUiDepth);
const setUiDoorStyle = bindStoreUiAction(uiStructure.setUiDoorStyle);
const setUiDoors = bindStoreUiAction(uiStructure.setUiDoors);
const setUiHeight = bindStoreUiAction(uiStructure.setUiHeight);
const setUiHingeDirection = bindStoreUiAction(uiStructure.setUiHingeDirection);
const setUiSingleDoorPos = bindStoreUiAction(uiStructure.setUiSingleDoorPos);
const setUiSlidingTracksColor = bindStoreUiAction(uiStructure.setUiSlidingTracksColor);
const setUiStackSplitDecorativeSeparatorSideOverhangCm = bindStoreUiAction(
  uiStructure.setUiStackSplitDecorativeSeparatorSideOverhangCm
);
const setUiStackSplitDecorativeSeparatorFrontOverhangCm = bindStoreUiAction(
  uiStructure.setUiStackSplitDecorativeSeparatorFrontOverhangCm
);
const setUiStackSplitEnabled = bindStoreUiAction(uiStructure.setUiStackSplitEnabled);
const setUiStackSplitLowerDepth = bindStoreUiAction(uiStructure.setUiStackSplitLowerDepth);
const setUiStackSplitLowerDepthManual = bindStoreUiAction(uiStructure.setUiStackSplitLowerDepthManual);
const setUiStackSplitLowerDoors = bindStoreUiAction(uiStructure.setUiStackSplitLowerDoors);
const setUiStackSplitLowerDoorsManual = bindStoreUiAction(uiStructure.setUiStackSplitLowerDoorsManual);
const setUiStackSplitLowerHeight = bindStoreUiAction(uiStructure.setUiStackSplitLowerHeight);
const setUiStackSplitLowerWidth = bindStoreUiAction(uiStructure.setUiStackSplitLowerWidth);
const setUiStackSplitLowerWidthManual = bindStoreUiAction(uiStructure.setUiStackSplitLowerWidthManual);
const setUiStructureSelect = bindStoreUiAction(uiStructure.setUiStructureSelect);
const setUiWidth = bindStoreUiAction(uiStructure.setUiWidth);
const patchUiLightingState = bindStoreUiAction(uiRender.patchUiLightingState);
const setUiCurrentFloorType = bindStoreUiAction(uiRender.setUiCurrentFloorType);
const setUiCurrentLayoutType = bindStoreUiAction(uiRender.setUiCurrentLayoutType);
const setUiDarkMode = bindStoreUiAction(uiRender.setUiDarkMode);
const setUiExtDrawerSelection = bindStoreUiAction(uiRender.setUiExtDrawerSelection);
const setUiGlobalClickUi = bindStoreUiAction(uiRender.setUiGlobalClickUi);
const setUiGridDivisionsState = bindStoreUiAction(uiRender.setUiGridDivisionsState);
const setUiGridShelfVariantState = bindStoreUiAction(uiRender.setUiGridShelfVariantState);
const setUiLastSelectedWallColor = bindStoreUiAction(uiRender.setUiLastSelectedWallColor);
const setUiLightScalar = bindStoreUiAction(uiRender.setUiLightScalar);
const setUiNotesEnabled = bindStoreUiAction(uiRender.setUiNotesEnabled);
const setUiShowContents = bindStoreUiAction(uiRender.setUiShowContents);
const setUiShowHanger = bindStoreUiAction(uiRender.setUiShowHanger);
const setUiSketchModeMirror = bindStoreUiAction(uiRender.setUiSketchModeMirror);

export {
  applyUiRawScalarPatch,
  applyUiSoftScalarPatch,
  patchUi,
  patchUiSoft,
  setUiFlag,
  setUiRawScalar,
  setUiScalar,
  setUiScalarSoft,
  setUiActiveTab,
  setUiOrderPdfEditorDraft,
  setUiOrderPdfEditorOpen,
  setUiOrderPdfEditorZoom,
  setUiProjectName,
  setUiSelectedModelId,
  setUiSite2TabsGateOpen,
  setUiBaseLegColor,
  setUiBaseLegPlatformMode,
  setUiBaseLegPlatformSideMode,
  setUiBaseLegPlatformSideOverhangCm,
  setUiBaseLegPlatformFrontOverhangCm,
  setUiBaseLegHeightCm,
  setUiBaseLegWidthCm,
  setUiBaseLegStyle,
  setUiBasePlinthHeightCm,
  setUiBaseType,
  setUiCellDimsDepth,
  setUiCellDimsHeight,
  setUiCellDimsHexDoorWidth,
  setUiCellDimsHexMode,
  setUiCellDimsHexProtrusion,
  setUiCellDimsWidth,
  setUiChestCommodeEnabled,
  setUiChestCommodeMirrorHeightCm,
  setUiChestCommodeMirrorWidthCm,
  setUiChestCommodeMirrorWidthManual,
  setUiChestDrawersCount,
  setUiChestMode,
  setUiColorChoice,
  setUiFrontColorShelfInheritanceMode,
  setUiCornerDepth,
  setUiCornerDoors,
  setUiCornerHeight,
  setUiCornerMode,
  setUiCornerSide,
  setUiCornerWidth,
  setUiCorniceType,
  setUiDepth,
  setUiDoorStyle,
  setUiDoors,
  setUiHeight,
  setUiHingeDirection,
  setUiSingleDoorPos,
  setUiSlidingTracksColor,
  setUiStackSplitDecorativeSeparatorSideOverhangCm,
  setUiStackSplitDecorativeSeparatorFrontOverhangCm,
  setUiStackSplitEnabled,
  setUiStackSplitLowerDepth,
  setUiStackSplitLowerDepthManual,
  setUiStackSplitLowerDoors,
  setUiStackSplitLowerDoorsManual,
  setUiStackSplitLowerHeight,
  setUiStackSplitLowerWidth,
  setUiStackSplitLowerWidthManual,
  setUiStructureSelect,
  setUiWidth,
  patchUiLightingState,
  setUiCurrentFloorType,
  setUiCurrentLayoutType,
  setUiDarkMode,
  setUiExtDrawerSelection,
  setUiGlobalClickUi,
  setUiGridDivisionsState,
  setUiGridShelfVariantState,
  setUiLastSelectedWallColor,
  setUiLightScalar,
  setUiNotesEnabled,
  setUiShowContents,
  setUiShowHanger,
  setUiSketchModeMirror,
};
