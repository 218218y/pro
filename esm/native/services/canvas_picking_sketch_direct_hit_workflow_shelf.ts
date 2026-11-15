import { isShelfBoardPartId } from '../features/part_identity/api.js';
import {
  type ManualLayoutConfigRecord,
  toggleManualLayoutShelf,
} from './canvas_picking_manual_layout_config_ops.js';
import { parseSketchShelfTool } from './canvas_picking_sketch_module_surface_commit_shared.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_support_errors.js';
import type { RaycastHitLike } from './canvas_picking_engine.js';
import type { ManualLayoutSketchDirectHitContext } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import { asConfig } from './canvas_picking_sketch_direct_hit_workflow_contracts.js';
import {
  asRecord,
  ensureBooleanArray,
  readGridDivisions,
  prepareShelfToggleConfig,
} from './canvas_picking_sketch_direct_hit_workflow_records.js';
import {
  tryRemoveSketchShelfByHit,
  tryToggleSketchShelfByHit,
} from './canvas_picking_sketch_direct_hit_workflow_shelves_shared.js';

export function tryApplySketchDirectHitShelfActions(args: ManualLayoutSketchDirectHitContext): boolean {
  const {
    __activeModuleKey,
    __mt,
    topY,
    bottomY,
    mapKey,
    __gridMap,
    totalHeight,
    intersects,
    __patchConfigForKey,
    __hoverOk,
    __hoverKind,
    __hoverOp,
    App,
  } = args;

  if (__hoverOk && (__hoverKind !== 'shelf' || __hoverOp !== 'remove')) return false;

  try {
    const shelfBoardHit = intersects.find((hit: RaycastHitLike) => {
      const userData = asRecord(hit?.object?.userData);
      if (!userData) return false;
      if (userData.__kind === 'shelf_pin' || userData.__kind === 'brace_seam') return false;
      return isShelfBoardPartId(userData.partId);
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
          const committed = __patchConfigForKey(
            __activeModuleKey,
            cfg0 => {
              const cfg = asConfig(cfg0);
              const divs = divisions;
              const isShelfTool = __mt.startsWith('sketch_shelf:');
              const shelfTool = parseSketchShelfTool(__mt);
              if (
                isShelfTool
                  ? tryToggleSketchShelfByHit(
                      cfg,
                      bottomY,
                      totalHeight,
                      shelfHitY,
                      shelfTool.variant,
                      shelfTool.shelfDepthM
                    )
                  : tryRemoveSketchShelfByHit(cfg, bottomY, totalHeight, shelfHitY)
              )
                return;
              const customData = prepareShelfToggleConfig(cfg, divs, topY, bottomY);
              if (isShelfTool) {
                toggleManualLayoutShelf(cfg as ManualLayoutConfigRecord, {
                  divs,
                  topY,
                  bottomY,
                  arrayIdx: shelfIndex - 1,
                  shelfVariant:
                    shelfTool.variant === 'brace' ||
                    shelfTool.variant === 'double' ||
                    shelfTool.variant === 'glass' ||
                    shelfTool.variant === 'winter_brace'
                      ? shelfTool.variant
                      : 'regular',
                  reset: false,
                });
              } else {
                const shelves = ensureBooleanArray(customData, 'shelves');
                const idx = shelfIndex - 1;
                shelves[idx] = !shelves[idx];
              }
            },
            createCanvasPickingConfigStructuralPatchMeta('sketch.toggleBaseShelf')
          );
          return committed !== false;
        }
      }
    }
  } catch (error) {
    __wp_reportPickingIssue(App, error, {
      where: 'canvasPicking.structuralCommit',
      op: 'sketchDirectHit.shelf',
      throttleMs: 1000,
    });
  }

  return false;
}
