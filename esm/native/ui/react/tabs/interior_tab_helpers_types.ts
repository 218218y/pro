import type { ReactNode } from 'react';

import type { BaseLegColor, BaseLegStyle } from '../../../features/base_leg_support.js';
import type { HandleFinishColor } from '../../../features/handle_finish_shared.js';

export type LayoutTypeId = 'shelves' | 'hanging' | 'hanging_split' | 'mixed' | 'storage' | 'brace_shelves';
export type ManualToolId = 'shelf' | 'rod' | 'storage';
export type SketchBoxCorniceType = 'classic' | 'wave';
export type SketchBoxBaseType = 'plinth' | 'legs' | 'none';
export type SketchBoxLegStyle = BaseLegStyle;
export type SketchBoxLegColor = BaseLegColor;

export type HandleType = 'standard' | 'edge' | 'none';
export type EdgeHandleVariant = 'short' | 'long';

export type ExtDrawerType = 'shoe' | 'regular';

export type DoorTrimUiAxis = 'horizontal' | 'vertical';
export type DoorTrimUiColor = 'nickel' | 'silver' | 'gold' | 'black';
export type HandleUiColor = HandleFinishColor;
export type DoorTrimUiSpan = 'full' | 'three_quarters' | 'half' | 'third' | 'quarter' | 'custom';

export type OptionBtnProps = {
  key?: string | number;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
  testId?: string;
};

export type CountBtnProps = {
  key?: string | number;
  selected?: boolean;
  className?: string;
  onClick?: () => void;
  children: ReactNode;
  title?: string;
  testId?: string;
};

export type InteriorTabViewProps = {
  active: boolean;
};
