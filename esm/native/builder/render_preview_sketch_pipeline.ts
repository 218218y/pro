import type { PreviewGroupLike } from './render_preview_ops_contracts.js';
import { applyBoxContentSketchPlacementPreview } from './render_preview_sketch_pipeline_box_content.js';
import { applyLinearSketchPlacementPreview } from './render_preview_sketch_pipeline_linear.js';
import { applyObjectBoxesSketchPlacementPreview } from './render_preview_sketch_pipeline_object_boxes.js';
import {
  applyCellLayoutSketchPlacementPreview,
  hideCellLayoutSketchPlacementPreviewMeshes,
  restoreCellLayoutWardrobeVisibility,
} from './render_preview_sketch_pipeline_cell_layout.js';
import {
  applySketchPlacementMeasurements,
  hideSketchPlacementMeasurements,
} from './render_preview_sketch_measurements.js';
import {
  createSketchPlacementPreviewContext,
  type ApplySketchPlacementPreviewArgs,
} from './render_preview_sketch_pipeline_shared.js';

export type { ApplySketchPlacementPreviewArgs } from './render_preview_sketch_pipeline_shared.js';

export function applySketchPlacementPreview(args: ApplySketchPlacementPreviewArgs): PreviewGroupLike {
  const ctx = createSketchPlacementPreviewContext(args);
  if (ctx.kind !== 'drawer_divider') {
    try {
      delete ctx.ud.__drawerDividerMotionPreview;
    } catch {
      // keep preview application resilient
    }
  }

  if (ctx.kind !== 'cell_layout') {
    restoreCellLayoutWardrobeVisibility(ctx.g, ctx.shared);
    hideCellLayoutSketchPlacementPreviewMeshes(ctx);
  }

  if (applyCellLayoutSketchPlacementPreview(ctx)) {
    hideSketchPlacementMeasurements(ctx.g, ctx.shared);
    return ctx.g;
  }

  if (applyObjectBoxesSketchPlacementPreview(ctx)) {
    applySketchPlacementMeasurements(ctx);
    return ctx.g;
  }

  if (!ctx.hasFinitePlacement) {
    ctx.g.visible = false;
    ctx.hideAll();
    hideSketchPlacementMeasurements(ctx.g, ctx.shared);
    return ctx.g;
  }

  ctx.g.visible = true;
  ctx.hideAll();

  if (!applyBoxContentSketchPlacementPreview(ctx)) {
    applyLinearSketchPlacementPreview(ctx);
  }
  applySketchPlacementMeasurements(ctx);
  return ctx.g;
}
