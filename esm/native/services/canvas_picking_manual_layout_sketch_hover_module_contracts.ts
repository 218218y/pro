import type { AppContainer, UnknownRecord } from '../../../types';
import type { HitObjectLike, RaycastHitLike } from './canvas_picking_engine.js';
import type {
  ModuleKey,
  SketchBoxGeometryArgs,
  SketchBoxGeometry,
  ResolveSketchBoxSegmentsArgs,
  PickSketchBoxSegmentArgs,
  FindNearestSketchBoxDividerArgs,
  FindNearestSketchBoxDividerResult,
  SketchBoxDividerPlacementArgs,
  SketchBoxDividerPlacement,
  FindSketchModuleBoxAtPointArgs,
  FindSketchModuleBoxAtPointResult,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';

export type ManualLayoutSketchHoverModuleFlowArgs = {
  App: AppContainer;
  tool: string;
  freeBoxSpec: UnknownRecord | null;
  hitModuleKey: ModuleKey;
  hitSelectorObj: HitObjectLike | null;
  hitStack: 'top' | 'bottom';
  hitY: number;
  hitLocalX: number | null;
  intersects: RaycastHitLike[];
  setPreview: ((args: UnknownRecord) => unknown) | null;
  hidePreview: ((args: UnknownRecord & { App: AppContainer; THREE: unknown }) => unknown) | null;
  __hideSketchPreviewAndClearHover: () => void;
  __wp_isCornerKey: (v: unknown) => boolean;
  __wp_isDefaultCornerCellCfgLike: (cfg: unknown) => boolean;
  __wp_resolveSketchBoxGeometry: (args: SketchBoxGeometryArgs) => SketchBoxGeometry;
  __wp_findSketchModuleBoxAtPoint: (
    args: FindSketchModuleBoxAtPointArgs
  ) => FindSketchModuleBoxAtPointResult | null;
  __wp_readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  __wp_resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  __wp_pickSketchBoxSegment: (args: PickSketchBoxSegmentArgs) => SketchBoxSegmentState | null;
  __wp_findNearestSketchBoxDivider: (
    args: FindNearestSketchBoxDividerArgs
  ) => FindNearestSketchBoxDividerResult | null;
  __wp_resolveSketchBoxDividerPlacement: (args: SketchBoxDividerPlacementArgs) => SketchBoxDividerPlacement;
  __wp_readSketchBoxDividerXNorm: (box: unknown) => number | null;
  __wp_writeSketchHover: (App: AppContainer, snap: UnknownRecord) => void;
};

export type ManualLayoutSketchHoverModuleContext = ManualLayoutSketchHoverModuleFlowArgs & {
  isBottom: boolean;
  info: UnknownRecord;
  bottomY: number;
  topY: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  spanH: number;
  pad: number;
  yClamped: number;
  isBox: boolean;
  isStorage: boolean;
  isShelf: boolean;
  isRod: boolean;
  isDrawers: boolean;
  isExtDrawers: boolean;
  variant: string;
  shelfDepthM: number | null;
  shelfDepthOverrideM: number | null;
  boxSpec: UnknownRecord | null;
  boxH: number;
  boxWidthOverrideM: number | null;
  boxDepthOverrideM: number | null;
  storageH: number;
  boxes: UnknownRecord[];
  storageBarriers: UnknownRecord[];
  shelves: UnknownRecord[];
  rods: UnknownRecord[];
  drawers: UnknownRecord[];
  extDrawers: UnknownRecord[];
  cfgRef: UnknownRecord | null;
  activeModuleBox: FindSketchModuleBoxAtPointResult | null;
};

export const SKETCH_BOX_TOOL_PREFIX = 'sketch_box:';
export const SKETCH_BOX_DIVIDER_TOOL = 'sketch_box_divider';
