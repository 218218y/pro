import { SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY } from '../../shared/dimensions/sketch_box_geometry_policy.js';
import type {
  CreateInteriorSketchPlacementSupportArgs,
  SketchPlacementSupport,
} from './render_interior_sketch_support_contracts.js';

import { createBraceDarkSeamAdder } from './render_interior_sketch_support_brace_seams.js';
import { createSketchPlacementMaterialResources } from './render_interior_sketch_support_materials.js';
import { createShelfPinAdder } from './render_interior_sketch_support_shelf_pins.js';
import { toFiniteNumber } from './render_interior_sketch_shared.js';

export function createInteriorSketchPlacementSupport(
  args: CreateInteriorSketchPlacementSupportArgs
): SketchPlacementSupport {
  const {
    App,
    roomArchitecturePlan,
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
    const pad = Math.min(
      SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMaxM,
      Math.max(
        SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadMinM,
        woodThick * SKETCH_BOX_PLACEMENT_GEOMETRY_POLICY.placementClampPadWoodRatio
      )
    );
    const lo = effectiveBottomY + pad;
    const hi = effectiveTopY - pad;
    return Math.max(lo, Math.min(hi, y));
  };

  const yFromNorm = (yNorm: unknown): number | null => {
    const n = toFiniteNumber(yNorm);
    if (n == null) return null;
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
      roomArchitecturePlan,
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
