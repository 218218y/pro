import type {
  ActionMetaLike,
  RoomDesignServiceLike,
  RoomDesignUpdateOptionsLike,
  RoomTextureParamsLike,
} from '../../../types/index.js';

export type AnyObj = Record<string, unknown>;

// Minimal transform shapes we rely on for a THREE.Mesh instance.
// We keep these small on purpose to avoid importing heavy THREE types.
export type RotationLike = { x: number; y?: number; z?: number };
export type PositionLike = {
  x?: number;
  y: number;
  z?: number;
  set?: (x: number, y: number, z: number) => void;
};
export type MeshLike = AnyObj & {
  rotation: RotationLike;
  position: PositionLike;
  receiveShadow?: boolean;
  name?: string;
  visible?: boolean;
};
export type MeshLikeWithSet = AnyObj & {
  position: { set: (x: number, y: number, z: number) => void };
  name?: string;
};
export type ObjectByNameLike = AnyObj & {
  getObjectByName?: (name: string) => unknown;
  add?: (...children: unknown[]) => unknown;
  name?: string;
};
export type ColorSetterLike = {
  set?: (value: string) => void;
  setHex?: (value: number) => void;
};
export type MaterialLike = AnyObj & {
  color?: ColorSetterLike;
  map?: unknown;
  needsUpdate?: boolean;
};
export type RoomNodeLike = ObjectByNameLike & {
  material?: MaterialLike | MaterialLike[];
  visible?: boolean;
  parent?: ObjectByNameLike | null;
};
export type RoomTextureParams = RoomTextureParamsLike;
export type RoomUpdateOpts = RoomDesignUpdateOptionsLike;
export type RoomDesignServiceState = RoomDesignServiceLike &
  AnyObj & {
    DEFAULT_WALL_COLOR?: string;
    __esm_v1?: boolean;
  };
export type TextureLike = {
  wrapS?: unknown;
  wrapT?: unknown;
  repeat?: { set(x: number, y: number): void };
  colorSpace?: unknown;
  dispose?: () => void;
};
export type RoomCanvasLike = {
  width: number;
  height: number;
  getContext(type: '2d'): CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;
};

export type FloorType = 'parquet' | 'tiles' | 'none';

export type FloorStyleEntry =
  | { id: string; color1: string; color2: string; name: string }
  | { id: string; color: string; lines: string; size: number; name: string }
  | { id: string; color: string; name: string };

export const ROOM_GROUP_OBJECT_NAME = 'wpRoomGroup';
export type RoomUiLike = AnyObj & {
  // UI widget persists these fields.
  currentFloorType?: FloorType;
  lastSelectedFloorStyleIdByType?: Partial<Record<FloorType, string | null>>;
  lastSelectedFloorStyleId?: string | null;
  lastSelectedWallColor?: string | null;

  // Compatibility field still read by room selection callers.
  sketchMode?: boolean;
};

export type RoomUiSelectionState = {
  floorType: FloorType;
  floorStyleId: string | null;
  wallColor: string | null;
};

export type RoomDesignRuntimeFlags = {
  isActive: boolean;
  isSketch: boolean;
};

export type RoomAppliedState = {
  floorSignature: string | null;
  wallColor: string | null;
};

export type RoomSceneNodes = {
  roomGroup: ObjectByNameLike | null;
  walls: RoomNodeLike | null;
  floor: RoomNodeLike | null;
  floorMaterial: MaterialLike | null;
};

export const ROOM_UPDATE_WALL_META: ActionMetaLike = { source: 'room:updateWall' };
export const ROOM_RESET_DEFAULT_META: ActionMetaLike = { source: 'room:resetDefault' };

// Floor styles are referenced by the room widget (UI) and by room design helpers.
export const FLOOR_STYLES: Record<FloorType, readonly FloorStyleEntry[]> = {
  parquet: [
    { id: 'oak_light', color1: '#eaddcf', color2: '#d4c5b0', name: 'אלון בהיר' },
    { id: 'oak_honey', color1: '#d4a373', color2: '#cd9763', name: 'אלון דבש' },
    { id: 'walnut', color1: '#8d6e63', color2: '#795548', name: 'אגוז כהה' },
    { id: 'grey_wood', color1: '#cfd8dc', color2: '#b0bec5', name: 'עץ אפור' },
    { id: 'mahogany', color1: '#5d4037', color2: '#4e342e', name: 'מהגוני אדמדם' },
  ],
  tiles: [
    { id: 'marble_white', color: '#f5f5f5', lines: '#e0e0e0', size: 4, name: 'שיש לבן' },
    { id: 'beige', color: '#efebe9', lines: '#d7ccc8', size: 4, name: "אבן בז'" },
    { id: 'concrete', color: '#bdbdbd', lines: '#9e9e9e', size: 2, name: 'בטון' },
    { id: 'dark_slate', color: '#546e7a', lines: '#455a64', size: 4, name: 'צפחה כהה' },
    { id: 'terrazzo', color: '#e0f7fa', lines: '#b2ebf2', size: 3, name: 'טרצו בהיר' },
  ],
  none: [
    { id: 'solid_white', color: '#ffffff', name: 'לבן נקי' },
    { id: 'solid_grey', color: '#e0e0e0', name: 'אפור בהיר' },
    { id: 'oak_light', color: '#eaddcf', name: 'אלון' },
    { id: 'terrazzo', color: '#b2ebf2', name: 'טרצו בהיר' },
    { id: 'solid_black', color: '#424242', name: 'שחור' },
  ],
};

// Wall palette is referenced by the room widget (UI).
export type WallColorEntry = { id: string; val: string; name: string };
export const WALL_COLORS: readonly WallColorEntry[] = [
  { id: 'white', val: '#ffffff', name: 'לבן קלאסי' },
  { id: 'cream', val: '#fdfbf7', name: 'שמנת רכה' },
  { id: 'grey', val: '#eceff1', name: 'אפור בהיר' },
  { id: 'blue', val: '#e3f2fd', name: 'תכלת עדין' },
  { id: 'dark', val: '#37474f', name: 'אפור גרפיט' },
];

// Default wall color should match the UI preset "אפור גרפיט".
export const DEFAULT_WALL_COLOR = '#37474f';
