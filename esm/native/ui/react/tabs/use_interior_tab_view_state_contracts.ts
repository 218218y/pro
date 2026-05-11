import type { Dispatch, SetStateAction } from 'react';

import type { AppContainer, ModeActionOptsLike } from '../../../../../types';
import type {
  DoorTrimUiColor,
  DoorTrimUiSpan,
  EdgeHandleVariant,
  ExtDrawerType,
  HandleType,
  HandleUiColor,
  LayoutTypeId,
  ManualToolId,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';
import type {
  HandleTypeOption as InteriorHandleTypeOption,
  LayoutTypeOption as InteriorLayoutTypeOption,
  ManualToolOption as InteriorManualToolOption,
} from './interior_tab_local_state_runtime.js';

export type LayoutTypeOption = InteriorLayoutTypeOption;
export type ManualToolOption = InteriorManualToolOption;
export type HandleTypeOption = InteriorHandleTypeOption;

export type InteriorTabViewState = {
  modeOpts: ModeActionOptsLike;
  wardrobeType: 'sliding' | 'hinged';
  hasIntDrawerData: boolean;
  isLayoutMode: boolean;
  isManualLayoutMode: boolean;
  isBraceShelvesMode: boolean;
  isSketchToolActive: boolean;
  isExtDrawerMode: boolean;
  isDividerMode: boolean;
  isIntDrawerMode: boolean;
  isHandleMode: boolean;
  isManualHandlePositionMode: boolean;
  isDoorTrimMode: boolean;
  layoutActive: boolean;
  layoutType: LayoutTypeId;
  manualTool: ManualToolId;
  manualToolRaw: string;
  currentGridDivisions: number;
  gridShelfVariant: 'regular' | 'double' | 'glass' | 'brace';
  extDrawerType: ExtDrawerType;
  extDrawerCount: number;
  internalDrawersEnabled: boolean;
  handleControlEnabled: boolean;
  globalHandleType: HandleType;
  handleToolType: HandleType;
  globalHandleColor: HandleUiColor;
  handleToolColor: HandleUiColor;
  globalEdgeHandleVariant: EdgeHandleVariant;
  handleToolEdgeVariant: EdgeHandleVariant;
  manualRowOpen: boolean;
  sketchRowOpen: boolean;
  manualUiTool: ManualToolId;
  showManualRow: boolean;
  activeManualToolForUi: ManualToolId;
  showGridControls: boolean;
  sketchShelvesOpen: boolean;
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
  extCounts: number[];
  handleTypes: HandleTypeOption[];
  setManualRowOpen: Dispatch<SetStateAction<boolean>>;
  setSketchRowOpen: Dispatch<SetStateAction<boolean>>;
  setManualUiTool: Dispatch<SetStateAction<ManualToolId>>;
  setSketchShelvesOpen: Dispatch<SetStateAction<boolean>>;
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
  setDoorTrimColor: Dispatch<SetStateAction<DoorTrimUiColor>>;
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
};

export type UseInteriorTabViewStateHook = (app: AppContainer) => InteriorTabViewState;
