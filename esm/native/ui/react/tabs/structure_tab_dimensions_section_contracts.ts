import type { ReactNode } from 'react';

import { encodeGlassFrameStylePaintToken } from '../../../features/door_style_overrides.js';
import type { StructureTabNumericKey } from './structure_tab_shared.js';

export const STRUCTURE_CELL_DIMS_SECTION_TEST_ID = 'structure-cell-dims-section';
export const STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID = 'structure-cell-dims-mode-button';
export const STRUCTURE_CELL_DIMS_HEX_MODE_BUTTON_TEST_ID = 'structure-cell-dims-hex-mode-button';
export const STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID = 'structure-cell-dims-reset-button';
export const STRUCTURE_CELL_DIMS_RESET_WIDTH_BUTTON_TEST_ID = 'structure-cell-dims-reset-width-button';
export const STRUCTURE_CELL_DIMS_RESET_HEIGHT_BUTTON_TEST_ID = 'structure-cell-dims-reset-height-button';
export const STRUCTURE_CELL_DIMS_RESET_DEPTH_BUTTON_TEST_ID = 'structure-cell-dims-reset-depth-button';
export const STRUCTURE_CELL_DIMS_RESET_HEX_PROTRUSION_BUTTON_TEST_ID =
  'structure-cell-dims-reset-hex-protrusion-button';
export const STRUCTURE_CELL_DIMS_RESET_HEX_DOOR_WIDTH_BUTTON_TEST_ID =
  'structure-cell-dims-reset-hex-door-width-button';
export const STRUCTURE_LIBRARY_UPPER_DOORS_BUTTON_TEST_ID = 'structure-library-upper-doors-button';
export const STRUCTURE_LIBRARY_GLASS_BUTTON_GROUP_TEST_ID = 'structure-library-glass-buttons';
export const STRUCTURE_RESTORE_MAIN_WARDROBE_BUTTON_TEST_ID = 'structure-restore-main-wardrobe-button';
export const STRUCTURE_STACK_SPLIT_SECTION_TEST_ID = 'structure-stack-split-section';
export const STRUCTURE_STACK_SPLIT_MODE_BUTTON_TEST_ID = 'structure-stack-split-mode-button';
export const STRUCTURE_STACK_SPLIT_DECORATIVE_SEPARATOR_BUTTON_TEST_ID =
  'structure-stack-split-decorative-separator-button';

export type StructureSetRaw = (key: StructureTabNumericKey, value: number) => void;
export type StructureStackLinkField = 'depth' | 'width' | 'doors';
export type StructureLibraryGlassOptionId = 'glass' | 'full' | 'profile';

export type StructureLibraryGlassOption = {
  id: StructureLibraryGlassOptionId;
  paintId: string;
  label: string;
  testId: string;
};

export const STRUCTURE_LIBRARY_GLASS_OPTIONS: ReadonlyArray<StructureLibraryGlassOption> = [
  {
    id: 'glass',
    paintId: 'glass',
    label: 'זכוכית',
    testId: 'structure-library-glass-button-glass',
  },
  {
    id: 'full',
    paintId: encodeGlassFrameStylePaintToken('flat'),
    label: 'זכוכית מלאה',
    testId: 'structure-library-glass-button-full',
  },
  {
    id: 'profile',
    paintId: encodeGlassFrameStylePaintToken('double_profile'),
    label: 'זכוכית פרופיל כפול',
    testId: 'structure-library-glass-button-profile',
  },
];

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
  cellDimsPanelOpen: boolean;
  cellDimsHexPanelOpen: boolean;
  hasAnyCellDimsOverrides: boolean;
  defaultCellWidth: number;
  cellDimsWidth: number | '';
  cellDimsHeight: number | '';
  cellDimsDepth: number | '';
  cellDimsHexMode: boolean;
  cellDimsHexProtrusion: number | '';
  cellDimsHexDoorWidth: number | '';
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
  stackSplitDecorativeSeparatorSideOverhangCm: number;
  stackSplitDecorativeSeparatorFrontOverhangCm: number;
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
  onEnterHexCellDimsMode: () => void;
  onExitHexCellDimsMode: () => void;
  onClearCellDimsWidth: () => void;
  onClearCellDimsHeight: () => void;
  onClearCellDimsDepth: () => void;
  onClearCellDimsHexProtrusion: () => void;
  onClearCellDimsHexDoorWidth: () => void;
  onToggleStackSplit: () => void;
  onToggleStackSplitDecorativeSeparator: () => void;
  onSetStackSplitDecorativeSeparatorSideOverhangCm: (value: number) => void;
  onSetStackSplitDecorativeSeparatorFrontOverhangCm: (value: number) => void;
  onToggleLibraryUpperDoors: () => void;
  onPickLibraryGlass: (paintId: string) => void;
  renderStackLinkBadge: (field: StructureStackLinkField, isManual: boolean) => ReactNode;
  onResetAutoWidth: () => void;
  noMainWardrobeActive?: boolean;
  onRestoreMainWardrobe?: () => void;
};

export type StructureDimensionsSectionProps = StructureDimensionsContentProps & {
  visible: boolean;
};
