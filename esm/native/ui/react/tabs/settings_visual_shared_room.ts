import type { AppContainer } from '../../../../../types';

import { getRoomDesignServiceMaybe } from '../../../services/api.js';

import { DEFAULT_WALL_COLOR, SETTINGS_VISUAL_FLOOR_TYPES } from './settings_visual_shared_contracts.js';
import { DEFAULT_FLOOR_STYLES, DEFAULT_WALL_COLORS } from './settings_visual_shared_room_defaults.js';
import type {
  FloorStyle,
  SettingsVisualFloorType,
  RoomDesignData,
  RoomDesignRuntimeLike,
  WallColor,
} from './settings_visual_shared_contracts.js';
import {
  asRecord,
  getString,
  isRecord,
  normalizeFloorStyle,
  normalizeWallColor,
} from './settings_visual_shared_normalize.js';

export { DEFAULT_WALL_COLORS, DEFAULT_FLOOR_STYLES } from './settings_visual_shared_room_defaults.js';

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

function buildDefaultFloorStyles(): Record<SettingsVisualFloorType, FloorStyle[]> {
  return {
    parquet: cloneFloorStylesList(DEFAULT_FLOOR_STYLES.parquet),
    tiles: cloneFloorStylesList(DEFAULT_FLOOR_STYLES.tiles),
    none: cloneFloorStylesList(DEFAULT_FLOOR_STYLES.none),
  };
}

function buildDefaultWallColors(): WallColor[] {
  return cloneWallColorsList(DEFAULT_WALL_COLORS);
}

export function getRoomDesignData(runtime: RoomDesignRuntimeLike | null): RoomDesignData {
  try {
    const floorStylesOut: Record<SettingsVisualFloorType, FloorStyle[]> = buildDefaultFloorStyles();
    const wallColorsOut: WallColor[] = buildDefaultWallColors();
    const hasRoomDesign = !!runtime;

    const fsRec = asRecord(runtime ? runtime.FLOOR_STYLES : null);
    if (fsRec) {
      SETTINGS_VISUAL_FLOOR_TYPES.forEach(type => {
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
      floorStyles: DEFAULT_FLOOR_STYLES,
      wallColors: DEFAULT_WALL_COLORS,
      defaultWall: DEFAULT_WALL_COLOR,
      hasRoomDesign: false,
    };
  }
}
