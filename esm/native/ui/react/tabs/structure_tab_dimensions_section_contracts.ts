import type { ReactNode } from 'react';

import { encodeGlassFrameStylePaintToken } from '../../../features/door_style_overrides.js';
import type { StructureTabNumericKey } from './structure_tab_shared.js';

export const STRUCTURE_CELL_DIMS_SECTION_TEST_ID = 'structure-cell-dims-section';
export const STRUCTURE_CELL_DIMS_MODE_BUTTON_TEST_ID = 'structure-cell-dims-mode-button';
export const STRUCTURE_CELL_DIMS_RESET_BUTTON_TEST_ID = 'structure-cell-dims-reset-button';
export const STRUCTURE_LIBRARY_UPPER_DOORS_BUTTON_TEST_ID = 'structure-library-upper-doors-button';
export const STRUCTURE_LIBRARY_GLASS_BUTTON_GROUP_TEST_ID = 'structure-library-glass-buttons';
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
    paintId: encodeGlassFrameStylePaintToken('tom'),
    label: 'זכוכית פרופיל תום',
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
  hasAnyCellDimsOverrides: boolean;
  defaultCellWidth: number;
  cellDimsWidth: number | '';
  cellDimsHeight: number | '';
  cellDimsDepth: number | '';
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
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
  onToggleStackSplitDecorativeSeparator: () => void;
  onToggleLibraryUpperDoors: () => void;
  onPickLibraryGlass: (paintId: string) => void;
  renderStackLinkBadge: (field: StructureStackLinkField, isManual: boolean) => ReactNode;
  onResetAutoWidth: () => void;
};

export type StructureDimensionsSectionProps = StructureDimensionsContentProps & {
  visible: boolean;
};
