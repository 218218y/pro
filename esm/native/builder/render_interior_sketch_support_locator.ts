import type { RenderSketchBoxAbsEntry } from './render_interior_sketch_boxes_shared.js';
import type { SketchBoxLocatorResult } from './render_interior_sketch_support_contracts.js';

export function createSketchBoxLocator(boxAbs: RenderSketchBoxAbsEntry[]) {
  return (y: number): SketchBoxLocatorResult | null => {
    for (let i = 0; i < boxAbs.length; i++) {
      const box = boxAbs[i];
      if (Math.abs(y - box.y) <= box.halfH) {
        return {
          innerW: box.innerW,
          centerX: box.centerX,
          innerD: box.innerD,
          innerBackZ: box.innerBackZ,
        };
      }
    }
    return null;
  };
}
