import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';
import { setSketchPlacementPreviewOwner } from './render_preview_sketch_ops_apply.js';
import { createRenderPreviewSketchOpsContext } from './render_preview_sketch_ops_context.js';
import {
  ensureSketchPlacementPreviewOwner,
  hideSketchPlacementPreviewOwner,
} from './render_preview_sketch_ops_state.js';

export function createBuilderRenderSketchPlacementPreviewOps(deps: RenderPreviewOpsDeps) {
  const owner = createRenderPreviewSketchOpsContext(deps);

  return {
    ensureSketchPlacementPreview: (args: unknown) => ensureSketchPlacementPreviewOwner(owner, args),
    hideSketchPlacementPreview: (args: unknown) => hideSketchPlacementPreviewOwner(owner, args),
    setSketchPlacementPreview: (args: unknown) => setSketchPlacementPreviewOwner(owner, args),
  };
}
