import { CARCASS_SHELL_DIMENSIONS } from '../../shared/wardrobe_dimension_tokens_shared.js';
import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';
import { __wp_resolveInteriorHoverTarget } from './canvas_picking_local_helpers.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import {
  hideLayoutPreview,
  hideSketchPreview,
  readGridDivisions,
  readLayoutType,
  readNumber,
} from './canvas_picking_interior_hover_shared.js';
import { buildLayoutPreviewPayload } from './canvas_picking_interior_hover_layout_family_shared.js';

export function tryHandleCanvasPresetLayoutHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    hideLayoutPreview: hideLayoutPreviewFn,
    hideSketchPreview: hideSketchPreviewFn,
    setLayoutPreview,
  } = args;
  try {
    hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !setLayoutPreview) {
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }

    const layoutType = readLayoutType(App);
    const ops = computeInteriorPresetOps(layoutType);
    const divisions = readGridDivisions(
      CARCASS_SHELL_DIMENSIONS.drawerGridDivisions,
      CARCASS_SHELL_DIMENSIONS.drawerGridDivisions
    );
    const step =
      divisions > 0 ? target.spanH / divisions : target.spanH / CARCASS_SHELL_DIMENSIONS.drawerGridDivisions;

    const shelfYs = Array.isArray(ops.shelves)
      ? ops.shelves
          .map(v => Number(v))
          .filter(v => Number.isFinite(v) && v >= 1 && v < divisions)
          .map(v => target.bottomY + v * step)
      : [];
    const rodYs = Array.isArray(ops.rods)
      ? ops.rods
          .map(r => {
            const yFactor = readNumber(r?.yFactor);
            const yAdd = readNumber(r?.yAdd) ?? 0;
            return yFactor != null ? target.bottomY + yFactor * step + yAdd : NaN;
          })
          .filter(v => Number.isFinite(v))
      : [];
    const barrierH = readNumber(ops.storageBarrier?.barrierH) ?? 0;
    const storageBarrier =
      barrierH > 0
        ? {
            y: target.bottomY + barrierH / 2,
            h: barrierH,
            z: target.internalZ + target.internalDepth / 2 - 0.06,
          }
        : null;

    setLayoutPreview(buildLayoutPreviewPayload({ App, target, shelfYs, rodYs, storageBarrier }));
    return true;
  } catch {
    return false;
  }
}
