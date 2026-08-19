export interface RoomBackWallConfigLike {
  enabled: boolean;
  widthCm: number;
  heightCm: number;
  wardrobeOffsetLeftCm: number;
}

export interface RoomSideWallConfigLike {
  enabled: boolean;
  depthCm: number;
  heightCm: number;
}

export interface RoomColumnConfigLike {
  enabled: boolean;
  offsetLeftCm: number;
  widthCm: number;
  depthCm: number;
  heightCm: number;
  bottomOffsetCm: number;
}

export type RoomWallId = 'back' | 'left' | 'right';
export type RoomOpeningKind = 'window' | 'door';

export interface RoomWallOpeningLike {
  id: string;
  kind: RoomOpeningKind;
  wall: RoomWallId;
  widthCm: number;
  heightCm: number;
  offsetAlongCm: number;
  bottomOffsetCm: number;
}

export interface RoomArchitectureConfigLike {
  backWall: RoomBackWallConfigLike;
  leftWall: RoomSideWallConfigLike;
  rightWall: RoomSideWallConfigLike;
  column: RoomColumnConfigLike;
  openings: RoomWallOpeningLike[];
  wallColor: string;
  surfacesHidden: boolean;
}

export type RoomArchitecturePatch = Omit<
  Partial<RoomArchitectureConfigLike>,
  'backWall' | 'leftWall' | 'rightWall' | 'column' | 'openings'
> & {
  backWall?: Partial<RoomArchitectureConfigLike['backWall']>;
  leftWall?: Partial<RoomArchitectureConfigLike['leftWall']>;
  rightWall?: Partial<RoomArchitectureConfigLike['rightWall']>;
  column?: Partial<RoomArchitectureConfigLike['column']>;
  openings?: RoomWallOpeningLike[];
};

export interface AxisAlignedBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export type RoomColumnLinerFace = 'left' | 'right' | 'top' | 'bottom' | 'front';

export interface RoomColumnLinerPanel {
  face: RoomColumnLinerFace;
  box: AxisAlignedBox;
}

export interface RoomColumnAdjustmentGeometry {
  wardrobeBox: AxisAlignedBox;
  obstacle: AxisAlignedBox;
  intrusion: AxisAlignedBox;
  cutObstacle: AxisAlignedBox;
  cutIntrusion: AxisAlignedBox;
  linerPanels: readonly RoomColumnLinerPanel[];
}

export interface RoomArchitectureWallGeometry extends AxisAlignedBox {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
}

export interface RoomWallSurfaceGeometry {
  wall: RoomWallId;
  box: RoomArchitectureWallGeometry;
  usableLength: number;
  height: number;
  axis: 'x' | 'z';
  startCoord: number;
  interiorFaceCoord: number;
  inwardNormalX: -1 | 0 | 1;
  inwardNormalZ: -1 | 0 | 1;
}

export interface ResolvedRoomOpeningGeometry {
  opening: RoomWallOpeningLike;
  surface: RoomWallSurfaceGeometry;
  cut: AxisAlignedBox;
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  bottom: number;
  offsetAlong: number;
  clearancesCm: {
    start: number;
    end: number;
    top: number;
    bottom: number;
  };
}

export interface RoomArchitectureGeometry {
  config: RoomArchitectureConfigLike;
  wardrobeWidthM: number;
  wardrobeHeightM: number;
  wardrobeDepthM: number;
  wall: RoomArchitectureWallGeometry;
  leftWall: RoomArchitectureWallGeometry | null;
  rightWall: RoomArchitectureWallGeometry | null;
  column:
    | (AxisAlignedBox & {
        centerX: number;
        centerY: number;
        centerZ: number;
        width: number;
        height: number;
        depth: number;
      })
    | null;
}

export interface RoomArchitecturePlanInput {
  config: RoomArchitectureConfigLike;
  wardrobeWidthM: number;
  wardrobeHeightM: number;
  wardrobeDepthM: number;
}

export interface RoomArchitecturePlan extends RoomArchitectureGeometry {
  wardrobeBox: AxisAlignedBox;
  wallSurfaces: Readonly<Record<RoomWallId, RoomWallSurfaceGeometry | null>>;
  resolvedOpenings: readonly ResolvedRoomOpeningGeometry[];
  columnAdjustment: RoomColumnAdjustmentGeometry | null;
  activeCutObstacle: AxisAlignedBox | null;
}

export interface RoomColumnAdjustedHorizontalSpan {
  minX: number;
  maxX: number;
  centerX: number;
  length: number;
}
