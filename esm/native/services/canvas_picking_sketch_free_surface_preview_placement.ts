import type { AppContainer } from '../../../types';
import type {
  ResolveSketchBoxSegmentsArgs,
  ResolveSketchFreeBoxHoverPlacementArgs,
  ResolveSketchFreeBoxHoverPlacementResult,
  SketchFreeBoxGeometry,
  SketchFreeBoxGeometryArgs,
} from './canvas_picking_manual_layout_sketch_contracts.js';
import type { SketchBoxDividerState, SketchBoxSegmentState } from './canvas_picking_sketch_box_dividers.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import {
  type LocalPoint,
  type RecordMap,
  type SelectorLocalBox as SharedSelectorLocalBox,
  type SketchFreeHoverHost,
  type SketchFreeSurfacePreviewResult,
} from './canvas_picking_sketch_free_surface_preview_shared.js';
import { resolveSketchFreePlacementHoverPreviewState } from './canvas_picking_sketch_free_surface_preview_placement_record.js';
import { resolveSketchFreePlacementRemoveOverlay } from './canvas_picking_sketch_free_surface_preview_placement_remove.js';

export function resolveSketchFreePlacementBoxPreview(args: {
  App: AppContainer;
  tool: string;
  host: SketchFreeHoverHost;
  planeHit: LocalPoint;
  wardrobeBox: SharedSelectorLocalBox;
  wardrobeBackZ: number;
  freeBoxes: RecordMap[];
  intersects: RaycastHitLike[];
  localParent: unknown;
  resolveSketchFreeBoxHoverPlacement: (
    args: ResolveSketchFreeBoxHoverPlacementArgs
  ) => ResolveSketchFreeBoxHoverPlacementResult | null;
  resolveSketchFreeBoxGeometry: (args: SketchFreeBoxGeometryArgs) => SketchFreeBoxGeometry;
  readSketchBoxDividers: (box: unknown) => SketchBoxDividerState[];
  resolveSketchBoxSegments: (args: ResolveSketchBoxSegmentsArgs) => SketchBoxSegmentState[];
  boxH: number;
  widthOverrideM: number | null;
  depthOverrideM: number | null;
}): SketchFreeSurfacePreviewResult | null {
  const {
    App,
    tool,
    host,
    planeHit,
    wardrobeBox,
    wardrobeBackZ,
    freeBoxes,
    intersects,
    localParent,
    resolveSketchFreeBoxHoverPlacement,
    resolveSketchFreeBoxGeometry,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    boxH,
    widthOverrideM,
    depthOverrideM,
  } = args;
  const hoverPlacement = resolveSketchFreeBoxHoverPlacement({
    App,
    planeX: Number(planeHit.x),
    planeY: Number(planeHit.y),
    boxH,
    widthOverrideM,
    depthOverrideM,
    wardrobeBox,
    wardrobeBackZ,
    freeBoxes,
    hostModuleKey: host.moduleKey,
    intersects,
    localParent,
  });
  if (!hoverPlacement) return null;
  const { hoverRecord, removeBox } = resolveSketchFreePlacementHoverPreviewState({
    tool,
    host,
    hoverPlacement,
    freeBoxes,
  });
  const frontOverlay = resolveSketchFreePlacementRemoveOverlay({
    hoverPlacement,
    removeBox,
    wardrobeWidth: Number(wardrobeBox.width) || 0,
    wardrobeDepth: Number(wardrobeBox.depth) || 0,
    wardrobeBackZ,
    resolveSketchFreeBoxGeometry,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
  });
  const previewZ = wardrobeBackZ + hoverPlacement.previewD / 2;
  return {
    hoverRecord,
    preview: {
      kind: 'box',
      fillFront: !!frontOverlay,
      fillBack: true,
      snapToCenter: hoverPlacement.snapToCenter,
      x: hoverPlacement.previewX,
      y: hoverPlacement.previewY,
      z: previewZ,
      w: hoverPlacement.previewW,
      d: hoverPlacement.previewD,
      woodThick: 0.018,
      boxH: hoverPlacement.previewH,
      op: hoverPlacement.op,
      frontOverlayX: frontOverlay ? frontOverlay.x : undefined,
      frontOverlayY: frontOverlay ? frontOverlay.y : undefined,
      frontOverlayZ: frontOverlay ? frontOverlay.z : undefined,
      frontOverlayW: frontOverlay ? frontOverlay.w : undefined,
      frontOverlayH: frontOverlay ? frontOverlay.h : undefined,
      frontOverlayThickness: frontOverlay ? frontOverlay.d : undefined,
    },
  };
}
