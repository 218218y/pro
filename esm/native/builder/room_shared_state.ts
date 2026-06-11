import type { AppContainer } from '../../../types/index.js';

import { getRoomGroup } from '../runtime/render_access.js';
import { readRootState } from '../runtime/root_state_access.js';
import { readRuntimeStateFromApp } from '../runtime/runtime_selectors.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { metaUiOnly } from '../runtime/meta_profiles_access.js';
import { runPlatformRenderFollowThrough } from '../runtime/platform_access.js';

import {
  DEFAULT_WALL_COLOR,
  FLOOR_STYLES,
  type AnyObj,
  type FloorStyleEntry,
  type FloorType,
  type MaterialLike,
  type ObjectByNameLike,
  type RoomDesignRuntimeFlags,
  type RoomNodeLike,
  type RoomSceneNodes,
  type RoomTextureParams,
  type RoomUiLike,
  type RoomUiSelectionState,
} from './room_shared_types.js';
import { __ensureApp, _asObject, _readBoolish, _normalizeFloorType } from './room_shared_utils.js';

export function __getRoomGroupNode(A: AppContainer): ObjectByNameLike | null {
  return _asObject<ObjectByNameLike>(getRoomGroup(A));
}

export function __getNamedNode(
  group: ObjectByNameLike | null | undefined,
  name: string
): RoomNodeLike | null {
  if (!group || typeof group.getObjectByName !== 'function') return null;
  return _asObject<RoomNodeLike>(group.getObjectByName(name));
}

export function __getPrimaryMaterial(node: RoomNodeLike | null | undefined): MaterialLike | null {
  if (!node) return null;
  const material = node.material;
  if (Array.isArray(material)) return _asObject<MaterialLike>(material[0]);
  return _asObject<MaterialLike>(material);
}

export function __forEachMaterial(
  node: RoomNodeLike | null | undefined,
  apply: (material: MaterialLike) => void
): void {
  if (!node) return;
  const material = node.material;
  if (Array.isArray(material)) {
    material.forEach(entry => {
      const mat = _asObject<MaterialLike>(entry);
      if (mat) apply(mat);
    });
    return;
  }
  const mat = _asObject<MaterialLike>(material);
  if (mat) apply(mat);
}

export function __readUi(A: AppContainer): RoomUiLike {
  const st = readRootState(A);
  return _asObject<RoomUiLike>(st?.ui) || {};
}

export function __readRuntime(A: AppContainer): AnyObj {
  return _asObject(readRuntimeStateFromApp(A)) || {};
}

export function __readRoomDesignRuntimeFlags(A: AppContainer): RoomDesignRuntimeFlags {
  const runtime = __readRuntime(A);
  return {
    isActive: _readBoolish(runtime.roomDesignActive),
    isSketch: _readBoolish(runtime.sketchMode),
  };
}

export function __readRoomSceneNodes(A: AppContainer): RoomSceneNodes {
  const roomGroup = __getRoomGroupNode(A);
  const floor = __getNamedNode(roomGroup, 'smartFloor');
  return {
    roomGroup,
    walls: __getNamedNode(roomGroup, 'roomWalls'),
    floor,
    floorMaterial: __getPrimaryMaterial(floor),
  };
}

export function __metaUiOnly(App: AppContainer, source: string) {
  return metaUiOnly(App, { source }, source);
}

export function __readRoomFloorStyleId(ui: RoomUiLike | null | undefined, type: FloorType): string | null {
  const map = ui && typeof ui === 'object' ? ui.lastSelectedFloorStyleIdByType : null;
  const byType = map && typeof map === 'object' ? map[type] : null;
  if (typeof byType === 'string' && byType) return byType;
  return ui && typeof ui.lastSelectedFloorStyleId === 'string' && ui.lastSelectedFloorStyleId
    ? ui.lastSelectedFloorStyleId
    : null;
}

export function __readRoomWallColor(
  ui: RoomUiLike | null | undefined,
  fallback: string | null = DEFAULT_WALL_COLOR
): string | null {
  return ui && typeof ui.lastSelectedWallColor === 'string' && ui.lastSelectedWallColor
    ? ui.lastSelectedWallColor
    : fallback;
}

export function __readRoomUiSelectionState(
  ui: RoomUiLike | null | undefined,
  defaults?: Partial<Pick<RoomUiSelectionState, 'floorType' | 'wallColor'>>
): RoomUiSelectionState {
  const floorType = _normalizeFloorType(ui?.currentFloorType ?? defaults?.floorType);
  return {
    floorType,
    floorStyleId: __readRoomFloorStyleId(ui, floorType),
    wallColor: __readRoomWallColor(ui, defaults?.wallColor ?? DEFAULT_WALL_COLOR),
  };
}

export function __buildRoomLastStyleUiPatch(type: FloorType, styleId: string | null): RoomUiLike {
  const nextStyleId = styleId || null;
  return {
    lastSelectedFloorStyleId: nextStyleId,
    lastSelectedFloorStyleIdByType: { [type]: nextStyleId },
  };
}

export function __wp_triggerRender(updateShadows: boolean | undefined, passedApp: unknown) {
  const A = __ensureApp(passedApp);
  runPlatformRenderFollowThrough(A, { updateShadows });
}

export function __wp_room_getFloorType(passedApp: unknown): FloorType {
  const A = __ensureApp(passedApp);
  return __readRoomUiSelectionState(__readUi(A)).floorType;
}

export function __wp_room_getLastStyleId(type: FloorType, passedApp: unknown): string | null {
  const A = __ensureApp(passedApp);
  return __readRoomFloorStyleId(__readUi(A), type);
}

export function __wp_room_setLastStyleId(type: FloorType, styleId: string | null, passedApp: unknown) {
  const A = __ensureApp(passedApp);
  patchUiSoft(A, __buildRoomLastStyleUiPatch(type, styleId), __metaUiOnly(A, 'room:setLastStyleId'));
}

export function __wp_room_resolveStyle(type: FloorType, styleId?: string | null): FloorStyleEntry | null {
  const t: FloorType = type || 'parquet';
  const styles = FLOOR_STYLES[t];
  if (!Array.isArray(styles) || !styles.length) return null;
  if (styleId) {
    for (let i = 0; i < styles.length; i++) {
      if (styles[i] && styles[i].id === styleId) return styles[i];
    }
  }
  return styles[0] || null;
}

export function __buildRoomFloorSignature(
  type: FloorType,
  styleData: RoomTextureParams | null | undefined
): string {
  const style = _asObject<RoomTextureParams>(styleData) || {};
  const id = typeof style.id === 'string' && style.id ? style.id : '';
  const color = typeof style.color === 'string' ? style.color : '';
  const color1 = typeof style.color1 === 'string' ? style.color1 : '';
  const color2 = typeof style.color2 === 'string' ? style.color2 : '';
  const lines = typeof style.lines === 'string' ? style.lines : '';
  const size = typeof style.size === 'number' && Number.isFinite(style.size) ? String(style.size) : '';
  return [type, id, color, color1, color2, lines, size].join('|');
}
