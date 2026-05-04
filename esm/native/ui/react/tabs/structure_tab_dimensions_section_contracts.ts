import type { ReactNode } from 'react';

import type { StructureTabNumericKey } from './structure_tab_shared.js';

export const STRUCTURE_CELL_DIMS_SECTION_TEST_ID = 'structure-cell-dims-section';
export const STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID = 'structure-cell-dims-mode-button';
export const STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID = 'structure-cell-dims-reset-button';
export const STRUCTURE_LIBRARY_UPPER_DOORS_BUTTON_TEST_ID = 'structure-library-upper-doors-button';
export const STRUCTURE_STACK_SPLIT_SECTION_TEST_ID = 'structure-stack-split-section';
export const STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID = 'structure-stack-split-mode-button';

export type StructureSetRaw = (key: StructureTabNumericKey, value: number) => void;
export type StructureStackLinkField = 'depth' | 'width' | 'doors';

export type StructureDimensionsContentProps = {
  isSliding: boolean;
  isLibraryMode: boolean;
  libraryUpperDoorsHidden: boolean;
  isManualWidth: boolean;
  width: number;
  height: number;
  depth: number;
  doors: number;
  cellDimsEditActive: boolean;
  hasAnyCellDimsOverrides: boolean;
  defaultCellWidth: number;
  cellDimsWidth: number | '';
  cellDimsHeight: number | '';
  cellDimsDepth: number | '';
  stackSplitEnabled: boolean;
  stackSplitLowerHeight: number;
  stackSplitLowerDepth: number;
  stackSplitLowerWidth: number;
  stackSplitLowerDoors: number;
  stackSplitLowerDepthManual: boolean;
  stackSplitLowerWidthManual: boolean;
  stackSplitLowerDoorsManual: boolean;
  onSetRaw: StructureSetRaw;
  onResetAllCellDimsOverrides: () => void;
  onEnterCellDimsMode: () => void;
  onExitCellDimsMode: () => void;
  onClearCellDimsWidth: () => void;
  onClearCellDimsHeight: () => void;
  onClearCellDimsDepth: () => void;
  onToggleStackSplit: () => void;
  onToggleLibraryUpperDoors: () => void;
  renderStackLinkBadge: (field: StructureStackLinkField, isManual: boolean) => ReactNode;
  onResetAutoWidth: () => void;
};

export type StructureDimensionsSectionProps = StructureDimensionsContentProps & {
  visible: boolean;
};
