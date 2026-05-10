import type { UnknownRecord } from '../../../../../types';
import type { BaseLegColor, BaseLegStyle } from '../../../features/base_leg_support.js';
import type { StructurePattern } from './structure_tab_saved_models_patterns.js';

export type StructureTabBaseUiState = {
  width: number;
  height: number;
  depth: number;
  doors: number;
  chestDrawersCount: number;
  baseType: 'plinth' | 'legs' | 'none';
  baseLegStyle: BaseLegStyle;
  baseLegColor: BaseLegColor;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  slidingTracksColor: 'nickel' | 'black';
  structureSelectRaw: string;
  singleDoorPosRaw: string;
  hingeDirection: boolean;
  cornerMode: boolean;
  cornerSide: 'left' | 'right';
  cornerWidth: number;
  cornerDoors: number;
  cornerHeight: number;
  cornerDepth: number;
  isChestMode: boolean;
};

export type StructureTabStackSplitUiState = {
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
  stackSplitLowerHeight: number;
  stackSplitLowerDepthRaw: number;
  stackSplitLowerWidthRaw: number;
  stackSplitLowerDoorsRaw: number;
  stackSplitLowerDepthManualRaw: unknown;
  stackSplitLowerWidthManualRaw: unknown;
  stackSplitLowerDoorsManualRaw: unknown;
};

export type StructureTabDerivedStackSplitState = {
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
};

export type StructureTabCellDimsState = {
  cellDimsWidth: number | '';
  cellDimsHeight: number | '';
  cellDimsDepth: number | '';
};

export type StructureTabSelectionState = {
  patterns: StructurePattern[];
  structureSelect: string;
  structureIsDefault: boolean;
  structureArr: number[] | null;
  isSliding: boolean;
  shouldShowStructureButtons: boolean;
  shouldShowSingleDoor: boolean;
  shouldShowHingeBtn: boolean;
};

export type StructureTabDefaultCellWidthArgs = {
  modulesCount: number;
  width: number;
};

export type StructureTabStackSplitArgs = {
  depth: number;
  width: number;
  doors: number;
  stackSplitLowerDepthRaw: number;
  stackSplitLowerWidthRaw: number;
  stackSplitLowerDoorsRaw: number;
  stackSplitLowerDepthManualRaw: unknown;
  stackSplitLowerWidthManualRaw: unknown;
  stackSplitLowerDoorsManualRaw: unknown;
};

export type StructureTabSelectionArgs = {
  doors: number;
  structureSelectRaw: string;
  wardrobeType: 'hinged' | 'sliding';
};

export type StructureTabCellDimKey = 'cellDimsWidth' | 'cellDimsHeight' | 'cellDimsDepth';
export type StructureTabUiSnapshot = UnknownRecord;
