import type { RoomDesignServiceLike } from '../../../../../types';

export type SettingsVisualFloorType = 'parquet' | 'tiles' | 'none';

export type FloorStyle = {
  id: string;
  name?: string | undefined;
  color?: string | undefined;
  color1?: string | undefined;
  color2?: string | undefined;
  lines?: string | undefined;
  size?: number | undefined;
};

export type WallColor = {
  id: string;
  val: string;
  name?: string | undefined;
};

export const DEFAULT_WALL_COLOR = '#37474f';
export const WALL_COLOR_EVENING = '#37474f';

export type LightPresetValue = { amb: number; dir: number; x: number; y: number; z: number };
export type LightPresetName = 'default' | 'natural' | 'evening' | 'front';
export type LightingScalarKey = 'lightAmb' | 'lightDir' | 'lightX' | 'lightY' | 'lightZ';
export type UiPatch = Record<string, unknown>;

export type UiNotesControlsLike = {
  enterScreenDrawMode?: () => void;
  exitScreenDrawMode?: () => void;
};

export type RoomDesignRuntimeLike = RoomDesignServiceLike & {
  __wp_room_resolveStyle?: (type: SettingsVisualFloorType, lastId: string | null) => unknown;
};

export type RoomDesignData = {
  floorStyles: Record<SettingsVisualFloorType, FloorStyle[]>;
  wallColors: WallColor[];
  defaultWall: string;
  hasRoomDesign: boolean;
};

export const SETTINGS_VISUAL_FLOOR_TYPES: SettingsVisualFloorType[] = ['parquet', 'tiles', 'none'];
