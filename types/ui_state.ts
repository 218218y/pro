// UI slice typed spine (React-facing)
//
// Goal:
// - Provide a stable, typed surface for the UI slice as consumed by React.
// - Keep this focused on high-value fields and allow extension via an index signature.
//
// Notes:
// - This does NOT attempt to fully type every UI key in the legacy system.
// - Prefer UnknownRecord over loose record bags to prevent `any` bleed into React.

import type { UnknownRecord } from './common';
import type { UiRawInputsLike } from './ui_raw';
import type { TabId } from './ui_tabs';

export interface UiState extends UnknownRecord {
  // Core structural inputs (often stored under ui.raw)
  raw?: UiRawInputsLike | UnknownRecord | null;

  // Navigation
  activeTab?: TabId | string;

  // Common UI scalars used by React tabs
  projectName?: string;
  selectedModelId?: string;
  // Common builder scalars mirrored on the UI slice
  width?: number;
  height?: number;
  depth?: number;
  doors?: number;
  color?: string;

  // Site2 tabs gate (remote controlled)
  site2TabsGateOpen?: boolean;
  site2TabsGateUntil?: number | null;
  site2TabsGateBy?: string;

  // Design tab
  doorStyle?: string;
  colorChoice?: string;
  groovesEnabled?: boolean;
  splitDoors?: boolean;
  removeDoorsEnabled?: boolean;
  hasCornice?: boolean;
  corniceType?: string;
  currentCurtainChoice?: string;

  // Interior tab
  currentLayoutType?: unknown;
  currentGridDivisions?: unknown;
  currentGridShelfVariant?: unknown;
  currentExtDrawerType?: unknown;
  currentExtDrawerCount?: unknown;
  internalDrawersEnabled?: boolean;
  handleControl?: boolean;

  // Notes overlay
  notesEnabled?: boolean;

  // Autosave UI hint (small object stamped by autosave service)
  autosaveInfo?: {
    timestamp?: number;
    dateString?: string;
  };

  // View toggles
  showHanger?: boolean;
  showContents?: boolean;

  // Structure tab
  baseType?: 'plinth' | 'legs' | 'none' | string;
  baseLegStyle?: 'tapered' | 'round' | 'square' | string;
  baseLegColor?: 'black' | 'nickel' | 'gold' | string;
  basePlinthHeightCm?: number | string;
  baseLegHeightCm?: number | string;
  slidingTracksColor?: 'nickel' | 'black' | string;
  structureSelect?: string;
  singleDoorPos?: string;
  hingeDirection?: boolean;
  isChestMode?: boolean;
  chestCommodeEnabled?: boolean;
  chestCommodeMirrorWidthManual?: boolean;

  // Corner
  cornerMode?: boolean;
  cornerSide?: 'left' | 'right' | string;
  cornerWidth?: number;
  cornerDoors?: number;
  cornerHeight?: number;
  cornerDepth?: number;

  // Stack split
  stackSplitEnabled?: boolean;

  // View/mode toggles occasionally mirrored on ui
  sketchMode?: boolean;
  globalClickMode?: boolean;

  // Render tab / room design
  lightingControl?: boolean;
  lastSelectedFloorStyleIdByType?: UnknownRecord;
  lastSelectedFloorStyleId?: string | number | null;
  lastSelectedWallColor?: string;
  lastLightPreset?: string;
  lightAmb?: number | string;
  lightDir?: number | string;
  lightX?: number | string;
  lightY?: number | string;
  lightZ?: number | string;

  // PDF editor (order pdf in-place editor)
  orderPdfEditorOpen?: boolean;
  orderPdfEditorZoom?: number;
  orderPdfEditorDraft?: unknown;
}
