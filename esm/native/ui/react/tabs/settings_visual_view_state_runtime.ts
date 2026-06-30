import type { UnknownRecord } from '../../../../../types';

import type { SettingsVisualFloorType } from './settings_visual_shared_contracts.js';
import { DEFAULT_WALL_COLOR } from './settings_visual_shared_contracts.js';
import { LIGHT_PRESETS } from './settings_visual_shared_lighting.js';
import { asFiniteNumber, asRecord, getFloorTypeFromUi } from './settings_visual_shared_normalize.js';

export type SettingsVisualCfgState = {
  showDimensions: boolean;
  mirrorReflectorEnabled: boolean;
};

export type SettingsVisualUiState = {
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

export function readSettingsVisualCfgState(cfg: UnknownRecord): SettingsVisualCfgState {
  return {
    showDimensions: !!cfg.showDimensions,
    mirrorReflectorEnabled:
      typeof cfg.MIRROR_REFLECTOR_ENABLED === 'boolean' ? !!cfg.MIRROR_REFLECTOR_ENABLED : true,
  };
}

export function readSettingsVisualFloorStyleId(
  ui: UnknownRecord,
  floorType: SettingsVisualFloorType
): string | null {
  const map = asRecord(ui.lastSelectedFloorStyleIdByType);
  const byType = map ? map[floorType] : undefined;
  return typeof byType === 'string' && byType ? byType : null;
}

export function readSettingsVisualWallColor(ui: UnknownRecord): string {
  return typeof ui.lastSelectedWallColor === 'string' && ui.lastSelectedWallColor
    ? ui.lastSelectedWallColor
    : DEFAULT_WALL_COLOR;
}

export function readSettingsVisualLightingPreset(ui: UnknownRecord): string {
  return typeof ui.lastLightPreset === 'string' && ui.lastLightPreset ? ui.lastLightPreset : 'default';
}

export function readSettingsVisualUiState(ui: UnknownRecord): SettingsVisualUiState {
  const floorType = getFloorTypeFromUi(ui);
  return {
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

export function readSettingsVisualRuntimeState(rt: UnknownRecord): SettingsVisualRuntimeState {
  return {
    globalClickRt: !!rt.globalClickMode,
  };
}
