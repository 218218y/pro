import { getThreeMaybe } from '../runtime/three_access.js';
import { __wp_resolveInteriorHoverTarget } from './canvas_picking_local_helpers.js';
import type { CanvasInteriorHoverFlowArgs } from './canvas_picking_interior_hover_shared.js';
import {
  getSketchPreviewFns,
  hideLayoutPreview,
  hideSketchPreview,
  readBraceShelves,
  readGridDivisions,
  readHoverModuleConfig,
  setPreview,
} from './canvas_picking_interior_hover_shared.js';
import { hasShelfAtIndex } from './canvas_picking_interior_hover_layout_family_shared.js';

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
    let shelfIndex = Math.round((target.hitY - target.bottomY) / step);
    if (shelfIndex < 1) shelfIndex = 1;
    if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;
    const shelfY = target.bottomY + shelfIndex * step;
    const maxDelta = Math.min(0.03, Math.max(0.018, step * 0.12));
    if (Math.abs(target.hitY - shelfY) > maxDelta) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    if (!hasShelfAtIndex(cfgRef, shelfIndex)) {
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const braceList = readBraceShelves(cfgRef);
    const isBrace = braceList.some(v => Number(v) === shelfIndex);
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
