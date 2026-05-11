import type { ReactNode } from 'react';

import type { BaseLegColor, BaseLegStyle } from '../../../features/base_leg_support.js';
import type { StructurePattern } from './structure_tab_saved_models_patterns.js';

export type BaseType = 'plinth' | 'legs' | 'none';
export type StructureBaseLegStyle = BaseLegStyle;
export type StructureBaseLegColor = BaseLegColor;
export type SlidingTracksColor = 'nickel' | 'black';

export type CommitStructural = (
  partial: { structureSelect?: string; singleDoorPos?: string },
  source: string
) => void;

export type StructureBodySectionProps = {
  baseType: BaseType;
  baseLegStyle: StructureBaseLegStyle;
  baseLegColor: StructureBaseLegColor;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  isChestMode: boolean;
  isSliding: boolean;
  slidingTracksColor: SlidingTracksColor;
  shouldShowStructureButtons: boolean;
  patterns: StructurePattern[];
  structureSelect: string;
  shouldShowSingleDoor: boolean;
  doors: number;
  singleDoorPosRaw: string;
  shouldShowHingeBtn: boolean;
  hingeDirection: boolean;
  hingeEditActive: boolean;
  onSetBaseType: (value: BaseType) => void;
  onSetBaseLegStyle: (value: StructureBaseLegStyle) => void;
  onSetBaseLegColor: (value: StructureBaseLegColor) => void;
  onSetBasePlinthHeightCm: (value: number) => void;
  onSetBaseLegHeightCm: (value: number) => void;
  onSetBaseLegWidthCm: (value: number) => void;
  onSetSlidingTracksColor: (value: SlidingTracksColor) => void;
  onCommitStructural: CommitStructural;
  onSetHingeDirection: (value: boolean) => void;
  onEnterHingeEditMode: () => void;
  onExitHingeEditMode: () => void;
};

export type StructureBodyTypeOption<TValue extends string> = {
  value: TValue;
  label: ReactNode;
  iconClass?: string;
  title?: string;
};

export const BASE_TYPE_OPTIONS: ReadonlyArray<StructureBodyTypeOption<BaseType>> = [
  { value: 'plinth', label: 'צוקל', iconClass: 'fas fa-border-all wp-r-type-icon' },
  { value: 'legs', label: 'רגליים', iconClass: 'fas fa-chair wp-r-type-icon' },
  { value: 'none', label: 'ללא', iconClass: 'fas fa-ban wp-r-type-icon' },
];

export const SLIDING_TRACKS_OPTIONS: ReadonlyArray<StructureBodyTypeOption<SlidingTracksColor>> = [
  { value: 'nickel', label: 'מסילות ניקל' },
  { value: 'black', label: 'מסילות שחורות' },
];

export const BASE_LEG_STYLE_OPTIONS: ReadonlyArray<StructureBodyTypeOption<StructureBaseLegStyle>> = [
  { value: 'tapered', label: 'שפיץ', iconClass: 'fas fa-caret-down wp-r-type-icon' },
  { value: 'round', label: 'עגולות', iconClass: 'fas fa-circle wp-r-type-icon' },
  { value: 'square', label: 'מרובעות', iconClass: 'fas fa-square wp-r-type-icon' },
];

export const BASE_LEG_COLOR_OPTIONS: ReadonlyArray<StructureBodyTypeOption<StructureBaseLegColor>> = [
  { value: 'black', label: 'שחור' },
  { value: 'nickel', label: 'ניקל' },
  { value: 'gold', label: 'זהב' },
];

export function getSingleDoorPositionOptions(doors: number): ReadonlyArray<StructureBodyTypeOption<string>> {
  if (doors === 7) {
    return [
      { value: 'right', label: 'ימין', iconClass: 'fas fa-arrow-right wp-r-type-icon' },
      { value: 'center-right', label: 'אמצע ימין', iconClass: 'fas fa-align-right wp-r-type-icon' },
      { value: 'center-left', label: 'אמצע שמאל', iconClass: 'fas fa-align-left wp-r-type-icon' },
      { value: 'left', label: 'שמאל', iconClass: 'fas fa-arrow-left wp-r-type-icon' },
    ];
  }

  return [
    { value: 'right', label: 'ימין', iconClass: 'fas fa-arrow-right wp-r-type-icon' },
    ...(doors === 5 || doors > 7
      ? [{ value: 'center', label: 'אמצע', iconClass: 'fas fa-arrows-alt-h wp-r-type-icon' }]
      : []),
    { value: 'left', label: 'שמאל', iconClass: 'fas fa-arrow-left wp-r-type-icon' },
  ];
}

export function getSingleDoorSelectorClassName(doors: number): string {
  const sizeClass =
    doors === 7
      ? 'wp-r-single-door-7'
      : doors === 5
        ? 'wp-r-single-door-5'
        : doors === 3
          ? 'wp-r-single-door-3'
          : '';
  return `type-selector wp-r-type-selector wp-r-single-door-selector ${sizeClass}`.trim();
}
