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
    const pad = Math.min(0.006, Math.max(0.001, woodThick * 0.2));
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
