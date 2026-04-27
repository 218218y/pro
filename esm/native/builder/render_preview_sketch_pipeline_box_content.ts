import type { SketchPlacementPreviewContext } from './render_preview_sketch_pipeline_shared.js';

import { applyBoxVolumeSketchPlacementPreview } from './render_preview_sketch_pipeline_box_content_box.js';
import { applyStackedBoxContentSketchPlacementPreview } from './render_preview_sketch_pipeline_box_content_drawers.js';

export function applyBoxContentSketchPlacementPreview(ctx: SketchPlacementPreviewContext): boolean {
  return applyStackedBoxContentSketchPlacementPreview(ctx) || applyBoxVolumeSketchPlacementPreview(ctx);
}
