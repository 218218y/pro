// Canonical UI slice state.
//
// This is the closed, store-owned UI state contract. External/project payloads
// may be permissive at their parsing boundary, but values admitted into
// store.ui must be represented here explicitly.

import type { UnknownRecord } from './common';
import type { UiRawInputsLike } from './ui_raw';

export type ShoeDrawerAutoBasePreviousType = 'plinth' | 'legs' | 'none' | null;

export interface UiState {
  // Canonical builder-driving structural inputs.
  raw?: UiRawInputsLike | null;

  // Navigation / project identity.
  activeTab?: string;
  projectName?: string;
  selectedModelId?: string;

  // Compatibility-free top-level UI presentation values. Structural build
  // essentials remain owned by ui.raw; these fields are presentation mirrors
  // only where the current UI explicitly consumes them.
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;
  color?: string;

  // Site2 remote tabs gate state (the site variant itself is App.config-owned).
  site2TabsGateOpen?: boolean;
  site2TabsGateUntil?: number | null;
  site2TabsGateBy?: string;

  // Design tab.
  doorStyle?: string;
  colorChoice?: string;
  frontColorShelfInheritanceMode?: string;
  customColor?: string;
  groovesEnabled?: boolean;
  splitDoors?: boolean;
  removeDoorsEnabled?: boolean;
  hasCornice?: boolean;
  corniceType?: string;
  currentCurtainChoice?: string;
  grooveManualEnabled?: boolean;
  currentGrooveDraftHeightCm?: string;
  currentGrooveDraftWidthCm?: string;
  currentGrooveOrientation?: 'vertical' | 'horizontal';
  currentMirrorDraftHeightCm?: string | number;
  currentMirrorDraftWidthCm?: string | number;

  // Interior tab.
  currentLayoutType?: unknown;
  currentGridDivisions?: unknown;
  currentGridShelfVariant?: unknown;
  currentExtDrawerType?: unknown;
  currentExtDrawerCount?: unknown;
  internalDrawersEnabled?: boolean;
  handleControl?: boolean;
  currentHandleToolType?: unknown;
  currentHandleToolColor?: unknown;
  currentHandleToolEdgeVariant?: unknown;
  perCellGridMap?: UnknownRecord;
  activeGridCellId?: string | number | null;

  // Notes / view toggles.
  notesEnabled?: boolean;
  showHanger?: boolean;
  showContents?: boolean;
  showDimensions?: boolean;

  // Autosave UI hint.
  autosaveInfo?: {
    timestamp?: number;
    dateString?: string;
  };

  // Sketch tab: temporary restore point used while the main wardrobe is hidden.
  noMainSketchRestoreSnapshot?: unknown;

  // Structure tab.
  baseType?: string;
  shoeDrawerAutoBasePreviousType?: ShoeDrawerAutoBasePreviousType;
  baseLegStyle?: string;
  baseLegColor?: string;
  baseLegPlatformMode?: string;
  baseLegPlatformSideMode?: string;
  baseLegPlatformSideOverhangCm?: number;
  baseLegPlatformFrontOverhangCm?: number;
  basePlinthHeightCm?: number;
  baseLegHeightCm?: number;
  baseLegWidthCm?: number;
  slidingTracksColor?: string;
  structureSelect?: string;
  singleDoorPos?: string;
  hingeDirection?: boolean;
  isChestMode?: boolean;
  chestCommodeEnabled?: boolean;
  chestCommodeMirrorWidthManual?: boolean;
  libraryUpperDoorsHidden?: boolean;

  // Corner.
  cornerMode?: boolean;
  cornerSide?: string;
  cornerWidth?: number;
  cornerDoors?: number;
  cornerHeight?: number;
  cornerDepth?: number;
  cornerCabinetWallLenCm?: number;

  // Stack split.
  stackSplitEnabled?: boolean;
  stackSplitDecorativeSeparatorEnabled?: boolean;
  stackSplitDecorativeSeparatorSideOverhangCm?: number;
  stackSplitDecorativeSeparatorFrontOverhangCm?: number;

  // Per-cell dimensions / hex-cell panel disclosure state.
  cellDimsPanelOpen?: boolean;
  cellDimsHexPanelOpen?: boolean;

  // View/mode toggles.
  sketchMode?: boolean;
  globalClickMode?: boolean;
  darkMode?: boolean;
  multiColorEnabled?: boolean;

  // Settings visual controls / room design.
  lightingControl?: boolean;
  currentFloorType?: string;
  lastSelectedFloorStyleIdByType?: UnknownRecord;
  lastSelectedWallColor?: string;
  lastLightPreset?: string;
  lightAmb?: number | string;
  lightDir?: number | string;
  lightX?: number | string;
  lightY?: number | string;
  lightZ?: number | string;

  // PDF editor (order pdf in-place editor).
  orderPdfEditorOpen?: boolean;
  orderPdfEditorZoom?: number;
  orderPdfEditorDraft?: unknown;
}
