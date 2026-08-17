import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
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
import type { RoomWallSurfacePickMeta } from './room_wall_picking.js';
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
  placementWall?: 'back' | 'left' | 'right';
  placementSurface?: RoomWallSurfacePickMeta | null;
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
    placementWall,
    placementSurface,
    resolveSketchFreeBoxHoverPlacement,
    resolveSketchFreeBoxGeometry,
    readSketchBoxDividers,
    resolveSketchBoxSegments,
    boxH,
    widthOverrideM,
    depthOverrideM,
  } = args;
  const resolvedPlacementWall =
    placementWall === 'left' || placementWall === 'right' ? placementWall : 'back';
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
    placementWall: resolvedPlacementWall,
  });
  if (!hoverPlacement) return null;
  const { hoverRecord, removeBox } = resolveSketchFreePlacementHoverPreviewState({
    tool,
    host,
    hoverPlacement,
    freeBoxes,
  });
  if (!hoverRecord) return null;
  const frontOverlay =
    resolvedPlacementWall === 'back'
      ? resolveSketchFreePlacementRemoveOverlay({
          hoverPlacement,
          removeBox,
          wardrobeWidth: Number(wardrobeBox.width) || 0,
          wardrobeDepth: Number(wardrobeBox.depth) || 0,
          wardrobeBackZ,
          resolveSketchFreeBoxGeometry,
          readSketchBoxDividers,
          resolveSketchBoxSegments,
        })
      : null;
  const sideWall = resolvedPlacementWall === 'left' || resolvedPlacementWall === 'right';
  if (sideWall && !placementSurface) return null;
  const previewX = sideWall
    ? Number(placementSurface?.interiorFaceCoord) +
      (Number(placementSurface?.inwardNormalX) * hoverPlacement.previewD) / 2
    : hoverPlacement.previewX;
  const previewZ = sideWall ? hoverPlacement.previewX : wardrobeBackZ + hoverPlacement.previewD / 2;
  const rotationY =
    resolvedPlacementWall === 'left' ? Math.PI / 2 : resolvedPlacementWall === 'right' ? -Math.PI / 2 : 0;
  return {
    hoverRecord,
    preview: {
      kind: 'box',
      fillFront: !!frontOverlay,
      fillBack: true,
      snapToCenter: hoverPlacement.snapToCenter,
      x: previewX,
      y: hoverPlacement.previewY,
      z: previewZ,
      w: hoverPlacement.previewW,
      d: hoverPlacement.previewD,
      woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
      boxH: hoverPlacement.previewH,
      op: hoverPlacement.op,
      rotationY,
      frontOverlayX: frontOverlay ? frontOverlay.x : undefined,
      frontOverlayY: frontOverlay ? frontOverlay.y : undefined,
      frontOverlayZ: frontOverlay ? frontOverlay.z : undefined,
      frontOverlayW: frontOverlay ? frontOverlay.w : undefined,
      frontOverlayH: frontOverlay ? frontOverlay.h : undefined,
      frontOverlayThickness: frontOverlay ? frontOverlay.d : undefined,
    },
  };
}
