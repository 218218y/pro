export interface RoomBackWallConfigLike {
  enabled: boolean;
  widthCm: number;
  heightCm: number;
  wardrobeOffsetLeftCm: number;
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
  column: RoomColumnConfigLike;
  surfacesHidden: boolean;
}

export type RoomArchitecturePatch = Omit<Partial<RoomArchitectureConfigLike>, 'backWall' | 'column'> & {
  backWall?: Partial<RoomArchitectureConfigLike['backWall']>;
  column?: Partial<RoomArchitectureConfigLike['column']>;
};
