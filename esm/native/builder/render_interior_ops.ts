import type { RenderInteriorOpsDeps } from './render_interior_ops_contracts.js';

import { createBuilderRenderInteriorPresetOps } from './render_interior_preset_ops.js';
import { createBuilderRenderInteriorCustomOps } from './render_interior_custom_ops.js';
import { createBuilderRenderInteriorRodOps } from './render_interior_rod_ops.js';

export type { RenderInteriorOpsDeps } from './render_interior_ops_contracts.js';

export function createBuilderRenderInteriorOps(deps: RenderInteriorOpsDeps) {
  return {
    ...createBuilderRenderInteriorPresetOps(deps),
    ...createBuilderRenderInteriorCustomOps(deps),
    ...createBuilderRenderInteriorRodOps(deps),
  };
}
