import { MATERIAL_DIMENSIONS, SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  clampSketchFreeBoxCenterYToWorkspace,
  getSketchFreePlacementRoomFloorY,
  isWithinSketchFreePlacementBounds,
  resolveSketchFreeBoxGeometry,
  type ResolveSketchFreeBoxHoverPlacementArgs,
} from './canvas_picking_sketch_free_box_shared.js';
import { resolveSketchFreeBoxPlacementGap } from './canvas_picking_sketch_free_box_gap.js';

export type SketchFreeBoxHoverContext = {
  planeX: number;
  planeY: number;
  wardrobeBackZ: number;
  wardrobeBox: ResolveSketchFreeBoxHoverPlacementArgs['wardrobeBox'];
  freeBoxes: unknown[];
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  workspacePad: number;
  gap: number;
  roomFloorY: number;
};

export function createSketchFreeBoxHoverContext(
  args: ResolveSketchFreeBoxHoverPlacementArgs
): SketchFreeBoxHoverContext | null {
  const planeX = Number(args.planeX);
  const planeY = Number(args.planeY);
  const boxH = Number(args.boxH);
  const wardrobeBackZ = Number(args.wardrobeBackZ);
  const wardrobeBox = args.wardrobeBox;
  const freeBoxes = Array.isArray(args.freeBoxes) ? args.freeBoxes : [];
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
    wardrobeWidth: Number(wardrobeBox.width) || 0,
    wardrobeDepth: Number(wardrobeBox.depth) || 0,
    backZ: wardrobeBackZ,
    centerX: planeX,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
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

  const freePlacementDims = SKETCH_BOX_DIMENSIONS.freePlacement;
  const workspacePad = Math.min(
    freePlacementDims.workspaceClampPadMaxM,
    Math.max(freePlacementDims.workspaceClampPadMinM, boxH * freePlacementDims.workspaceClampPadHeightRatio)
  );
  const previewX = planeX;
  const previewY = clampSketchFreeBoxCenterYToWorkspace({
    centerY: planeY,
    boxH,
    wardrobeCenterY: Number(wardrobeBox.centerY),
    wardrobeHeight: Number(wardrobeBox.height),
    pad: workspacePad,
  });
  const previewW = previewGeo.outerW;
  const previewD = previewGeo.outerD;
  const previewH = boxH;
  const gap = resolveSketchFreeBoxPlacementGap({ boxW: previewW, boxH: previewH });

  return {
    planeX,
    planeY,
    wardrobeBackZ,
    wardrobeBox,
    freeBoxes,
    previewX,
    previewY,
    previewW,
    previewD,
    previewH,
    workspacePad,
    gap,
    roomFloorY: getSketchFreePlacementRoomFloorY(),
  };
}
