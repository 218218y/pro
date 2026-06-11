import type { RenderTabFloorType } from './render_tab_shared_contracts.js';
import type { RenderTabLightingModel } from './use_render_tab_lighting.js';
import type { RenderTabNotesModel } from './use_render_tab_notes.js';
import type { RenderTabRoomDesignModel } from './use_render_tab_room_design.js';
import type {
  RenderTabCfgState,
  RenderTabRuntimeState,
  RenderTabUiState,
} from './render_tab_view_state_runtime.js';

export type RenderTabDisplaySectionModel = {
  showDimensions: boolean;
  showContents: boolean;
  showHanger: boolean;
  sketchMode: boolean;
  globalClickUi: boolean;
  onToggleShowDimensions: (checked: boolean) => void;
  onToggleShowContents: (checked: boolean) => void;
  onToggleShowHanger: (checked: boolean) => void;
  onToggleSketchMode: (checked: boolean) => void;
  onToggleGlobalClick: (checked: boolean) => void;
};

export type RenderTabLightingSectionModel = RenderTabLightingModel & {
  lightingControl: boolean;
  lastLightPreset: string;
  lightAmb: number;
  lightDir: number;
  lightX: number;
  lightY: number;
  lightZ: number;
};

export type RenderTabRoomSectionModel = RenderTabRoomDesignModel & {
  floorType: RenderTabFloorType;
  floorStyleId: string | null;
  wallColor: string;
};

export type RenderTabControllerModel = {
  notesSection: RenderTabNotesModel;
  displaySection: RenderTabDisplaySectionModel;
  roomSection: RenderTabRoomSectionModel;
  lightingSection: RenderTabLightingSectionModel;
};

export type RenderTabControllerState = RenderTabCfgState & RenderTabUiState & RenderTabRuntimeState;
