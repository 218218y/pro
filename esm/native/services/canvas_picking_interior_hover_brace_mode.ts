import { getThreeMaybe } from '../runtime/three_access.js';
import {
  __wp_clearSketchHover,
  __wp_resolveInteriorHoverTarget,
  __wp_writeSketchHover,
} from './canvas_picking_local_helpers.js';
import {
  resolveShelfBoardPick,
  resolveShelfPickVerticalToleranceM,
  resolveShelfSelectorPickToleranceM,
} from './canvas_picking_shelf_hit_targets.js';
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
import { tryHandleBraceShelvesFreeBoxHover } from './canvas_picking_manual_layout_free_box_content.js';
import {
  createBraceSketchShelfHoverRecord,
  createBraceSketchShelfPreview,
  resolveBraceSketchShelfMatch,
} from './canvas_picking_brace_shelves_sketch_extras.js';

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
    const { setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    if (
      tryHandleBraceShelvesFreeBoxHover({
        App,
        ndcX,
        ndcY,
        raycaster,
        mouse,
        setSketchPreview,
        hideLayoutPreview: () => hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn }),
        hideSketchPreview: () => hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn }),
      })
    ) {
      return true;
    }
    const target = __wp_resolveInteriorHoverTarget(App, raycaster, mouse, ndcX, ndcY);
    if (!target || !setSketchPreview) {
      __wp_clearSketchHover(App);
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });
      return false;
    }
    hideLayoutPreview({ App, hideLayoutPreview: hideLayoutPreviewFn });

    const cfgRef = readHoverModuleConfig(App, target.hitModuleKey, target.isBottom);
    if (!cfgRef) {
      __wp_clearSketchHover(App);
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const sketchShelfMatch = resolveBraceSketchShelfMatch({
      cfgRef,
      intersects: target.intersects,
      selectorHitY: target.hitY,
      bottomY: target.bottomY,
      topY: target.topY,
      toleranceM: resolveShelfPickVerticalToleranceM(target.woodThick, 2.75),
    });
    if (sketchShelfMatch) {
      const hoverRecord = createBraceSketchShelfHoverRecord({
        moduleKey: target.hitModuleKey,
        isBottom: target.isBottom,
        match: sketchShelfMatch,
      });
      __wp_writeSketchHover(App, hoverRecord);
      return setPreview(setSketchPreview, {
        App,
        THREE: getThreeMaybe(App),
        anchor: target.hitSelectorObj,
        ...createBraceSketchShelfPreview({
          match: sketchShelfMatch,
          internalCenterX: target.internalCenterX,
          innerW: target.innerW,
          internalDepth: target.internalDepth,
          backZ: target.backZ,
          woodThick: target.woodThick,
          regularDepth: target.regularDepth,
        }),
      });
    }
    __wp_clearSketchHover(App);

    const divisions = readGridDivisions(target.info.gridDivisions);
    if (divisions <= 1) {
      __wp_clearSketchHover(App);
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
      boardToleranceM: resolveShelfPickVerticalToleranceM(target.woodThick, 2.75),
      selectorHitToleranceM: resolveShelfSelectorPickToleranceM(step),
    });
    if (!shelfPick) {
      __wp_clearSketchHover(App);
      hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
      return false;
    }

    const { shelfIndex, shelfY } = shelfPick;
    if (!hasShelfAtIndex(cfgRef, shelfIndex)) {
      __wp_clearSketchHover(App);
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
