import { applyInteriorSketchExtrasOwner } from './render_interior_sketch_ops_apply.js';
import { createBuilderRenderInteriorSketchOpsContext } from './render_interior_sketch_ops_context.js';

import type { RenderInteriorSketchOpsDeps } from './render_interior_sketch_shared.js';

export function createBuilderRenderInteriorSketchOps(deps: RenderInteriorSketchOpsDeps) {
  const owner = createBuilderRenderInteriorSketchOpsContext(deps);

  return {
    applyInteriorSketchExtras: (args: unknown) => applyInteriorSketchExtrasOwner(owner, args),
  };
}
