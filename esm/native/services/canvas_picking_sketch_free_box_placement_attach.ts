import type { SketchFreeBoxAttachPlacement } from './canvas_picking_sketch_free_box_placement_shared.js';
import { resolveSketchFreeBoxAttachPlacementCandidates } from './canvas_picking_sketch_free_box_placement_attach_candidates.js';
import { isSketchFreeInwardSideAttachmentBlocked } from './canvas_picking_sketch_free_box_placement_attach_block.js';

export type { SketchFreeBoxAttachPlacement } from './canvas_picking_sketch_free_box_placement_shared.js';
export { isSketchFreeInwardSideAttachmentBlocked } from './canvas_picking_sketch_free_box_placement_attach_block.js';
export { resolveSketchFreeBoxAttachPlacementCandidates } from './canvas_picking_sketch_free_box_placement_attach_candidates.js';

export function resolveSketchFreeBoxAttachPlacement(args: {
  pointX: number;
  pointY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetW: number;
  targetH: number;
  previewW: number;
  previewH: number;
  gap: number;
}): SketchFreeBoxAttachPlacement | null {
  const { horizontal, vertical } = resolveSketchFreeBoxAttachPlacementCandidates(args);
  if (horizontal && vertical) return horizontal.score <= vertical.score ? horizontal : vertical;
  return horizontal || vertical;
}

export function resolveSketchFreeBoxHoverAttachPlacement(args: {
  pointX: number;
  pointY: number;
  targetCenterX: number;
  targetCenterY: number;
  targetW: number;
  targetH: number;
  previewW: number;
  previewH: number;
  gap: number;
  freeBoxes: unknown[];
  ignoreBoxId?: unknown;
  wardrobeWidth: number;
  wardrobeDepth: number;
  backZ: number;
  woodThick: number;
}): SketchFreeBoxAttachPlacement | null {
  const attachCandidates = resolveSketchFreeBoxAttachPlacementCandidates(args);
  const candidateOrder = [attachCandidates.horizontal, attachCandidates.vertical].filter(
    (candidate): candidate is SketchFreeBoxAttachPlacement => !!candidate
  );
  candidateOrder.sort((a, b) => a.score - b.score);
  for (let ci = 0; ci < candidateOrder.length; ci++) {
    const attachedPlacement = candidateOrder[ci];
    if (
      isSketchFreeInwardSideAttachmentBlocked({
        targetCenterX: args.targetCenterX,
        targetCenterY: args.targetCenterY,
        targetW: args.targetW,
        targetH: args.targetH,
        previewW: args.previewW,
        pointX: args.pointX,
        pointY: args.pointY,
        candidate: attachedPlacement,
        freeBoxes: args.freeBoxes,
        ignoreBoxId: args.ignoreBoxId,
        wardrobeWidth: args.wardrobeWidth,
        wardrobeDepth: args.wardrobeDepth,
        backZ: args.backZ,
        woodThick: args.woodThick,
      })
    ) {
      continue;
    }
    return attachedPlacement;
  }
  return null;
}
