import { createMeasureWardrobeLocalBox } from './render_interior_sketch_module_geometry.js';

import type { RenderInteriorSketchOpsDeps } from './render_interior_sketch_shared.js';
import type { RenderInteriorSketchOpsContext } from './render_interior_sketch_ops_types.js';

export function createBuilderRenderInteriorSketchOpsContext(
  deps: RenderInteriorSketchOpsDeps
): RenderInteriorSketchOpsContext {
  const measureWardrobeLocalBox = createMeasureWardrobeLocalBox({
    wardrobeGroup: deps.wardrobeGroup,
    asObject: deps.asObject,
    assertTHREE: deps.assertTHREE,
  });

  return {
    app: deps.app,
    ops: deps.ops,
    wardrobeGroup: deps.wardrobeGroup,
    doors: deps.doors,
    markSplitHoverPickablesDirty:
      typeof deps.markSplitHoverPickablesDirty === 'function' ? deps.markSplitHoverPickablesDirty : null,
    isFn: deps.isFn,
    asObject: deps.asObject,
    matCache: deps.matCache,
    renderOpsHandleCatch: deps.renderOpsHandleCatch,
    assertTHREE: deps.assertTHREE,
    applyInternalDrawersOps: deps.applyInternalDrawersOps,
    measureWardrobeLocalBox,
  };
}
