import type { RoomDesignServiceLike } from '../../../../../types';

export type RenderTabFloorType = 'parquet' | 'tiles' | 'none';

export type FloorStyle = {
  id: string;
  name?: string;
  color?: string;
  color1?: string;
  color2?: string;
};

export type WallColor = {
  id: string;
  val: string;
  name?: string;
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
  __wp_room_resolveStyle?: (type: RenderTabFloorType, lastId: string | null) => unknown;
};

export type RoomDesignData = {
  floorStyles: Record<RenderTabFloorType, FloorStyle[]>;
  wallColors: WallColor[];
  defaultWall: string;
  hasRoomDesign: boolean;
};

export const RENDER_TAB_FLOOR_TYPES: RenderTabFloorType[] = ['parquet', 'tiles', 'none'];
