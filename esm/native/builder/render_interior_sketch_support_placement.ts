import { SKETCH_BOX_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import type {
  CreateInteriorSketchPlacementSupportArgs,
  SketchPlacementSupport,
} from './render_interior_sketch_support_contracts.js';

import { createBraceDarkSeamAdder } from './render_interior_sketch_support_brace_seams.js';
import { createSketchPlacementMaterialResources } from './render_interior_sketch_support_materials.js';
import { createShelfPinAdder } from './render_interior_sketch_support_shelf_pins.js';

export function createInteriorSketchPlacementSupport(
  args: CreateInteriorSketchPlacementSupportArgs
): SketchPlacementSupport {
  const {
    App,
    group,
    effectiveBottomY,
    effectiveTopY,
    woodThick,
    innerW,
    internalCenterX,
    matCache,
    THREE,
    asObject,
    faces,
  } = args;

  const clampY = (y: number) => {
    const geometryDims = SKETCH_BOX_DIMENSIONS.geometry;
    const pad = Math.min(
      geometryDims.placementClampPadMaxM,
      Math.max(geometryDims.placementClampPadMinM, woodThick * geometryDims.placementClampPadWoodRatio)
    );
    const lo = effectiveBottomY + pad;
    const hi = effectiveTopY - pad;
    return Math.max(lo, Math.min(hi, y));
  };

  const yFromNorm = (yNorm: unknown): number | null => {
    const n = typeof yNorm === 'number' ? yNorm : Number(yNorm);
    if (!Number.isFinite(n)) return null;
    return clampY(effectiveBottomY + Math.max(0, Math.min(1, n)) * (effectiveTopY - effectiveBottomY));
  };

  const placementMaterials = createSketchPlacementMaterialResources({
    App,
    THREE,
    matCache,
  });

  return {
    clampY,
    yFromNorm,
    glassMat: placementMaterials.glassMat,
    addBraceDarkSeams: createBraceDarkSeamAdder({
      group,
      faces,
      internalCenterX,
      innerW,
      woodThick,
      asObject,
    }),
    addShelfPins: createShelfPinAdder({
      group,
      THREE,
      pinGeo: placementMaterials.pinGeo,
      pinMat: placementMaterials.pinMat,
      pinRadius: placementMaterials.pinRadius,
      pinLen: placementMaterials.pinLen,
      pinEdgeOffsetDefault: placementMaterials.pinEdgeOffsetDefault,
    }),
  };
}
