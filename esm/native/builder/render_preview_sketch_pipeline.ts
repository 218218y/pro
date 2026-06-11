import type { PreviewGroupLike } from './render_preview_ops_contracts.js';
import { applyBoxContentSketchPlacementPreview } from './render_preview_sketch_pipeline_box_content.js';
import { applyLinearSketchPlacementPreview } from './render_preview_sketch_pipeline_linear.js';
import { applyObjectBoxesSketchPlacementPreview } from './render_preview_sketch_pipeline_object_boxes.js';
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
