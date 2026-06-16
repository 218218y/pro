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

export type FloorStyleEntry = {
  id: string;
  name: string;
  color?: string;
  color1?: string;
  color2?: string;
  lines?: string;
  size?: number;
};

export const ROOM_GROUP_OBJECT_NAME = 'wpRoomGroup';
export type RoomUiLike = AnyObj & {
  // UI widget persists these fields.
  currentFloorType?: FloorType;
  lastSelectedFloorStyleIdByType?: Partial<Record<FloorType, string | null>>;
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
    { id: 'oak_light', color1: '#dfd0bc', color2: '#cdbda7', name: 'אלון בהיר' },
    { id: 'oak_honey', color1: '#d4a373', color2: '#cd9763', name: 'אלון דבש' },
    { id: 'walnut', color1: '#8d6e63', color2: '#795548', name: 'אגוז כהה' },
    { id: 'grey_wood', color1: '#cfd8dc', color2: '#b0bec5', name: 'עץ אפור' },
    { id: 'mahogany', color1: '#5d4037', color2: '#4e342e', name: 'מהגוני אדמדם' },
  ],
  tiles: [
    {
      id: 'oak_light',
      color: '#dfd0bc',
      color1: '#dfd0bc',
      color2: '#cdbda7',
      lines: '#b9a993',
      size: 4,
      name: 'אריח אלון בהיר',
    },
    {
      id: 'oak_honey',
      color: '#d4a373',
      color1: '#d4a373',
      color2: '#cd9763',
      lines: '#a8754a',
      size: 4,
      name: 'אריח אלון דבש',
    },
    {
      id: 'walnut',
      color: '#8d6e63',
      color1: '#8d6e63',
      color2: '#795548',
      lines: '#5d4037',
      size: 4,
      name: 'אריח אגוז כהה',
    },
    {
      id: 'grey_wood',
      color: '#cfd8dc',
      color1: '#cfd8dc',
      color2: '#b0bec5',
      lines: '#90a4ae',
      size: 4,
      name: 'אריח אפור מעודן',
    },
    {
      id: 'mahogany',
      color: '#5d4037',
      color1: '#5d4037',
      color2: '#4e342e',
      lines: '#3e2723',
      size: 4,
      name: 'אריח מהגוני אדמדם',
    },
  ],
  none: [
    { id: 'solid_white', color: '#ffffff', name: 'לבן נקי' },
    { id: 'solid_grey', color: '#c3ccd1', name: 'אפור בטון' },
    { id: 'oak_light', color: '#dfd0bc', name: 'אלון' },
    { id: 'terrazzo', color: '#b2ebf2', name: 'טרצו בהיר' },
    { id: 'solid_black', color: '#424242', name: 'שחור' },
  ],
};

// Wall palette is referenced by the room widget (UI).
export type WallColorEntry = { id: string; val: string; name: string };
export const WALL_COLORS: readonly WallColorEntry[] = [
  { id: 'white', val: '#ffffff', name: 'לבן קלאסי' },
  { id: 'cream', val: '#d8c7aa', name: 'חול חמים' },
  { id: 'grey', val: '#c3ccd1', name: 'אפור בטון' },
  { id: 'blue', val: '#e3f2fd', name: 'תכלת עדין' },
  { id: 'dark', val: '#37474f', name: 'אפור גרפיט' },
];

// Default wall color should match the UI preset "אפור גרפיט".
export const DEFAULT_WALL_COLOR = '#37474f';
