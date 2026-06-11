import type { ReactNode } from 'react';

import type { StructureTabNumericKey } from './structure_tab_shared.js';

export type StructureSetRaw = (key: StructureTabNumericKey, value: number) => void;

export type StructureAuxDimFieldConfig = {
  activeId: string;
  label: string;
  step: number;
  buttonsStep: number;
  className: string;
};

export type StructureCornerDimensionId = 'cornerWidth' | 'cornerHeight' | 'cornerDepth';

export type StructureCornerDimFieldConfig = Omit<StructureAuxDimFieldConfig, 'activeId'> & {
  activeId: StructureCornerDimensionId;
};

export type StructureCornerSectionProps = {
  cornerMode: boolean;
  cornerSide: 'left' | 'right';
  cornerDoors: number;
  cornerWidth: number;
  cornerHeight: number;
  cornerDepth: number;
  onToggleCornerMode: (value: boolean) => void;
  onToggleCornerSide: () => void;
  onCommitCornerDoors: (value: number) => void;
  onCommitCornerWidth: (value: number) => void;
  onCommitCornerHeight: (value: number) => void;
  onCommitCornerDepth: (value: number) => void;
};

export type StructureChestSectionProps = {
  isChestMode: boolean;
  chestDrawersCount: number;
  width: number;
  height: number;
  depth: number;
  onToggleChestMode: (value: boolean) => void;
  onSetRaw: StructureSetRaw;
  onSetChestDrawersCount: (value: number) => void;
};

export type StructureLibrarySectionProps = {
  isLibraryMode: boolean;
  isChestMode: boolean;
  dimensionsContent: ReactNode;
  onToggleLibraryMode: () => void;
};

export const STRUCTURE_CORNER_SECTION_TEST_ID = 'structure-corner-section';
export const STRUCTURE_CORNER_MODE_TOGGLE_TEST_ID = 'structure-corner-mode-toggle';
export const STRUCTURE_CORNER_SIDE_BUTTON_TEST_ID = 'structure-corner-side-button';
export const STRUCTURE_CHEST_SECTION_TEST_ID = 'structure-chest-section';
export const STRUCTURE_CHEST_MODE_TOGGLE_TEST_ID = 'structure-chest-mode-toggle';
export const STRUCTURE_LIBRARY_SECTION_TEST_ID = 'structure-library-section';
export const STRUCTURE_LIBRARY_MODE_BUTTON_TEST_ID = 'structure-library-mode-button';

export const STRUCTURE_CORNER_DIMENSION_FIELDS: ReadonlyArray<StructureCornerDimFieldConfig> = [
  {
    activeId: 'cornerWidth',
    label: 'רוחב פינה',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-width',
  },
  {
    activeId: 'cornerHeight',
    label: 'גובה פינה',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-height',
  },
  {
    activeId: 'cornerDepth',
    label: 'עומק פינה',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-depth',
  },
];

export const STRUCTURE_CHEST_DIMENSION_FIELDS: ReadonlyArray<StructureAuxDimFieldConfig> = [
  {
    activeId: 'height',
    label: 'גובה (ס"מ)',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-height',
  },
  {
    activeId: 'width',
    label: 'רוחב (ס"מ)',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-width',
  },
  {
    activeId: 'depth',
    label: 'עומק (ס"מ)',
    step: 5,
    buttonsStep: 5,
    className: 'wp-r-dims-depth',
  },
];

export const STRUCTURE_LIBRARY_NOTICE_ACTIVE =
  'מצב ספריות פעיל: זכוכית לכל הדלתות (ללא וילון) + מדפים אוטומטיים (4 למעלה, 1 למטה) בכל תא.';
export const STRUCTURE_LIBRARY_NOTICE_INACTIVE =
  'מצב ספריות יוצר ספריה כברירת מחדל: חלוקה לחלק עליון/תחתון (כמו "ארון על ארון"), זכוכית לכל הדלתות, ומדפים אוטומטיים.';
