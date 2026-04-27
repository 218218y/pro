import type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimMatch,
  DoorTrimRect,
  DoorTrimSpan,
  ResolvedDoorTrimPlacement,
} from './door_trim_shared.js';

export type {
  DoorTrimAxis,
  DoorTrimColor,
  DoorTrimMatch,
  DoorTrimRect,
  DoorTrimSpan,
  ResolvedDoorTrimPlacement,
};

export type DoorTrimCenterFromLocalArgs = {
  rect: DoorTrimRect;
  localX: number;
  localY: number;
  axis?: DoorTrimAxis;
};

export type DoorTrimSnappedCenterFromLocalArgs = DoorTrimCenterFromLocalArgs & {
  thresholdNorm?: number;
};

export type DoorTrimPlacementArgs = {
  rect: DoorTrimRect;
  entry?: unknown;
  axis?: unknown;
  color?: unknown;
  span?: unknown;
  sizeCm?: unknown;
  crossSizeCm?: unknown;
  centerNorm?: unknown;
  centerXNorm?: unknown;
  centerYNorm?: unknown;
};

export type DoorTrimMirrorPlacementArgs = DoorTrimPlacementArgs & {
  mirrorLayouts?: unknown;
  mirrorSnapZoneM?: number;
  mirrorEdgeGapM?: number;
};

export type DoorTrimFindMatchArgs = {
  rect: DoorTrimRect;
  trims: unknown;
  axis: unknown;
  localX: number;
  localY: number;
  toleranceM?: number | null;
};
