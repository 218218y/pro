import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import { asConfig } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  asRecord,
  ensureBooleanArray,
  readGridDivisions,
  prepareShelfToggleConfig,
} from './canvas_picking_sketch_direct_hit_workflow_records.js';
import { tryRemoveSketchShelfByHit } from './canvas_picking_sketch_direct_hit_workflow_shelves_shared.js';

export function tryApplySketchDirectHitShelfActions(args: ManualLayoutSketchDirectHitContext): boolean {
  const {
    __activeModuleKey,
    topY,
    bottomY,
    mapKey,
    __gridMap,
    totalHeight,
    intersects,
    __patchConfigForKey,
  } = args;

  try {
    const shelfBoardHit = intersects.find((hit: RaycastHitLike) => {
      const userData = asRecord(hit?.object?.userData);
      if (!userData) return false;
      if (userData.__kind === 'shelf_pin' || userData.__kind === 'brace_seam') return false;
      return userData.partId === 'all_shelves' || userData.partId === 'corner_shelves';
    });
    const shelfHitY = typeof shelfBoardHit?.point?.y === 'number' ? shelfBoardHit.point.y : null;

    if (typeof shelfHitY === 'number') {
      const divisions = readGridDivisions(__gridMap, mapKey);
      if (Number.isFinite(divisions) && divisions > 1) {
        const step = totalHeight / divisions;
        const rel = shelfHitY - bottomY;
        let shelfIndex = Math.round(rel / step);
        if (shelfIndex < 1) shelfIndex = 1;
        if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;

        const targetY = bottomY + shelfIndex * step;
        if (Math.abs(shelfHitY - targetY) <= 0.035) {
          __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              const divs = divisions;
              if (tryRemoveSketchShelfByHit(cfg, bottomY, totalHeight, shelfHitY)) return;
              const customData = prepareShelfToggleConfig(cfg, divs, topY, bottomY);
              const shelves = ensureBooleanArray(customData, 'shelves');
              const idx = shelfIndex - 1;
              shelves[idx] = !shelves[idx];
            },
            { source: 'sketch.toggleBaseShelf', immediate: true }
          );
          return true;
        }
      }
    }
  } catch {
    // ignore
  }

  return false;
}
