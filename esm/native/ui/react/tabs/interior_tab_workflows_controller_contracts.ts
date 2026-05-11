import type { AppContainer, UnknownRecord } from '../../../../../types';
import type {
  DoorTrimUiAxis,
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

export const CLOSE_DOORS_OPTS: UnknownRecord = { closeDoors: true };
export const DOOR_TRIM_MODE_TOAST = 'פסי עיטור: ריחוף מציג מיקום, לחיצה מוסיפה, ולחיצה חוזרת מסירה';

export type InteriorTabWorkflowStateLike = {
  modeOpts: UnknownRecord;
  hasIntDrawerData: boolean;
  isLayoutMode: boolean;
  isManualLayoutMode: boolean;
  isBraceShelvesMode: boolean;
  isIntDrawerMode: boolean;
  isDoorTrimMode: boolean;
  internalDrawersEnabled: boolean;
  doorTrimColor: DoorTrimUiColor;
  doorTrimHorizontalSpan: DoorTrimUiSpan;
  doorTrimHorizontalCustomCm: number | '';
  doorTrimHorizontalCrossCm: number | '';
  doorTrimVerticalSpan: DoorTrimUiSpan;
  doorTrimVerticalCustomCm: number | '';
  doorTrimVerticalCrossCm: number | '';
  sketchShelfDepthByVariant: Record<string, number | ''>;
  sketchExtDrawerHeightCm: number;
  sketchIntDrawerHeightCm: number;
  setDoorTrimColor: (color: DoorTrimUiColor) => void;
};

export type InteriorTabWorkflowController = {
  enterLayout: (layout: LayoutTypeId) => void;
  exitLayoutOrManual: () => void;
  enterManual: (tool: ManualToolId) => void;
  exitManual: () => void;
  setGridDivisions: (count: number) => void;
  setGridShelfVariant: (variant: 'regular' | 'double' | 'glass' | 'brace') => void;
  enterExtDrawer: (type: ExtDrawerType, count?: number) => void;
  exitExtDrawer: () => void;
  toggleDividerMode: () => void;
  toggleIntDrawerMode: () => void;
  setInternalDrawersEnabled: (on: boolean) => void;
  setHandleControlEnabled: (on: boolean) => void;
  setGlobalEdgeHandleVariant: (variant: EdgeHandleVariant) => void;
  setHandleModeEdgeVariant: (variant: EdgeHandleVariant) => void;
  setGlobalHandle: (type: HandleType) => void;
  setGlobalHandleColor: (color: HandleUiColor) => void;
  toggleHandleMode: (type?: HandleType) => void;
  setHandleModeColor: (color: HandleUiColor) => void;
  enterManualHandlePositionMode: () => void;
  activateManualToolId: (toolId: string) => void;
  activateDoorTrimMode: (
    axis: DoorTrimUiAxis,
    span: DoorTrimUiSpan,
    sizeCm?: number | '',
    crossSizeCm?: number | ''
  ) => void;
  setDoorTrimColorAndMaybeRefresh: (color: DoorTrimUiColor) => void;
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

export type CreateInteriorTabWorkflowControllerArgs = {
  app: AppContainer;
  state: InteriorTabWorkflowStateLike;
};

export type InteriorWorkflowModeIds = {
  layout: string;
  manualLayout: string;
  braceShelves: string;
  extDrawer: string;
  doorTrim: string;
};
