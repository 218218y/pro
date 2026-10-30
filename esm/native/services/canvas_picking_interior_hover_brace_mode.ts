import { getThreeMaybe } from '../runtime/three_access.js';
import {
  readShelfShortcutVariant,
  resolveShelfShortcutAddition,
  createShelfShortcutAddHover,
} from './canvas_picking_shelf_shortcuts.js';
import { createSketchModuleShelfPreviewGeometry } from './canvas_picking_sketch_module_vertical_content.js';
import {
  __wp_clearSketchHover,
  __wp_resolveInteriorHoverTarget,
  __wp_writeSketchHover,
  __wp_projectWorldPointToLocal,
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
  readNumber,
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
    const targetVariant = readShelfShortcutVariant(App);
    const { setPreview: setSketchPreview } = getSketchPreviewFns(previewRo);
    if (
      tryHandleBraceShelvesFreeBoxHover({
        App,
        targetVariant,
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
        targetVariant,
      });
      __wp_writeSketchHover(App, hoverRecord);
      return setPreview(setSketchPreview, {
        App,
        THREE: getThreeMaybe(App),
        anchor: target.hitSelectorObj,
        ...createBraceSketchShelfPreview({
          match: sketchShelfMatch,
          targetVariant,
          internalCenterX: target.internalCenterX,
          innerW: target.innerW,
          internalDepth: target.internalDepth,
          braceFrontZ: readNumber(target.info.braceFrontZ),
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
    if (!shelfPick || !hasShelfAtIndex(cfgRef, shelfPick.shelfIndex)) {
      const hit = target.intersects.find(h => h.object === target.hitSelectorObj);
      const point = hit?.point
        ? __wp_projectWorldPointToLocal(App, hit.point, target.hitSelectorObj?.parent)
        : null;
      const addition = resolveShelfShortcutAddition({
        config: cfgRef,
        ...target,
        pointerY: target.hitY,
        pointerX: typeof point?.x === 'number' ? point.x : target.internalCenterX,
      });
      if (!addition) {
        hideSketchPreview({ App, hideSketchPreview: hideSketchPreviewFn });
        return false;
      }
      __wp_writeSketchHover(
        App,
        createShelfShortcutAddHover(addition, target.hitModuleKey, target.isBottom, targetVariant)
      );
      const geometry = createSketchModuleShelfPreviewGeometry({
        innerW: addition.width,
        internalDepth: target.internalDepth,
        braceFrontZ: readNumber(target.info.braceFrontZ),
        backZ: target.backZ,
        woodThick: target.woodThick,
        regularDepth: target.regularDepth,
        variant: targetVariant,
      });
      return setPreview(setSketchPreview, {
        App,
        THREE: getThreeMaybe(App),
        anchor: target.hitSelectorObj,
        kind: 'shelf',
        x: addition.centerX,
        y: addition.y,
        ...geometry,
        woodThick: target.woodThick,
        op: addition.blocked ? 'blocked' : 'add',
      });
    }

    const { shelfIndex, shelfY } = shelfPick;

    const braceList = readBraceShelves(cfgRef);
    const customData = readCustomData(cfgRef);
    const shelfVariants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : [];
    const variant = readExistingShelfVariant({ braceList, shelfIndex, shelfVariants });
    const isBrace = variant === 'brace' || variant === 'winter_brace';
    const nextVariant = targetVariant === 'regular' || isBrace ? 'regular' : 'brace';
    const geometry = createSketchModuleShelfPreviewGeometry({
      innerW: target.innerW,
      internalDepth: target.internalDepth,
      braceFrontZ: readNumber(target.info.braceFrontZ),
      backZ: target.backZ,
      woodThick: target.woodThick,
      regularDepth: target.regularDepth,
      variant: nextVariant,
    });
    return setPreview(setSketchPreview, {
      App,
      THREE: getThreeMaybe(App),
      anchor: target.hitSelectorObj,
      kind: 'shelf',
      x: target.internalCenterX,
      y: shelfY,
      ...geometry,
      woodThick: target.woodThick,
      op: targetVariant === 'regular' ? (isBrace ? 'add' : 'remove') : isBrace ? 'remove' : 'add',
    });
  } catch {
    return false;
  }
}
