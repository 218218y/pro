export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export { resolveSketchBoxStackPreviewContext } from './canvas_picking_sketch_box_stack_preview_context.js';
export { buildSketchBoxFrontOverlayFields } from './canvas_picking_sketch_box_stack_preview_overlay.js';
