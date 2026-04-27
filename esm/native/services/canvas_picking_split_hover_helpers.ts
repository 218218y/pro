// Split-hover helper seams for canvas picking.
//
// Public callers keep importing this seam while ownership now lives in
// split-hover bounds / preview-line / roots owners.

export type { SplitHoverDoorBounds } from './canvas_picking_split_hover_bounds.js';
export {
  __wp_getSplitHoverDoorBaseKey,
  __wp_readSplitHoverDoorBounds,
} from './canvas_picking_split_hover_bounds.js';
export { __wp_getRegularSplitPreviewLineY } from './canvas_picking_split_hover_preview_line.js';
export { __wp_getSplitHoverRaycastRoots } from './canvas_picking_split_hover_roots.js';
