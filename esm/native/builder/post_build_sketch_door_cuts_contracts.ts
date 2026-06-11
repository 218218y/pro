// Post-build sketch external-drawer door cuts contracts (Pure ESM)
//
// Owns the canonical runtime + selection contracts shared by sketch external-drawer door-cut flows.

import type {
  AppContainer,
  BuildContextLike,
  DoorStyleMap,
  Object3DLike,
  ThreeLike,
} from '../../../types/index.js';

import type { BoundUnknownMethod, ValueRecord } from './post_build_extras_shared.js';
import type { ManualHandlePosition } from '../features/manual_handle_position.js';

export type { AppContainer, BuildContextLike, Object3DLike, ThreeLike, ValueRecord };

export type SketchDrawerCutSegment = { yMin: number; yMax: number };

export type SketchDrawerStackBounds = {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
};

export type SketchDoorCutsRuntime = {
  App: AppContainer;
  THREE: ThreeLike;
  bodyMat: unknown;
  globalFrontMat: unknown;
  createDoorVisual: BoundUnknownMethod | null;
  createHandleMesh: BoundUnknownMethod | null;
  getPartMaterial: BoundUnknownMethod | null;
  getMirrorMaterial: (() => unknown) | null;
  resolveHandleType: (partId: string) => string;
  resolveEdgeHandleVariant: (partId: string) => 'short' | 'long';
  resolveHandleColor: (partId: string) => string;
  resolveManualHandlePosition: (partId: string) => ManualHandlePosition | null;
  resolveCurtain: (partId: string) => string | null;
  resolveSpecial: (partId: string, curtain: string | null) => 'mirror' | 'glass' | null;
  doorStyle: string;
  doorStyleMap: DoorStyleMap;
  groovesMap: ValueRecord | null;
  doorTrimMap?: ValueRecord | null;
  resolveMirrorLayout: (partId: string) => unknown;
  isDoorRemoved: (partId: string) => boolean;
};

export type SketchDoorCutSelection = {
  basePartId: string;
  stacks: SketchDrawerStackBounds[];
  splitPosList?: number[];
};

export type SketchDoorCutsRuntimeArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  ctx: BuildContextLike;
  cfg: ValueRecord;
  bodyMat: unknown;
  globalFrontMat: unknown;
  getMirrorMaterial?: (() => unknown) | null;
  stackKey?: 'top' | 'bottom';
};

export type ApplySketchDrawerDoorCutsArgs = {
  App: AppContainer;
  runtime: SketchDoorCutsRuntime;
  selectDoorCuts: (entry: ValueRecord, g: Object3DLike, ud: ValueRecord) => SketchDoorCutSelection | null;
  collectSuppressedHandlePartIds?: (partIds: string[]) => void;
};

export type RebuildSketchSegmentedDoorArgs = {
  runtime: SketchDoorCutsRuntime;
  g: Object3DLike;
  ud: ValueRecord;
  visibleSegments: SketchDrawerCutSegment[];
  basePartId: string;
  collectSuppressedHandlePartIds?: (partIds: string[]) => void;
};
