import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_resolveInteriorHoverTarget } from './canvas_picking_local_helpers.js';
import { resolveShelfBoardPick } from './canvas_picking_shelf_hit_targets.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import {
  getSketchPreviewFns,
  hideLayoutPreview,
  hideSketchPreview,
  readBraceShelves,
  readCustomData,
  readGridDivisions,
  readHoverModuleConfig,
  setPreview,
} from './canvas_picking_interior_hover_shared.js';
import {
  hasShelfAtIndex,
  readExistingShelfVariant,
} from './canvas_picking_interior_hover_layout_family_shared.js';

export function tryHandleCanvasBraceShelvesHover(args: CanvasInteriorHoverFlowArgs): boolean {
  const {
    App,
    ndcX,
    ndcY,
    raycaster,
    mouse,
    previewRo,
    hideLayoutPreview: hideLayoutPreviewFn,
    hideSketchPreview: hideSketchPreviewFn,
  } = args;
  try {
    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    const { setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    if (!target || !setSketchPreview) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }
    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });

    const cfgRef = readHoverModuleConfig(App, target.hitModuleKey, target.isBottom);
    if (!cfgRef) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const divisions = readGridDivisions(target.info.gridDivisions);
    if (divisions <= 1) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const step = target.spanH / divisions;
    const shelfPick = resolveShelfBoardPick({
      intersects: target.intersects,
      selectorHitY: target.hitY,
      bottomY: target.bottomY,
      topY: target.topY,
      divisions,
      boardToleranceM: Math.max(0.035, target.woodThick * 2),
      selectorHitToleranceM: Math.min(0.03, Math.max(0.018, step * 0.12)),
    });
    if (!shelfPick) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const { shelfIndex, shelfY } = shelfPick;
    if (!hasShelfAtIndex(cfgRef, shelfIndex)) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const braceList = readBraceShelves(cfgRef);
    const customData = readCustomData(cfgRef);
    const shelfVariants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : [];
    const isBrace = readExistingShelfVariant({ braceList, shelfIndex, shelfVariants }) === 'brace';
    return setPreview(setSketchPreview, {
      App,
      THREE: getThreeMaybe(App),
      anchor: target.hitSelectorObj,
      kind: 'shelf',
      variant: 'brace',
      x: target.internalCenterX,
      y: shelfY,
      z: target.backZ + target.internalDepth / 2,
      w: target.innerW > 0 ? Math.max(0, target.innerW - 0.002) : target.innerW,
      h: target.woodThick,
      d: target.internalDepth,
      woodThick: target.woodThick,
      op: isBrace ? 'remove' : 'add',
    });
  } catch {
    return false;
  }
}
