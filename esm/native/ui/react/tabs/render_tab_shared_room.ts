import type { AppContainer } from '../../../../../types';

import { getRoomDesignServiceMaybe } from '../../../services/api.js';

import { DEFAULT_WALL_COLOR, RENDER_TAB_FLOOR_TYPES } from './render_tab_shared_contracts.js';
import { FALLBACK_FLOOR_STYLES, FALLBACK_WALL_COLORS } from './render_tab_shared_room_fallbacks.js';
import type {
  FloorStyle,
  RenderTabFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
  WallColor,
} from './render_tab_shared_contracts.js';
import {
  asRecord,
  getString,
  isRecord,
  normalizeFloorStyle,
  normalizeWallColor,
} from './render_tab_shared_normalize.js';

export { FALLBACK_WALL_COLORS, FALLBACK_FLOOR_STYLES } from './render_tab_shared_room_fallbacks.js';

function isRoomDesignRuntimeLike(value: unknown): value is RoomDesignRuntimeLike {
  return isRecord(value);
}

function isFloorStyle(value: FloorStyle | null): value is FloorStyle {
  return value !== null;
}

function isWallColor(value: WallColor | null): value is WallColor {
  return value !== null;
}

export function getRoomDesignRuntime(app: AppContainer): RoomDesignRuntimeLike | null {
  const runtime = getRoomDesignServiceMaybe(app);
  return isRoomDesignRuntimeLike(runtime) ? runtime : null;
}

function cloneFloorStylesList(list: FloorStyle[]): FloorStyle[] {
  return list.map(style => ({ ...style }));
}

function cloneWallColorsList(list: WallColor[]): WallColor[] {
  return list.map(color => ({ ...color }));
}

function buildFallbackFloorStyles(): Record<RenderTabFloorType, FloorStyle[]> {
  return {
    parquet: cloneFloorStylesList(FALLBACK_FLOOR_STYLES.parquet),
    tiles: cloneFloorStylesList(FALLBACK_FLOOR_STYLES.tiles),
    none: cloneFloorStylesList(FALLBACK_FLOOR_STYLES.none),
  };
}

function buildFallbackWallColors(): WallColor[] {
  return cloneWallColorsList(FALLBACK_WALL_COLORS);
}

export function getRoomDesignData(runtime: RoomDesignRuntimeLike | null): RoomDesignData {
  try {
    const floorStylesOut: Record<RenderTabFloorType, FloorStyle[]> = buildFallbackFloorStyles();
    const wallColorsOut: WallColor[] = buildFallbackWallColors();
    const hasRoomDesign = !!runtime;

    const fsRec = asRecord(runtime ? runtime.FLOOR_STYLES : null);
    if (fsRec) {
      RENDER_TAB_FLOOR_TYPES.forEach(type => {
        const raw = fsRec[type];
        const parsed = Array.isArray(raw) ? raw.map(normalizeFloorStyle).filter(isFloorStyle) : [];
        if (parsed.length) floorStylesOut[type] = parsed;
      });
    }

    const wallRaw = runtime ? runtime.WALL_COLORS : null;
    if (Array.isArray(wallRaw)) {
      const parsed = wallRaw.map(normalizeWallColor).filter(isWallColor);
      if (parsed.length) {
        wallColorsOut.splice(0, wallColorsOut.length, ...parsed);
      }
    }

    return {
      floorStyles: floorStylesOut,
      wallColors: wallColorsOut,
      defaultWall: getString(runtime ? runtime.DEFAULT_WALL_COLOR : null) || DEFAULT_WALL_COLOR,
      hasRoomDesign,
    };
  } catch {
    return {
      floorStyles: FALLBACK_FLOOR_STYLES,
      wallColors: FALLBACK_WALL_COLORS,
      defaultWall: DEFAULT_WALL_COLOR,
      hasRoomDesign: false,
    };
  }
}
