import type { AppContainer, UnknownRecord } from '../../../../../types';

import type {
  DoorTrimUiColor,
  DoorTrimUiSpan,
  SketchBoxBaseType,
  SketchBoxCorniceType,
  SketchBoxLegColor,
  SketchBoxLegStyle,
} from './interior_tab_helpers.js';

export type InteriorTabViewStateSyncInput = {
  wardrobeType: 'sliding' | 'hinged';
  isExtDrawerMode: boolean;
  modeExtDrawer: string;
  isSketchToolActive: boolean;
  manualToolRaw: string;
  isDoorTrimMode: boolean;
  modeOpts: UnknownRecord;
  isManualLayoutMode: boolean;
  manualTool: 'shelf' | 'rod' | 'storage';
};

export type InteriorTabViewStateController = {
  syncFromViewState: (input: InteriorTabViewStateSyncInput) => void;
  syncSlidingWardrobeExtDrawerGuard: (
    wardrobeType: 'sliding' | 'hinged',
    isExtDrawerMode: boolean,
    modeExtDrawer: string
  ) => void;
  syncSketchShelvesState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncDoorTrimPanelState: (isDoorTrimMode: boolean) => void;
  syncDoorTrimDraftState: (isDoorTrimMode: boolean, modeOpts: UnknownRecord) => void;
  syncSketchBoxPanelState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchBoxDraftState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchStorageHeightState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchBoxCorniceState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchBoxBaseState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchExtDrawersState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchIntDrawersState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncSketchShelfDepthState: (isSketchToolActive: boolean, manualToolRaw: string) => void;
  syncManualUiToolState: (isManualLayoutMode: boolean, manualTool: 'shelf' | 'rod' | 'storage') => void;
};

export type CreateInteriorTabViewStateControllerArgs = {
  app: AppContainer;
  setSketchShelvesOpen: (next: boolean) => void;
  setDoorTrimPanelOpen: (next: boolean) => void;
  setDoorTrimColor: (next: DoorTrimUiColor) => void;
  setDoorTrimHorizontalSpan: (next: DoorTrimUiSpan) => void;
  setDoorTrimHorizontalCustomCm: (next: number | '') => void;
  setDoorTrimHorizontalCustomDraft: (next: string) => void;
  setDoorTrimHorizontalCrossCm: (next: number | '') => void;
  setDoorTrimHorizontalCrossDraft: (next: string) => void;
  setDoorTrimVerticalSpan: (next: DoorTrimUiSpan) => void;
  setDoorTrimVerticalCustomCm: (next: number | '') => void;
  setDoorTrimVerticalCustomDraft: (next: string) => void;
  setDoorTrimVerticalCrossCm: (next: number | '') => void;
  setDoorTrimVerticalCrossDraft: (next: string) => void;
  setSketchBoxPanelOpen: (next: boolean) => void;
  setSketchBoxHeightCm: (next: number) => void;
  setSketchBoxHeightDraft: (next: string) => void;
  setSketchBoxWidthCm: (next: number | '') => void;
  setSketchBoxWidthDraft: (next: string) => void;
  setSketchBoxDepthCm: (next: number | '') => void;
  setSketchBoxDepthDraft: (next: string) => void;
  setSketchStorageHeightCm: (next: number) => void;
  setSketchStorageHeightDraft: (next: string) => void;
  setSketchBoxCorniceType: (next: SketchBoxCorniceType) => void;
  setSketchBoxCornicePanelOpen: (next: boolean) => void;
  setSketchBoxBaseType: (next: SketchBoxBaseType) => void;
  setSketchBoxBasePanelOpen: (next: boolean) => void;
  setSketchBoxLegWidthCm: (next: number) => void;
  setSketchBoxLegWidthDraft: (next: string) => void;
  setSketchBoxLegStyle: (next: SketchBoxLegStyle) => void;
  setSketchBoxLegColor: (next: SketchBoxLegColor) => void;
  setSketchBoxLegHeightCm: (next: number) => void;
  setSketchBoxLegHeightDraft: (next: string) => void;
  setSketchExtDrawerCount: (next: number) => void;
  setSketchExtDrawersPanelOpen: (next: boolean) => void;
  setSketchExtDrawerHeightCm: (next: number) => void;
  setSketchExtDrawerHeightDraft: (next: string) => void;
  setSketchIntDrawerHeightCm: (next: number) => void;
  setSketchIntDrawerHeightDraft: (next: string) => void;
  setSketchShelfDepthByVariant: (
    update: (prev: Record<string, number | ''>) => Record<string, number | ''>
  ) => void;
  setSketchShelfDepthDraftByVariant: (
    update: (prev: Record<string, string>) => Record<string, string>
  ) => void;
  setManualUiTool: (next: 'shelf' | 'rod' | 'storage') => void;
};
