import type { AppContainer, BuildContextLike, ThreeLike } from '../../../types/index.js';

export type PostBuildDimensionsArgs = {
  ctx: BuildContextLike;
  App: AppContainer;
  THREE: ThreeLike;
  cfg: unknown;
  H: number | null | undefined;
  D: number | null | undefined;
  totalW: number | null | undefined;
  hasCornice: boolean;
  isCornerMode: boolean;
  addDimensionLine: unknown;
  noMainWardrobe: boolean;
  stackSplitActive: boolean;
  splitBottomHeightCm: number;
  splitBottomDepthCm: number;
  stackKey: 'top' | 'bottom' | null;
};

export type PostBuildDimensionMetrics = {
  dimH: number;
  dimD: number;
  moduleWidthsCm: number[] | null;
  moduleHeightsCm: number[] | null;
  moduleDepthsCm: number[] | null;
  moduleHeightsAllManual: boolean;
  moduleDepthsAllManual: boolean;
};

export type CornerDimensionsState = {
  cornerSide: 'left' | 'right';
  cornerWallLenM: number;
  cornerOffsetXM: number;
  cornerOffsetZM: number;
  cornerConnectorEnabled: boolean;
  cornerDoorCount: number;
  cornerWingLenM: number;
  cornerWingHeightM: number;
  cornerWingDepthM: number;
};
