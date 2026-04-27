import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';

import { createBuilderRenderPreviewMarkerOps } from './render_preview_marker_ops.js';
import { createBuilderRenderSketchPlacementPreviewOps } from './render_preview_sketch_ops.js';
import { createBuilderRenderInteriorLayoutHoverPreviewOps } from './render_preview_interior_hover_ops.js';

export type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';

export function createBuilderRenderPreviewOps(deps: RenderPreviewOpsDeps) {
  return {
    ...createBuilderRenderPreviewMarkerOps(deps),
    ...createBuilderRenderSketchPlacementPreviewOps(deps),
    ...createBuilderRenderInteriorLayoutHoverPreviewOps(deps),
  };
}
