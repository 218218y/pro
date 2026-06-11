import type { UnknownRecord } from '../../../types';

export type CellDimsPreviewSpecialDims = {
  widthSd: UnknownRecord | null;
  heightDepthSd: UnknownRecord | null;
};

export type CellDimsPreviewTargetBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type CellDimsCurrentHeightInput = {
  currentBottomYm: number;
  currentTopAbsCm: number;
};
