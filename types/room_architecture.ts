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

export interface RoomArchitectureConfigLike {
  backWall: RoomBackWallConfigLike;
  leftWall: RoomSideWallConfigLike;
  rightWall: RoomSideWallConfigLike;
  column: RoomColumnConfigLike;
  wallColor: string;
  surfacesHidden: boolean;
}

export type RoomArchitecturePatch = Omit<
  Partial<RoomArchitectureConfigLike>,
  'backWall' | 'leftWall' | 'rightWall' | 'column'
> & {
  backWall?: Partial<RoomArchitectureConfigLike['backWall']>;
  leftWall?: Partial<RoomArchitectureConfigLike['leftWall']>;
  rightWall?: Partial<RoomArchitectureConfigLike['rightWall']>;
  column?: Partial<RoomArchitectureConfigLike['column']>;
};
