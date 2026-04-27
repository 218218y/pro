import type { CSSProperties, Dispatch, SetStateAction } from 'react';

import type { HandleFinishColor, HandleFinishPresetColor } from '../../../features/handle_finish_shared.js';
import type {
  DoorTrimUiAxis,
  DoorTrimUiColor,
  DoorTrimUiSpan,
  LayoutTypeId,
  ManualToolId,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';

export type LayoutTypeOption = { id: LayoutTypeId; label: string; icon: string };
export type ManualToolOption = { id: ManualToolId; label: string };

export const METAL_FINISH_SWATCH_BG_BY_COLOR: Record<HandleFinishPresetColor, string> = {
  nickel: '#e5e9ef',
  silver: '#cfd5dd',
  gold: '#e5c66b',
  black: '#15171a',
  pink: '#f3b6cb',
};

export function resolveMetalFinishSwatchBg(color: HandleFinishColor): string {
  return Object.prototype.hasOwnProperty.call(METAL_FINISH_SWATCH_BG_BY_COLOR, color)
    ? METAL_FINISH_SWATCH_BG_BY_COLOR[color as HandleFinishPresetColor]
    : String(color || METAL_FINISH_SWATCH_BG_BY_COLOR.nickel);
}

export const METAL_FINISH_OPTIONS: Array<{
  id: HandleFinishColor;
  label: string;
  style?: CSSProperties;
}> = [
  { id: 'nickel', label: 'ניקל', style: { background: '#e5e9ef', color: '#1f2933' } },
  { id: 'silver', label: 'כסף' },
  { id: 'gold', label: 'זהב' },
  { id: 'black', label: 'שחור', style: { background: '#15171a', color: '#fff' } },
  { id: 'pink', label: 'ורוד' },
];

export const DOOR_TRIM_COLORS: Array<{
  id: DoorTrimUiColor;
  label: string;
  style?: CSSProperties;
}> = [
  { id: 'nickel', label: 'ניקל', style: { background: '#e5e9ef', color: '#1f2933' } },
  { id: 'silver', label: 'כסף' },
  { id: 'gold', label: 'זהב' },
  { id: 'black', label: 'שחור', style: { background: '#15171a', color: '#fff' } },
];

const DOOR_TRIM_SPAN_OPTIONS: Array<{ id: DoorTrimUiSpan; label: string }> = [
  { id: 'full', label: 'מלא' },
  { id: 'three_quarters', label: '3/4' },
  { id: 'half', label: 'חצי' },
  { id: 'third', label: 'שליש' },
  { id: 'quarter', label: 'רבע' },
  { id: 'custom', label: 'לפי מידה' },
];

export const DOOR_TRIM_SPAN_PRIMARY_OPTIONS = DOOR_TRIM_SPAN_OPTIONS.slice(0, 3);
export const DOOR_TRIM_SPAN_SECONDARY_OPTIONS = DOOR_TRIM_SPAN_OPTIONS.slice(3);

export type InteriorLayoutSectionProps = {
  layoutActive: boolean;
  isLayoutMode: boolean;
  isManualLayoutMode: boolean;
  isBraceShelvesMode: boolean;
  isSketchToolActive: boolean;
  layoutType: LayoutTypeId;
  manualTool: ManualToolId;
  manualToolRaw: string;
  manualUiTool: ManualToolId;
  activeManualToolForUi: ManualToolId;
  currentGridDivisions: number;
  gridShelfVariant: 'regular' | 'double' | 'glass' | 'brace';
  showManualRow: boolean;
  showGridControls: boolean;
  sketchShelvesOpen: boolean;
  sketchRowOpen: boolean;
  sketchBoxHeightCm: number;
  sketchBoxHeightDraft: string;
  sketchBoxWidthCm: number | '';
  sketchBoxWidthDraft: string;
  sketchBoxDepthCm: number | '';
  sketchBoxDepthDraft: string;
  sketchStorageHeightCm: number;
  sketchStorageHeightDraft: string;
  sketchBoxPanelOpen: boolean;
  sketchBoxCornicePanelOpen: boolean;
  sketchBoxCorniceType: SketchBoxCorniceType;
  sketchBoxBasePanelOpen: boolean;
  sketchBoxBaseType: SketchBoxBaseType;
  sketchBoxLegStyle: SketchBoxLegStyle;
  sketchBoxLegColor: SketchBoxLegColor;
  sketchBoxLegHeightCm: number;
  sketchBoxLegHeightDraft: string;
  sketchBoxLegWidthCm: number;
  sketchBoxLegWidthDraft: string;
  sketchExtDrawersPanelOpen: boolean;
  sketchExtDrawerCount: number;
  sketchExtDrawerHeightCm: number;
  sketchExtDrawerHeightDraft: string;
  sketchIntDrawerHeightCm: number;
  sketchIntDrawerHeightDraft: string;
  sketchShelfDepthByVariant: Record<string, number | ''>;
  sketchShelfDepthDraftByVariant: Record<string, string>;
  isDoorTrimMode: boolean;
  doorTrimPanelOpen: boolean;
  doorTrimColor: DoorTrimUiColor;
  doorTrimHorizontalSpan: DoorTrimUiSpan;
  doorTrimHorizontalCustomCm: number | '';
  doorTrimHorizontalCustomDraft: string;
  doorTrimHorizontalCrossCm: number | '';
  doorTrimHorizontalCrossDraft: string;
  doorTrimVerticalSpan: DoorTrimUiSpan;
  doorTrimVerticalCustomCm: number | '';
  doorTrimVerticalCustomDraft: string;
  doorTrimVerticalCrossCm: number | '';
  doorTrimVerticalCrossDraft: string;
  layoutTypes: LayoutTypeOption[];
  manualTools: ManualToolOption[];
  gridDivs: number[];
  setManualRowOpen: Dispatch<SetStateAction<boolean>>;
  setManualUiTool: Dispatch<SetStateAction<ManualToolId>>;
  setSketchShelvesOpen: Dispatch<SetStateAction<boolean>>;
  setSketchRowOpen: Dispatch<SetStateAction<boolean>>;
  setSketchBoxHeightCm: Dispatch<SetStateAction<number>>;
  setSketchBoxHeightDraft: Dispatch<SetStateAction<string>>;
  setSketchBoxWidthCm: Dispatch<SetStateAction<number | ''>>;
  setSketchBoxWidthDraft: Dispatch<SetStateAction<string>>;
  setSketchBoxDepthCm: Dispatch<SetStateAction<number | ''>>;
  setSketchBoxDepthDraft: Dispatch<SetStateAction<string>>;
  setSketchStorageHeightCm: Dispatch<SetStateAction<number>>;
  setSketchStorageHeightDraft: Dispatch<SetStateAction<string>>;
  setSketchBoxPanelOpen: Dispatch<SetStateAction<boolean>>;
  setSketchBoxCornicePanelOpen: Dispatch<SetStateAction<boolean>>;
  setSketchBoxCorniceType: Dispatch<SetStateAction<SketchBoxCorniceType>>;
  setSketchBoxBasePanelOpen: Dispatch<SetStateAction<boolean>>;
  setSketchBoxBaseType: Dispatch<SetStateAction<SketchBoxBaseType>>;
  setSketchBoxLegStyle: Dispatch<SetStateAction<SketchBoxLegStyle>>;
  setSketchBoxLegColor: Dispatch<SetStateAction<SketchBoxLegColor>>;
  setSketchBoxLegHeightCm: Dispatch<SetStateAction<number>>;
  setSketchBoxLegHeightDraft: Dispatch<SetStateAction<string>>;
  setSketchBoxLegWidthCm: Dispatch<SetStateAction<number>>;
  setSketchBoxLegWidthDraft: Dispatch<SetStateAction<string>>;
  setSketchExtDrawersPanelOpen: Dispatch<SetStateAction<boolean>>;
  setSketchExtDrawerCount: Dispatch<SetStateAction<number>>;
  setSketchExtDrawerHeightCm: Dispatch<SetStateAction<number>>;
  setSketchExtDrawerHeightDraft: Dispatch<SetStateAction<string>>;
  setSketchIntDrawerHeightCm: Dispatch<SetStateAction<number>>;
  setSketchIntDrawerHeightDraft: Dispatch<SetStateAction<string>>;
  setSketchShelfDepthByVariant: Dispatch<SetStateAction<Record<string, number | ''>>>;
  setSketchShelfDepthDraftByVariant: Dispatch<SetStateAction<Record<string, string>>>;
  setDoorTrimPanelOpen: Dispatch<SetStateAction<boolean>>;
  setDoorTrimColor: (color: DoorTrimUiColor) => void;
  setDoorTrimHorizontalSpan: Dispatch<SetStateAction<DoorTrimUiSpan>>;
  setDoorTrimHorizontalCustomCm: Dispatch<SetStateAction<number | ''>>;
  setDoorTrimHorizontalCustomDraft: Dispatch<SetStateAction<string>>;
  setDoorTrimHorizontalCrossCm: Dispatch<SetStateAction<number | ''>>;
  setDoorTrimHorizontalCrossDraft: Dispatch<SetStateAction<string>>;
  setDoorTrimVerticalSpan: Dispatch<SetStateAction<DoorTrimUiSpan>>;
  setDoorTrimVerticalCustomCm: Dispatch<SetStateAction<number | ''>>;
  setDoorTrimVerticalCustomDraft: Dispatch<SetStateAction<string>>;
  setDoorTrimVerticalCrossCm: Dispatch<SetStateAction<number | ''>>;
  setDoorTrimVerticalCrossDraft: Dispatch<SetStateAction<string>>;
  enterLayout: (type: LayoutTypeId) => void;
  exitLayoutOrManual: () => void;
  enterManual: (tool: ManualToolId) => void;
  exitManual: () => void;
  setGridDivisions: (count: number) => void;
  setGridShelfVariant: (variant: 'regular' | 'double' | 'glass' | 'brace') => void;
  activateManualToolId: (toolId: string) => void;
  activateDoorTrimMode: (
    axis: DoorTrimUiAxis,
    span: DoorTrimUiSpan,
    sizeCm?: number | '',
    crossSizeCm?: number | ''
  ) => void;
  enterSketchShelfTool: (variant: string) => void;
  enterSketchBoxTool: (heightCm: number, widthCm: number | '', depthCm: number | '') => void;
  enterSketchBoxCorniceTool: (type: SketchBoxCorniceType) => void;
  enterSketchBoxBaseTool: (
    type: SketchBoxBaseType,
    style: SketchBoxLegStyle,
    color: SketchBoxLegColor,
    heightCm: number,
    widthCm: number
  ) => void;
  enterSketchExtDrawersTool: (count: number, drawerHeightCm: number) => void;
  enterSketchIntDrawersTool: (drawerHeightCm: number) => void;
};
