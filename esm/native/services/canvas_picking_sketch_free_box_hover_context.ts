import type { RoomWallId } from '../../../types';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY } from '../../shared/dimensions/sketch_box_free_placement_policy.js';
import {
  asFiniteNumberOrNaN,
  asNumberOrNull,
  clampSketchFreeBoxCenterYToWorkspace,
  getSketchFreePlacementRoomFloorY,
  isWithinSketchFreePlacementBounds,
  isSketchFreeBoxUnderWardrobeColumn,
  resolveSketchFreeBoxGeometry,
  type ResolveSketchFreeBoxHoverPlacementArgs,
} from './canvas_picking_sketch_free_box_shared.js';
import { resolveSketchFreeBoxPlacementGap } from './canvas_picking_sketch_free_box_gap.js';
import { isNoMainWardrobeSketchMode } from './canvas_picking_sketch_free_box_no_main.js';

export type SketchFreeBoxHoverContext = {
  planeX: number;
  planeY: number;
  wardrobeBackZ: number;
  wardrobeBox: ResolveSketchFreeBoxHoverPlacementArgs['wardrobeBox'];
  freeBoxes: unknown[];
  placementWall: RoomWallId;
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  workspacePad: number;
  gap: number;
  roomFloorY: number;
  blocksFreeAddUnderWardrobe: boolean;
  noMainWardrobeSketchMode: boolean;
};

export function createSketchFreeBoxHoverContext(
  args: ResolveSketchFreeBoxHoverPlacementArgs
): SketchFreeBoxHoverContext | null {
  const planeX = asFiniteNumberOrNaN(args.planeX);
  const planeY = asFiniteNumberOrNaN(args.planeY);
  const boxH = asFiniteNumberOrNaN(args.boxH);
  const wardrobeBackZ = asFiniteNumberOrNaN(args.wardrobeBackZ);
  const wardrobeBox = args.wardrobeBox;
  const placementWall: RoomWallId =
    args.placementWall === 'left' || args.placementWall === 'right' ? args.placementWall : 'back';
  const freeBoxes = (Array.isArray(args.freeBoxes) ? args.freeBoxes : []).filter(value => {
    if (!value || typeof value !== 'object') return false;
    const wall = Reflect.get(value, 'placementWall');
    const normalized = wall === 'left' || wall === 'right' ? wall : 'back';
    return normalized === placementWall;
  });
  if (
    !Number.isFinite(planeX) ||
    !Number.isFinite(planeY) ||
    !Number.isFinite(boxH) ||
    !(boxH > 0) ||
    !wardrobeBox ||
    typeof wardrobeBox !== 'object' ||
    !Number.isFinite(wardrobeBackZ)
  ) {
    return null;
  }

  const previewGeo = resolveSketchFreeBoxGeometry({
    wardrobeWidth: asNumberOrNull(wardrobeBox.width) ?? 0,
    wardrobeDepth: asNumberOrNull(wardrobeBox.depth) ?? 0,
    backZ: wardrobeBackZ,
    centerX: planeX,
    woodThick: MATERIAL_THICKNESS_POLICY.wood.thicknessM,
    widthM: args.widthOverrideM,
    depthM: args.depthOverrideM,
  });
  if (
    !isWithinSketchFreePlacementBounds({
      planeX,
      planeY,
      wardrobeBox,
      previewW: previewGeo.outerW,
      previewH: boxH,
    })
  ) {
    return null;
  }

  const workspacePad = Math.min(
    SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMaxM,
    Math.max(
      SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadMinM,
      boxH * SKETCH_BOX_FREE_WORKSPACE_CLAMP_POLICY.workspaceClampPadHeightRatio
    )
  );
  const previewX = planeX;
  const previewY = clampSketchFreeBoxCenterYToWorkspace({
    centerY: planeY,
    boxH,
    wardrobeCenterY: asFiniteNumberOrNaN(wardrobeBox.centerY),
    wardrobeHeight: asFiniteNumberOrNaN(wardrobeBox.height),
    pad: workspacePad,
  });
  const previewW = previewGeo.outerW;
  const previewD = previewGeo.outerD;
  const previewH = boxH;
  const noMainWardrobeSketchMode = placementWall !== 'back' || isNoMainWardrobeSketchMode(args.App);
  const blocksFreeAddUnderWardrobe =
    placementWall === 'back' &&
    !noMainWardrobeSketchMode &&
    isSketchFreeBoxUnderWardrobeColumn({
      planeX,
      planeY,
      boxH: previewH,
      wardrobeBox,
    });
  const gap = resolveSketchFreeBoxPlacementGap({ boxW: previewW, boxH: previewH });

  return {
    planeX,
    planeY,
    wardrobeBackZ,
    wardrobeBox,
    freeBoxes,
    placementWall,
    previewX,
    previewY,
    previewW,
    previewD,
    previewH,
    workspacePad,
    gap,
    roomFloorY: getSketchFreePlacementRoomFloorY(),
    blocksFreeAddUnderWardrobe,
    noMainWardrobeSketchMode,
  };
}
