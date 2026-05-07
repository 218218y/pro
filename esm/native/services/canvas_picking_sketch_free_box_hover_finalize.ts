import { MATERIAL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import {
  resolveSketchFreeBoxNonOverlappingPlacement,
  resolveSketchFreeBoxOutsideWardrobePlacement,
} from './canvas_picking_sketch_free_box_placement.js';
import type { SketchFreeBoxHoverContext } from './canvas_picking_sketch_free_box_hover_context.js';
import type {
  SketchFreeBoxHoverAttachPlacement,
  SketchFreeBoxHoverRemovePlacement,
} from './canvas_picking_sketch_free_box_hover_scan.js';

export function finalizeSketchFreeBoxHoverPlacement(args: {
  context: SketchFreeBoxHoverContext;
  removePlacement: SketchFreeBoxHoverRemovePlacement | null;
  attachPlacement: SketchFreeBoxHoverAttachPlacement | null;
}): {
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  op: 'add' | 'remove';
  removeId: string | null;
  snapToCenter: boolean;
} {
  const { context, removePlacement, attachPlacement } = args;
  if (removePlacement) {
    return {
      previewX: removePlacement.previewX,
      previewY: removePlacement.previewY,
      previewW: removePlacement.previewW,
      previewD: removePlacement.previewD,
      previewH: removePlacement.previewH,
      op: 'remove',
      removeId: removePlacement.removeId,
      snapToCenter: false,
    };
  }

  let previewX = context.previewX;
  let previewY = context.previewY;
  let snapToCenter = false;
  if (attachPlacement) {
    previewX = attachPlacement.previewX;
    previewY = attachPlacement.previewY;
    snapToCenter = attachPlacement.snappedToCenter;
  }

  const clampedPlacement = resolveSketchFreeBoxNonOverlappingPlacement({
    centerX: previewX,
    centerY: previewY,
    boxW: context.previewW,
    boxH: context.previewH,
    wardrobeCenterY: Number(context.wardrobeBox.centerY),
    wardrobeHeight: Number(context.wardrobeBox.height),
    wardrobeWidth: Number(context.wardrobeBox.width) || 0,
    wardrobeDepth: Number(context.wardrobeBox.depth) || 0,
    backZ: context.wardrobeBackZ,
    woodThick: MATERIAL_DIMENSIONS.wood.thicknessM,
    freeBoxes: context.freeBoxes,
    pad: context.workspacePad,
    attachment: attachPlacement
      ? {
          fixedAxis: attachPlacement.fixedAxis,
          direction: attachPlacement.direction,
          anchorX: attachPlacement.previewX,
          anchorY: attachPlacement.previewY,
        }
      : null,
  });
  previewX = clampedPlacement.centerX;
  previewY = clampedPlacement.centerY;

  const finalOutsidePlacement = resolveSketchFreeBoxOutsideWardrobePlacement({
    centerX: previewX,
    centerY: previewY,
    boxW: context.previewW,
    boxH: context.previewH,
    wardrobeCenterX: Number(context.wardrobeBox.centerX),
    wardrobeCenterY: Number(context.wardrobeBox.centerY),
    wardrobeWidth: Number(context.wardrobeBox.width),
    wardrobeHeight: Number(context.wardrobeBox.height),
    roomFloorY: context.roomFloorY,
  });
  if (finalOutsidePlacement) {
    previewX = finalOutsidePlacement.centerX;
    previewY = finalOutsidePlacement.centerY;
  }

  return {
    previewX,
    previewY,
    previewW: context.previewW,
    previewD: context.previewD,
    previewH: context.previewH,
    op: 'add',
    removeId: null,
    snapToCenter:
      snapToCenter &&
      !!attachPlacement &&
      Math.abs(previewX - attachPlacement.previewX) <= 0.0001 &&
      Math.abs(previewY - attachPlacement.previewY) <= 0.0001,
  };
}
