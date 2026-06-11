import type { InteriorGroupLike, InteriorValueRecord } from './render_interior_ops_contracts.js';
import type { SketchModuleInnerFaces } from './render_interior_sketch_module_geometry.js';
import type { SketchPlacementSupport } from './render_interior_sketch_support_contracts.js';

export function createBraceDarkSeamAdder(_args: {
  group: InteriorGroupLike;
  faces: SketchModuleInnerFaces | null;
  internalCenterX: number;
  innerW: number;
  woodThick: number;
  asObject: <T extends object = InteriorValueRecord>(value: unknown) => T | null;
}): SketchPlacementSupport['addBraceDarkSeams'] {
  return () => undefined;
}
