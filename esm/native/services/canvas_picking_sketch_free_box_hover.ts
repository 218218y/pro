import type { ResolveSketchFreeBoxHoverPlacementArgs } from './canvas_picking_sketch_free_box_shared.js';
import { createSketchFreeBoxHoverContext } from './canvas_picking_sketch_free_box_hover_context.js';
import { finalizeSketchFreeBoxHoverPlacement } from './canvas_picking_sketch_free_box_hover_finalize.js';
import { scanSketchFreeBoxHoverPlacements } from './canvas_picking_sketch_free_box_hover_scan.js';

export function resolveSketchFreeBoxHoverPlacement(args: ResolveSketchFreeBoxHoverPlacementArgs): {
  previewX: number;
  previewY: number;
  previewW: number;
  previewD: number;
  previewH: number;
  op: 'add' | 'remove';
  removeId: string | null;
  snapToCenter: boolean;
  placementWall: 'back' | 'left' | 'right';
} | null {
  const context = createSketchFreeBoxHoverContext(args);
  if (!context) return null;

  const { removePlacement, attachPlacement } = scanSketchFreeBoxHoverPlacements({
    context,
    hoverArgs: args,
  });

  if (context.blocksFreeAddUnderWardrobe && !removePlacement) return null;

  return finalizeSketchFreeBoxHoverPlacement({
    context,
    removePlacement,
    attachPlacement,
  });
}
