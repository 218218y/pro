import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { SketchBoxGeometry } from './canvas_picking_manual_layout_sketch_contracts.js';
import type { ManualLayoutSketchHoverHost } from './canvas_picking_manual_layout_sketch_hover_state.js';
import type { SketchFrontOverlay } from './canvas_picking_manual_layout_sketch_front_overlay.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';

export type RecordMap = Record<string, unknown>;

export type SketchModuleSurfacePreviewResult = {
  handled: boolean;
  preview?: RecordMap;
  hoverRecord?: RecordMap;
  hidePreview?: boolean;
};

export type ResolveSketchModuleSurfacePreviewArgs = {
  host: ManualLayoutSketchHoverHost;
  tool: string;
  hitModuleKey: number | 'corner' | `corner:${number}` | null;
  intersects: RaycastHitLike[];
  info: RecordMap;
  cfgRef: RecordMap | null;
  hitLocalX: number | null;
  yClamped: number;
  bottomY: number;
  topY: number;
  spanH: number;
  pad: number;
  woodThick: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  isBox: boolean;
  isStorage: boolean;
  isShelf: boolean;
  isRod: boolean;
  allowExistingShelfRemove?: boolean;
  allowExistingRodRemove?: boolean;
  variant: string;
  shelfDepthOverrideM: number | null;
  boxH: number;
  boxWidthOverrideM: number | null;
  boxDepthOverrideM: number | null;
  storageH: number;
  boxes: RecordMap[];
  storageBarriers: RecordMap[];
  shelves: RecordMap[];
  drawers?: RecordMap[];
  extDrawers?: RecordMap[];
  rods: RecordMap[];
  isCornerKey: (value: unknown) => boolean;
  resolveSketchBoxGeometry: (args: {
    innerW: number;
    internalCenterX: number;
    internalDepth: number;
    internalZ: number;
    woodThick: number;
    widthM?: number | null;
    depthM?: number | null;
    xNorm?: number | null;
  }) => SketchBoxGeometry;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: {
    dividers: SketchBoxDividerState[];
    boxCenterX: number;
    innerW: number;
    woodThick: number;
  }) => SketchBoxSegmentState[];
};

export type SketchModuleShelfRemovePreviewArgs = {
  host: ManualLayoutSketchHoverHost;
  hitModuleKey: number | 'corner' | `corner:${number}` | null;
  intersects: RaycastHitLike[];
  info: RecordMap;
  cfgRef: RecordMap | null;
  yClamped: number;
  bottomY: number;
  topY: number;
  spanH: number;
  pad: number;
  shelves: RecordMap[];
  drawers?: RecordMap[];
  extDrawers?: RecordMap[];
  variant: string;
  shelfDepthOverrideM: number | null;
  innerW: number;
  internalDepth: number;
  internalCenterX: number;
  backZ: number;
  woodThick: number;
  regularDepth: number;
  isDrawers: boolean;
  isCornerKey: (value: unknown) => boolean;
  removeEpsShelf: number;
};

export type SketchModuleShelfRemovePreviewState = {
  handled: boolean;
  yClamped: number;
  variantPreview: string;
  shelfDepthOverrideM: number | null;
  result?: SketchModuleSurfacePreviewResult;
};

export type SketchBoxInnerShelfSpanArgs = {
  boxes: RecordMap[];
  bottomY: number;
  spanH: number;
  yClamped: number;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchModuleSurfacePreviewArgs['resolveSketchBoxGeometry'];
};

export type SketchModuleBoxFrontOverlayArgs = {
  sourceBox: RecordMap;
  centerY: number;
  boxH: number;
  widthM: number | null;
  depthM: number | null;
  xNorm: number | null;
  innerW: number;
  internalCenterX: number;
  internalDepth: number;
  internalZ: number;
  woodThick: number;
  resolveSketchBoxGeometry: ResolveSketchModuleSurfacePreviewArgs['resolveSketchBoxGeometry'];
  readSketchBoxDividers: ResolveSketchModuleSurfacePreviewArgs['readSketchBoxDividers'];
  resolveSketchBoxSegments: ResolveSketchModuleSurfacePreviewArgs['resolveSketchBoxSegments'];
};

export type { SketchFrontOverlay };
