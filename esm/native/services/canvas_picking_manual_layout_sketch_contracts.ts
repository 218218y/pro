import type { AppContainer, SketchPlacementPreviewArgsLike, UnknownRecord } from '../../../types';
import type { MouseVectorLike, RaycastHitLike, RaycasterLike } from './canvas_picking_engine.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';

export type ModuleKey = number | 'corner' | `corner:${number}`;

export type LocalPoint = { x: number; y: number; z: number };

export type SelectorLocalBox = {
  centerX: number;
  centerY: number;
  centerZ: number;
  width: number;
  height: number;
  depth: number;
};

export type SketchPreviewArgs = SketchPlacementPreviewArgsLike & UnknownRecord;

export interface SketchPreviewSurfaceLike extends UnknownRecord {
  hideSketchPlacementPreview?: (args: SketchPreviewArgs) => unknown;
  setSketchPlacementPreview?: (args: SketchPreviewArgs) => unknown;
}

export interface CanvasPickingGridInfoLike extends UnknownRecord {
  effectiveBottomY?: number;
  effectiveTopY?: number;
  woodThick?: number;
  innerW?: number;
  internalCenterX?: number;
  internalDepth?: number;
  internalZ?: number;
  gridDivisions?: number;
}

export interface SketchModuleBoxContentLike extends UnknownRecord {
  id?: string | number | null;
  yNorm?: number | string | null;
  yNormC?: number | string | null;
  heightM?: number | string | null;
  depthM?: number | string | null;
  xNorm?: number | string | null;
  variant?: string | null;
}

export interface SketchModuleBoxLike extends UnknownRecord {
  id?: string | number | null;
  freePlacement?: boolean;
  yNorm?: number | string | null;
  heightM?: number | string | null;
  widthM?: number | string | null;
  depthM?: number | string | null;
  xNorm?: number | string | null;
  absX?: number | string | null;
  absY?: number | string | null;
  hasCornice?: boolean;
  corniceType?: string | null;
  baseType?: string | null;
  baseLegStyle?: string | null;
  baseLegColor?: string | null;
  baseLegHeightCm?: number | string | null;
  baseLegWidthCm?: number | string | null;
  shelves?: SketchModuleBoxContentLike[];
  rods?: SketchModuleBoxContentLike[];
  storageBarriers?: SketchModuleBoxContentLike[];
}

export type IntersectScreenWithLocalZPlaneArgs = {
  App: AppContainer;
  raycaster: RaycasterLike;
  mouse: MouseVectorLike;
  camera: unknown;
  ndcX: number;
  ndcY: number;
  localParent: unknown;
  planeZ: number;
};

export type SketchFreeBoxGeometryArgs = {
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  centerX: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
};

export type SketchFreeBoxGeometry = {
  outerW: number;
  innerW: number;
  centerX: number;
  outerD: number;
  innerD: number;
  centerZ: number;
  innerBackZ: number;
};

export type SketchFreeBoxLocalHitArgs = {
  App: AppContainer;
  intersects: RaycastHitLike[];
  localParent: unknown;
  partPrefix: string;
};

export type ResolveSketchBoxSegmentsArgs = {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
};

export type PickSketchBoxSegmentArgs = {
  segments: SketchBoxSegmentState[];
  boxCenterX: number;
  innerW: number;
  cursorX?: number | null;
  xNorm?: number | null;
};

export type FindNearestSketchBoxDividerResult = {
  dividerId: string;
  xNorm: number;
  centerX: number;
  centered: boolean;
};

export type FindNearestSketchBoxDividerArgs = {
  dividers: SketchBoxDividerState[];
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX: number;
};

export type SketchBoxDividerPlacementArgs = {
  boxCenterX: number;
  innerW: number;
  woodThick: number;
  cursorX?: number | null;
  dividerXNorm?: number | null;
  enableCenterSnap?: boolean;
};

export type SketchBoxDividerPlacement = {
  xNorm: number;
  centerX: number;
  centered: boolean;
};

export type FindSketchModuleBoxAtPointArgs = {
  boxes: unknown[];
  cursorY: number;
  cursorX?: number | null;
  bottomY: number;
  spanH: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
};

export type FindSketchModuleBoxAtPointResult = {
  box: SketchModuleBoxLike;
  boxId: string;
  geo: SketchFreeBoxGeometry;
  centerY: number;
  height: number;
};

export type SketchBoxGeometryArgs = {
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  widthM?: number | null;
  depthM?: number | null;
  xNorm?: number | null;
  centerXHint?: number | null;
  enableCenterSnap?: boolean;
};

export type SketchBoxGeometry = {
  outerW: number;
  innerW: number;
  centerX: number;
  xNorm: number;
  centered: boolean;
  outerD: number;
  innerD: number;
  centerZ: number;
  innerCenterZ: number;
  innerBackZ: number;
};

export type ResolveSketchFreeBoxHoverPlacementArgs = {
  App: AppContainer;
  planeX: number;
  planeY: number;
  boxH: number;
  widthOverrideM?: number | null;
  depthOverrideM?: number | null;
  wardrobeBox: SelectorLocalBox;
  wardrobeBackZ: number;
  freeBoxes: unknown[];
  hostModuleKey?: ModuleKey | null;
  intersects?: RaycastHitLike[] | null;
  localParent?: unknown;
};

export type ResolveSketchFreeBoxHoverPlacementResult = {
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  op: 'add' | 'remove';
  removeId: string | null;
  snapToCenter: boolean;
};
