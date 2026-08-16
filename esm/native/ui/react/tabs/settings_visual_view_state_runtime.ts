import type {
  ConfigStateLike,
  RoomArchitectureConfigLike,
  RuntimeStateLike,
  UiStateLike,
} from '../../../../../types';

import { normalizeRoomArchitecture } from '../../../../shared/room_architecture_shared.js';
import { DEFAULT_WIDTH } from '../../../../shared/dimensions/wardrobe_defaults.js';
import type { SettingsVisualFloorType } from './settings_visual_shared_contracts.js';
import { DEFAULT_WALL_COLOR } from './settings_visual_shared_contracts.js';
import { LIGHT_PRESETS } from './settings_visual_shared_lighting.js';
import { asFiniteNumber, asRecord, getFloorTypeFromUi } from './settings_visual_shared_normalize.js';

export type SettingsVisualCfgState = {
  showDimensions: boolean;
  mirrorReflectorEnabled: boolean;
  roomArchitecture: RoomArchitectureConfigLike;
};

export type SettingsVisualUiState = {
  wardrobeWidthCm: number;
  showContents: boolean;
  showHanger: boolean;
  globalClickUi: boolean;
  darkMode: boolean;
  floorType: SettingsVisualFloorType;
  floorStyleId: string | null;
  wallColor: string;
  lightingControl: boolean;
  lastLightPreset: string;
  lightAmb: number;
  lightDir: number;
  lightX: number;
  lightY: number;
  lightZ: number;
};

export type SettingsVisualRuntimeState = {
  globalClickRt: boolean;
};

export function readSettingsVisualCfgState(cfg: ConfigStateLike): SettingsVisualCfgState {
  return {
    showDimensions: !!cfg.showDimensions,
    mirrorReflectorEnabled:
      typeof cfg.MIRROR_REFLECTOR_ENABLED === 'boolean' ? !!cfg.MIRROR_REFLECTOR_ENABLED : true,
    roomArchitecture: normalizeRoomArchitecture(cfg.roomArchitecture),
  };
}

export function readSettingsVisualFloorStyleId(
  ui: UiStateLike,
  floorType: SettingsVisualFloorType
): string | null {
  const map = asRecord(ui.lastSelectedFloorStyleIdByType);
  const byType = map ? map[floorType] : undefined;
  return typeof byType === 'string' && byType ? byType : null;
}

export function readSettingsVisualWallColor(ui: UiStateLike): string {
  return typeof ui.lastSelectedWallColor === 'string' && ui.lastSelectedWallColor
    ? ui.lastSelectedWallColor
    : DEFAULT_WALL_COLOR;
}

export function readSettingsVisualLightingPreset(ui: UiStateLike): string {
  return typeof ui.lastLightPreset === 'string' && ui.lastLightPreset ? ui.lastLightPreset : 'default';
}

export function readSettingsVisualUiState(ui: UiStateLike): SettingsVisualUiState {
  const floorType = getFloorTypeFromUi(ui);
  const raw = asRecord(ui.raw);
  return {
    wardrobeWidthCm: asFiniteNumber(raw?.width, DEFAULT_WIDTH),
    showContents: !!ui.showContents,
    showHanger: !!ui.showHanger,
    globalClickUi: typeof ui.globalClickMode === 'boolean' ? !!ui.globalClickMode : true,
    darkMode: typeof ui.darkMode === 'boolean' ? !!ui.darkMode : false,
    floorType,
    floorStyleId: readSettingsVisualFloorStyleId(ui, floorType),
    wallColor: readSettingsVisualWallColor(ui),
    lightingControl: typeof ui.lightingControl === 'boolean' ? !!ui.lightingControl : false,
    lastLightPreset: readSettingsVisualLightingPreset(ui),
    lightAmb: asFiniteNumber(ui.lightAmb, LIGHT_PRESETS.default.amb),
    lightDir: asFiniteNumber(ui.lightDir, LIGHT_PRESETS.default.dir),
    lightX: asFiniteNumber(ui.lightX, LIGHT_PRESETS.default.x),
    lightY: asFiniteNumber(ui.lightY, LIGHT_PRESETS.default.y),
    lightZ: asFiniteNumber(ui.lightZ, LIGHT_PRESETS.default.z),
  };
}

export function readSettingsVisualRuntimeState(rt: RuntimeStateLike): SettingsVisualRuntimeState {
  return {
    globalClickRt: !!rt.globalClickMode,
  };
}
