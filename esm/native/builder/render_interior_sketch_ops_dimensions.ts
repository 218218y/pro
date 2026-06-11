import { renderSketchFreeBoxDimensionOverlays } from './render_interior_sketch_layout.js';
import { asDimensionLineFn, asValueRecord } from './render_interior_sketch_shared.js';

import type { InteriorTHREESurface } from './render_interior_ops_contracts.js';
import type {
  InteriorSketchExtrasInput,
  InteriorSketchResolvedThree,
  RenderInteriorSketchOpsContext,
} from './render_interior_sketch_ops_types.js';

export function resolveInteriorSketchThreeAndDimensions(
  owner: RenderInteriorSketchOpsContext,
  resolved: InteriorSketchExtrasInput
): InteriorSketchResolvedThree {
  let THREE = owner.asObject<InteriorTHREESurface>(resolved.input.THREE);
  const addDimensionLine = asDimensionLineFn(resolved.renderOps?.addDimensionLine);
  const showDimensions = !!asValueRecord(resolved.input.cfg)?.showDimensions;
  if (!THREE) {
    try {
      THREE = owner.asObject<InteriorTHREESurface>(
        owner.assertTHREE(resolved.App, 'native/builder/render_ops.applyInteriorSketchExtras')
      );
    } catch {
      THREE = null;
    }
  }

  const freeBoxDimensionOverlayContext =
    showDimensions && THREE && addDimensionLine ? { THREE, addDimensionLine, entries: [] } : null;

  return {
    THREE,
    addDimensionLine,
    freeBoxDimensionOverlayContext,
    renderFreeBoxDimensionsEnabled: !!freeBoxDimensionOverlayContext,
    freeBoxDimensionEntries: freeBoxDimensionOverlayContext?.entries ?? null,
  };
}

export function renderInteriorSketchPendingFreeBoxDimensions(
  resolvedThree: InteriorSketchResolvedThree
): void {
  const context = resolvedThree.freeBoxDimensionOverlayContext;
  if (!context || !context.entries.length) return;
  renderSketchFreeBoxDimensionOverlays({
    THREE: context.THREE,
    addDimensionLine: context.addDimensionLine,
    entries: context.entries,
  });
}
