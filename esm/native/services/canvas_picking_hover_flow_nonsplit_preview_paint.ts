import { tryHandleGenericPartPaintHover } from './canvas_picking_generic_paint_hover.js';
import type { HandleCanvasNonSplitHoverArgs } from './canvas_picking_hover_flow_nonsplit_contracts.js';

export type NonSplitPaintPreviewDeps = {
  tryHandleGenericPartPaintHover: typeof tryHandleGenericPartPaintHover;
};

const DEFAULT_NON_SPLIT_PAINT_PREVIEW_DEPS: NonSplitPaintPreviewDeps = {
  tryHandleGenericPartPaintHover,
};

export function tryHandleCanvasNonSplitPaintPreviewRoute(
  args: HandleCanvasNonSplitHoverArgs,
  deps: NonSplitPaintPreviewDeps = DEFAULT_NON_SPLIT_PAINT_PREVIEW_DEPS
): boolean {
  const {
    App,
    ndcX,
    ndcY,
    paintSelection,
    raycaster,
    mouse,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo,
  } = args;
  return deps.tryHandleGenericPartPaintHover({
    App,
    ndcX,
    ndcY,
    paintSelection,
    raycaster,
    mouse,
    hideLayoutPreview,
    hideSketchPreview,
    previewRo: previewRo || null,
  });
}
