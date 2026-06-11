import type { SketchConfigLike } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  prepareShelfToggleConfig,
  readGridDivisions,
  readRecordNumber,
  readSketchExtras,
} from './canvas_picking_sketch_direct_hit_workflow_records.js';

export { prepareShelfToggleConfig, readGridDivisions };

export function tryRemoveSketchShelfByHit(
  cfg: SketchConfigLike,
  bottomY: number,
  totalHeight: number,
  shelfHitY: number
): boolean {
  try {
    const extra = readSketchExtras(cfg);
    const shelves = extra && Array.isArray(extra.shelves) ? extra.shelves : null;
    if (!shelves || !shelves.length) return false;
    const REMOVE_EPS_SHELF = 0.02;
    let bestIdx = -1;
    let bestDy = Infinity;
    for (let i = 0; i < shelves.length; i++) {
      const n = readRecordNumber(shelves[i], 'yNorm');
      if (n == null) continue;
      const yAbs = bottomY + Math.max(0, Math.min(1, n)) * totalHeight;
      const dy = Math.abs(shelfHitY - yAbs);
      if (dy < bestDy) {
        bestDy = dy;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestDy <= REMOVE_EPS_SHELF) {
      shelves.splice(bestIdx, 1);
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}
