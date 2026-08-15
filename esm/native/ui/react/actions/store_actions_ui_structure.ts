import type { ActionMetaLike } from '../../../../../types';
import type { StoreUiActionRuntime } from './store_actions_ui_contracts.js';

import {
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegPlatformMode,
  normalizeBaseLegPlatformSideMode,
  normalizeBaseLegWidthCm,
  normalizeBaseLegStyle,
} from '../../../features/base_leg_support.js';
import { normalizeBasePlinthHeightCm } from '../../../features/base_plinth_support.js';
import {
  normalizeBaseLegPlatformFrontOverhangCm,
  normalizeBaseLegPlatformSideOverhangCm,
  normalizeStackSplitDecorativeSeparatorFrontOverhangCm,
  normalizeStackSplitDecorativeSeparatorSideOverhangCm,
} from '../../../features/platform_overhang_support.js';
import { normalizeFrontColorShelfInheritanceMode } from '../../../features/front_color_shelf_inheritance.js';
import { asStringValue } from './store_actions_value_shared.js';
import { setUiFlag, setUiRawScalar, setUiScalar, setUiScalarSoft } from './store_actions_ui_writes.js';

function setUiBaseType(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setBaseType === 'function') {
    uiNs.setBaseType(asStringValue(value), meta);
    return;
  }
  setUiScalar(runtime, 'baseType', asStringValue(value), meta);
}

function setUiBasePlinthHeightCm(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(runtime, 'basePlinthHeightCm', normalizeBasePlinthHeightCm(value), meta);
}

function setUiBaseLegStyle(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(runtime, 'baseLegStyle', normalizeBaseLegStyle(value), meta);
}

function setUiBaseLegColor(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(runtime, 'baseLegColor', normalizeBaseLegColor(value), meta);
}

function setUiBaseLegPlatformMode(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(runtime, 'baseLegPlatformMode', normalizeBaseLegPlatformMode(value), meta);
}

function setUiBaseLegPlatformSideMode(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(runtime, 'baseLegPlatformSideMode', normalizeBaseLegPlatformSideMode(value), meta);
}

function setUiBaseLegPlatformSideOverhangCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(runtime, 'baseLegPlatformSideOverhangCm', normalizeBaseLegPlatformSideOverhangCm(value), meta);
}

function setUiBaseLegPlatformFrontOverhangCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(
    runtime,
    'baseLegPlatformFrontOverhangCm',
    normalizeBaseLegPlatformFrontOverhangCm(value),
    meta
  );
}

function setUiBaseLegHeightCm(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(runtime, 'baseLegHeightCm', normalizeBaseLegHeightCm(value), meta);
}

function setUiBaseLegWidthCm(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(runtime, 'baseLegWidthCm', normalizeBaseLegWidthCm(value), meta);
}

function setUiHingeDirection(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setHingeDirection === 'function') {
    uiNs.setHingeDirection(!!on, meta);
    return;
  }
  setUiScalar(runtime, 'hingeDirection', !!on, meta);
}

function setUiStructureSelect(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setStructureSelect === 'function') {
    uiNs.setStructureSelect(asStringValue(value), meta);
    return;
  }
  setUiScalar(runtime, 'structureSelect', asStringValue(value), meta);
}

function setUiSingleDoorPos(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setSingleDoorPos === 'function') {
    uiNs.setSingleDoorPos(asStringValue(value), meta);
    return;
  }
  setUiScalar(runtime, 'singleDoorPos', asStringValue(value), meta);
}

function setUiChestMode(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'isChestMode', !!on, meta);
}

function setUiChestCommodeEnabled(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'chestCommodeEnabled', !!on, meta);
}

function setUiCornerSide(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerSide', asStringValue(value), meta);
}

function setUiCornerWidth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerWidth', value, meta);
}

function setUiCornerHeight(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerHeight', value, meta);
}

function setUiCornerDepth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerDepth', value, meta);
}

function setUiDoors(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'doors', value, meta);
}

function setUiWidth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'width', value, meta);
}

function setUiHeight(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'height', value, meta);
}

function setUiDepth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'depth', value, meta);
}

function setUiChestDrawersCount(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'chestDrawersCount', value, meta);
}

function setUiChestCommodeMirrorHeightCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'chestCommodeMirrorHeightCm', value, meta);
}

function setUiChestCommodeMirrorWidthCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'chestCommodeMirrorWidthCm', value, meta);
}

function setUiChestCommodeMirrorWidthManual(
  runtime: StoreUiActionRuntime,
  on: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'chestCommodeMirrorWidthManual', !!on, meta);
}

function setUiCellDimsWidth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'cellDimsWidth', value, meta);
}

function setUiCellDimsHeight(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'cellDimsHeight', value, meta);
}

function setUiCellDimsDepth(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'cellDimsDepth', value, meta);
}

function setUiCellDimsHexMode(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(runtime, 'cellDimsHexMode', !!on, meta);
}

function setUiCellDimsHexProtrusion(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'cellDimsHexProtrusion', value, meta);
}

function setUiCellDimsHexDoorWidth(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'cellDimsHexDoorWidth', value, meta);
}

function setUiStackSplitLowerDoors(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerDoors', value, meta);
}

function setUiStackSplitLowerDoorsManual(
  runtime: StoreUiActionRuntime,
  on: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerDoorsManual', !!on, meta);
}

function setUiSlidingTracksColor(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const next = asStringValue(value);
  if (!next) return;
  setUiScalar(runtime, 'slidingTracksColor', next, meta);
}

function setUiCornerMode(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerMode', !!on, meta);
}

function setUiCornerDoors(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(runtime, 'cornerDoors', value, meta);
}

function setUiStackSplitEnabled(runtime: StoreUiActionRuntime, on: unknown, meta?: ActionMetaLike): void {
  setUiFlag(runtime, 'stackSplitEnabled', !!on, meta);
}

function setUiStackSplitDecorativeSeparatorSideOverhangCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(
    runtime,
    'stackSplitDecorativeSeparatorSideOverhangCm',
    normalizeStackSplitDecorativeSeparatorSideOverhangCm(value),
    meta
  );
}

function setUiStackSplitDecorativeSeparatorFrontOverhangCm(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(
    runtime,
    'stackSplitDecorativeSeparatorFrontOverhangCm',
    normalizeStackSplitDecorativeSeparatorFrontOverhangCm(value),
    meta
  );
}

function setUiStackSplitLowerHeight(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerHeight', value, meta);
}

function setUiStackSplitLowerDepth(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerDepth', value, meta);
}

function setUiStackSplitLowerWidth(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerWidth', value, meta);
}

function setUiStackSplitLowerDepthManual(
  runtime: StoreUiActionRuntime,
  on: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerDepthManual', !!on, meta);
}

function setUiStackSplitLowerWidthManual(
  runtime: StoreUiActionRuntime,
  on: unknown,
  meta?: ActionMetaLike
): void {
  setUiRawScalar(runtime, 'stackSplitLowerWidthManual', !!on, meta);
}

function setUiDoorStyle(runtime: StoreUiActionRuntime, style: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setDoorStyle === 'function') {
    uiNs.setDoorStyle(asStringValue(style), meta);
    return;
  }
  setUiScalar(runtime, 'doorStyle', asStringValue(style), meta);
}

function setUiCorniceType(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setCorniceType === 'function') {
    uiNs.setCorniceType(asStringValue(value), meta);
    return;
  }
  setUiScalar(runtime, 'corniceType', asStringValue(value), meta);
}

function setUiColorChoice(runtime: StoreUiActionRuntime, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = runtime.readUiActions();
  if (typeof uiNs.setColorChoice === 'function') {
    uiNs.setColorChoice(asStringValue(value), meta);
    return;
  }
  const next = asStringValue(value);
  if (!next) return;
  setUiScalar(runtime, 'colorChoice', next, meta);
}

function setUiFrontColorShelfInheritanceMode(
  runtime: StoreUiActionRuntime,
  value: unknown,
  meta?: ActionMetaLike
): void {
  setUiScalar(
    runtime,
    'frontColorShelfInheritanceMode',
    normalizeFrontColorShelfInheritanceMode(value),
    meta
  );
}

export {
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
};
