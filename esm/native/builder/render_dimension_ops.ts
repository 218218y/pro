import { applyCornerDimensionOps } from './render_dimension_ops_corner.js';
import { applyMainWardrobeDimensionOps } from './render_dimension_ops_main.js';
import { createRenderDimensionContext, type RenderDimensionOpsDeps } from './render_dimension_ops_shared.js';

export function createBuilderRenderDimensionOps(deps: RenderDimensionOpsDeps) {
  const app = deps.app;
  const ops = deps.ops;

  function applyDimensions(argsIn: unknown) {
    const App = app(argsIn);
    ops(App);

    const ctx = createRenderDimensionContext(argsIn);
    if (!ctx) return false;

    applyMainWardrobeDimensionOps(ctx);
    applyCornerDimensionOps(ctx);
    return true;
  }

  return {
    applyDimensions,
  };
}
