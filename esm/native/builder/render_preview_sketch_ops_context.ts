import type { RenderPreviewOpsDeps } from './render_preview_ops_contracts.js';
import { createRenderPreviewSketchShared } from './render_preview_sketch_shared.js';
import type { RenderPreviewSketchOpsContext } from './render_preview_sketch_ops_types.js';

export function createRenderPreviewSketchOpsContext(
  deps: RenderPreviewOpsDeps
): RenderPreviewSketchOpsContext {
  return {
    deps,
    app: deps.app,
    ops: deps.ops,
    cacheValue: deps.cacheValue,
    writeCacheValue: deps.writeCacheValue,
    wardrobeGroup: deps.wardrobeGroup,
    renderOpsHandleCatch: deps.renderOpsHandleCatch,
    assertTHREE: deps.assertTHREE,
    getThreeMaybe: deps.getThreeMaybe,
    shared: createRenderPreviewSketchShared(deps),
  };
}
