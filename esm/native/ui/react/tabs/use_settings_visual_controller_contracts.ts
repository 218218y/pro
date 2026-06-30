import type { SettingsVisualFloorType } from './settings_visual_shared_contracts.js';
import type { SettingsVisualLightingModel } from './use_settings_visual_lighting.js';
import type { SettingsVisualRoomDesignModel } from './use_settings_visual_room_design.js';
import type {
  SettingsVisualCfgState,
  SettingsVisualRuntimeState,
  SettingsVisualUiState,
} from './settings_visual_view_state_runtime.js';

export type SettingsVisualDisplaySectionModel = {
  showDimensions: boolean;
  mirrorReflectorEnabled: boolean;
  showContents: boolean;
  showHanger: boolean;
  globalClickUi: boolean;
  darkMode: boolean;
  onToggleShowDimensions: (checked: boolean) => void;
  onToggleMirrorReflector: (checked: boolean) => void;
  onToggleShowHanger: (checked: boolean) => void;
  onToggleGlobalClick: (checked: boolean) => void;
  onToggleDarkMode: (checked: boolean) => void;
};

export type SettingsVisualLightingSectionModel = SettingsVisualLightingModel & {
  lightingControl: boolean;
  lastLightPreset: string;
  lightAmb: number;
  lightDir: number;
  lightX: number;
  lightY: number;
  lightZ: number;
};

export type SettingsVisualRoomSectionModel = SettingsVisualRoomDesignModel & {
  floorType: SettingsVisualFloorType;
  floorStyleId: string | null;
  wallColor: string;
};

export type SettingsVisualControllerModel = {
  displaySection: SettingsVisualDisplaySectionModel;
  roomSection: SettingsVisualRoomSectionModel;
  lightingSection: SettingsVisualLightingSectionModel;
};

export type SettingsVisualControllerState = SettingsVisualCfgState &
  SettingsVisualUiState &
  SettingsVisualRuntimeState;
