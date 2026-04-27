import type { UnknownRecord } from '../../../../../types';

import { selectSavedNotesCount } from '../selectors/config_selectors.js';
import type { RenderTabFloorType } from './render_tab_shared_contracts.js';
import { DEFAULT_WALL_COLOR } from './render_tab_shared_contracts.js';
import { LIGHT_PRESETS } from './render_tab_shared_lighting.js';
import { asFiniteNumber, asRecord, getFloorTypeFromUi } from './render_tab_shared_normalize.js';

export type RenderTabCfgState = {
  showDimensions: boolean;
  savedNotesCount: number;
};

export type RenderTabUiState = {
  showContents: boolean;
  showHanger: boolean;
  notesEnabled: boolean;
  globalClickUi: boolean;
  floorType: RenderTabFloorType;
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

export type RenderTabRuntimeState = {
  globalClickRt: boolean;
  sketchMode: boolean;
};

export function readRenderTabCfgState(cfg: UnknownRecord): RenderTabCfgState {
  return {
    showDimensions: !!cfg.showDimensions,
    savedNotesCount: selectSavedNotesCount(cfg),
  };
}

export function readRenderTabFloorStyleId(ui: UnknownRecord, floorType: RenderTabFloorType): string | null {
  const map = asRecord(ui.lastSelectedFloorStyleIdByType);
  const byType = map ? map[floorType] : undefined;
  const byTypeId = typeof byType === 'string' && byType ? byType : null;
  const legacyId =
    typeof ui.lastSelectedFloorStyleId === 'string' && ui.lastSelectedFloorStyleId
      ? ui.lastSelectedFloorStyleId
      : null;
  return byTypeId || legacyId;
}

export function readRenderTabWallColor(ui: UnknownRecord): string {
  return typeof ui.lastSelectedWallColor === 'string' && ui.lastSelectedWallColor
    ? ui.lastSelectedWallColor
    : DEFAULT_WALL_COLOR;
}

export function readRenderTabLightingPreset(ui: UnknownRecord): string {
  return typeof ui.lastLightPreset === 'string' && ui.lastLightPreset ? ui.lastLightPreset : 'default';
}

export function readRenderTabUiState(ui: UnknownRecord): RenderTabUiState {
  const floorType = getFloorTypeFromUi(ui);
  return {
    showContents: !!ui.showContents,
    showHanger: !!ui.showHanger,
    notesEnabled: !!ui.notesEnabled,
    globalClickUi: typeof ui.globalClickMode === 'boolean' ? !!ui.globalClickMode : true,
    floorType,
    floorStyleId: readRenderTabFloorStyleId(ui, floorType),
    wallColor: readRenderTabWallColor(ui),
    lightingControl: typeof ui.lightingControl === 'boolean' ? !!ui.lightingControl : false,
    lastLightPreset: readRenderTabLightingPreset(ui),
    lightAmb: asFiniteNumber(ui.lightAmb, LIGHT_PRESETS.default.amb),
    lightDir: asFiniteNumber(ui.lightDir, LIGHT_PRESETS.default.dir),
    lightX: asFiniteNumber(ui.lightX, LIGHT_PRESETS.default.x),
    lightY: asFiniteNumber(ui.lightY, LIGHT_PRESETS.default.y),
    lightZ: asFiniteNumber(ui.lightZ, LIGHT_PRESETS.default.z),
  };
}

export function readRenderTabRuntimeState(rt: UnknownRecord): RenderTabRuntimeState {
  return {
    globalClickRt: !!rt.globalClickMode,
    sketchMode: !!rt.sketchMode,
  };
}
