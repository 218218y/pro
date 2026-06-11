import type { ActionMetaLike, AppContainer } from '../../../../../types';

import {
  normalizeBaseLegColor,
  normalizeBaseLegHeightCm,
  normalizeBaseLegWidthCm,
  normalizeBaseLegStyle,
} from '../../../features/base_leg_support.js';
import { asStringValue, getUiNamespace } from './store_actions_state.js';
import { setUiFlag, setUiRawScalar, setUiScalar, setUiScalarSoft } from './store_actions_ui_writes.js';

function setUiBaseType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setBaseType === 'function') {
    uiNs.setBaseType(asStringValue(value), meta);
    return;
  }
  setUiScalar(app, 'baseType', value == null ? '' : String(value), meta);
}

function setUiBaseLegStyle(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(app, 'baseLegStyle', normalizeBaseLegStyle(value), meta);
}

function setUiBaseLegColor(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(app, 'baseLegColor', normalizeBaseLegColor(value), meta);
}

function setUiBaseLegHeightCm(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(app, 'baseLegHeightCm', normalizeBaseLegHeightCm(value), meta);
}

function setUiBaseLegWidthCm(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalar(app, 'baseLegWidthCm', normalizeBaseLegWidthCm(value), meta);
}

function setUiHingeDirection(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setHingeDirection === 'function') {
    uiNs.setHingeDirection(!!on, meta);
    return;
  }
  setUiScalar(app, 'hingeDirection', !!on, meta);
}

function setUiStructureSelect(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setStructureSelect === 'function') {
    uiNs.setStructureSelect(asStringValue(value), meta);
    return;
  }
  setUiScalar(app, 'structureSelect', value == null ? '' : String(value), meta);
}

function setUiSingleDoorPos(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setSingleDoorPos === 'function') {
    uiNs.setSingleDoorPos(asStringValue(value), meta);
    return;
  }
  setUiScalar(app, 'singleDoorPos', value == null ? '' : String(value), meta);
}

function setUiChestMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'isChestMode', !!on, meta);
}

function setUiCornerSide(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerSide', value == null ? '' : String(value), meta);
}

function setUiCornerWidth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerWidth', value, meta);
}

function setUiCornerHeight(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerHeight', value, meta);
}

function setUiCornerDepth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerDepth', value, meta);
}

function setUiDoors(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'doors', value, meta);
}

function setUiWidth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'width', value, meta);
}

function setUiHeight(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'height', value, meta);
}

function setUiDepth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'depth', value, meta);
}

function setUiChestDrawersCount(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'chestDrawersCount', value, meta);
}

function setUiCellDimsWidth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'cellDimsWidth', value, meta);
}

function setUiCellDimsHeight(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'cellDimsHeight', value, meta);
}

function setUiCellDimsDepth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'cellDimsDepth', value, meta);
}

function setUiStackSplitLowerDoors(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerDoors', value, meta);
}

function setUiStackSplitLowerDoorsManual(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerDoorsManual', !!on, meta);
}

function setUiSlidingTracksColor(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const next = value == null ? '' : String(value);
  if (!next) return;
  setUiScalar(app, 'slidingTracksColor', next, meta);
}

function setUiCornerMode(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerMode', !!on, meta);
}

function setUiCornerDoors(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiScalarSoft(app, 'cornerDoors', value, meta);
}

function setUiStackSplitEnabled(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiFlag(app, 'stackSplitEnabled', !!on, meta);
}

function setUiStackSplitLowerHeight(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerHeight', value, meta);
}

function setUiStackSplitLowerDepth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerDepth', value, meta);
}

function setUiStackSplitLowerWidth(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerWidth', value, meta);
}

function setUiStackSplitLowerDepthManual(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerDepthManual', !!on, meta);
}

function setUiStackSplitLowerWidthManual(app: AppContainer, on: unknown, meta?: ActionMetaLike): void {
  setUiRawScalar(app, 'stackSplitLowerWidthManual', !!on, meta);
}

function setUiDoorStyle(app: AppContainer, style: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setDoorStyle === 'function') {
    uiNs.setDoorStyle(asStringValue(style), meta);
    return;
  }
  setUiScalar(app, 'doorStyle', style == null ? '' : String(style), meta);
}

function setUiCorniceType(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setCorniceType === 'function') {
    uiNs.setCorniceType(asStringValue(value), meta);
    return;
  }
  setUiScalar(app, 'corniceType', value == null ? '' : String(value), meta);
}

function setUiColorChoice(app: AppContainer, value: unknown, meta?: ActionMetaLike): void {
  const uiNs = getUiNamespace(app);
  if (typeof uiNs.setColorChoice === 'function') {
    uiNs.setColorChoice(asStringValue(value), meta);
    return;
  }
  const next = value == null ? '' : String(value);
  if (!next) return;
  setUiScalar(app, 'colorChoice', next, meta);
}

export {
  setUiBaseLegColor,
  setUiBaseLegHeightCm,
  setUiBaseLegWidthCm,
  setUiBaseLegStyle,
  setUiBaseType,
  setUiCellDimsDepth,
  setUiCellDimsHeight,
  setUiCellDimsWidth,
  setUiChestDrawersCount,
  setUiChestMode,
  setUiColorChoice,
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
