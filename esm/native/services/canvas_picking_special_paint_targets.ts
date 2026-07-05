import { isSpecialSurfacePaintTargetPartId } from '../features/part_identity/api.js';

/**
 * Paint selections such as mirror/glass are structural door-front visuals, not
 * plain color swatches. Keep this predicate shared by click + hover so every
 * drawer/door family that can render those visuals gets the same behavior.
 */
export function isCanvasPickingSpecialPaintTargetPartId(partId: string): boolean {
  return isSpecialSurfacePaintTargetPartId(partId);
}
