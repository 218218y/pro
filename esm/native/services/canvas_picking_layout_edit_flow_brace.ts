import { getInternalGridMap } from '../runtime/cache_access.js';
import { hasShelfAtIndex } from './canvas_picking_interior_hover_layout_family_shared.js';
import {
  readShelfShortcutVariant,
  readFreshShelfShortcutAddition,
  resolveShelfShortcutAddition,
  addShortcutShelf,
} from './canvas_picking_shelf_shortcuts.js';
import {
  resolveSelectorInternalMetrics,
  readSelectorEnvelopeFromObject,
} from './canvas_picking_selector_internal_metrics.js';
import {
  removeManualLayoutBaseShelf,
  toggleManualLayoutShelf,
} from './canvas_picking_manual_layout_config_ops.js';
import {
  resolveShelfBoardPick,
  resolveShelfPickVerticalToleranceM,
  resolveShelfSelectorPickToleranceM,
} from './canvas_picking_shelf_hit_targets.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import {
  __wp_clearSketchHover,
  __wp_readSketchHover,
  __wp_projectWorldPointToLocal,
} from './canvas_picking_local_helpers.js';
import { firstRenderableHitIsSketchFreeBox } from './canvas_picking_sketch_free_box_hit_policy.js';
import { createCanvasPickingConfigStructuralPatchMeta } from './canvas_picking_config_patch_meta.js';
import {
  type CanvasLayoutEditClickArgs,
  ensureBraceShelves,
  asRecord,
  readGridInfo,
  readHitPointY,
} from './canvas_picking_layout_edit_flow_shared.js';
import {
  addBraceShelfIndex,
  removeBraceShelfIndex,
} from './canvas_picking_manual_layout_config_ops_shared.js';
import { tryCommitBraceShelvesFreeBoxFromHover } from './canvas_picking_manual_layout_free_box_content.js';
import {
  isFreshBraceSketchShelfHover,
  resolveBraceSketchShelfMatch,
  toggleBraceSketchShelfAtIndex,
} from './canvas_picking_brace_shelves_sketch_extras.js';

export function tryHandleCanvasBraceShelvesClick(args: CanvasLayoutEditClickArgs): boolean {
  const {
    App,
    foundModuleIndex,
    __isBottomStack,
    __isBraceShelvesMode,
    moduleHitY,
    intersects,
    __patchConfigForKey,
    __getActiveConfigRef,
  } = args;

  if (!__isBraceShelvesMode) return false;
  const targetVariant = readShelfShortcutVariant(App);
  if (tryCommitBraceShelvesFreeBoxFromHover(App)) return true;
  if (firstRenderableHitIsSketchFreeBox(intersects)) {
    __wp_clearSketchHover(App);
    return true;
  }
  if (foundModuleIndex === null) return false;

  (() => {
    const configRef = __getActiveConfigRef();
    if (!configRef) return;

    const mapKey = foundModuleIndex;
    const internalGridMap = getInternalGridMap(App, __isBottomStack);
    const info = readGridInfo(internalGridMap, mapKey);
    if (!info) return;

    const topY = typeof info.effectiveTopY === 'number' ? info.effectiveTopY : null;
    const bottomY = typeof info.effectiveBottomY === 'number' ? info.effectiveBottomY : null;
    const divisions = typeof info.gridDivisions === 'number' ? info.gridDivisions : 6;
    if (typeof topY !== 'number' || typeof bottomY !== 'number' || divisions <= 1) return;

    const sketchHover = __wp_readSketchHover(App);
    const freshSketchHover = isFreshBraceSketchShelfHover({
      hover: sketchHover,
      moduleKey: mapKey,
      isBottom: __isBottomStack,
      now: Date.now(),
      targetVariant,
    })
      ? asRecord(sketchHover)
      : null;
    if (freshSketchHover) {
      const removeIdx =
        typeof freshSketchHover.removeIdx === 'number' && Number.isFinite(freshSketchHover.removeIdx)
          ? freshSketchHover.removeIdx
          : null;
      if (removeIdx == null) return;
      const committed = __patchConfigForKey(
        mapKey,
        cfg => {
          toggleBraceSketchShelfAtIndex(cfg, removeIdx, targetVariant);
        },
        createCanvasPickingConfigStructuralPatchMeta('braceShelves.sketchExtraToggle')
      );
      if (committed !== false) __wp_clearSketchHover(App);
      return;
    }

    const directSketchShelfMatch = resolveBraceSketchShelfMatch({
      cfgRef: configRef,
      intersects,
      selectorHitY: moduleHitY !== null ? moduleHitY : readHitPointY(intersects[0]),
      bottomY,
      topY,
      toleranceM: resolveShelfPickVerticalToleranceM(
        typeof info.woodThick === 'number' ? info.woodThick : 0.017,
        2.75
      ),
    });
    if (directSketchShelfMatch) {
      const committed = __patchConfigForKey(
        mapKey,
        cfg => {
          toggleBraceSketchShelfAtIndex(cfg, directSketchShelfMatch.index, targetVariant);
        },
        createCanvasPickingConfigStructuralPatchMeta('braceShelves.sketchExtraToggle')
      );
      if (committed !== false) __wp_clearSketchHover(App);
      return;
    }

    const firstHitY = readHitPointY(intersects[0]);
    const totalHeight = topY - bottomY;
    const safeStep = totalHeight / divisions;
    if (!Number.isFinite(safeStep) || safeStep <= 0) return;

    const shelfPick = resolveShelfBoardPick({
      intersects,
      selectorHitY: moduleHitY !== null ? moduleHitY : firstHitY,
      bottomY,
      topY,
      divisions,
      boardToleranceM: resolveShelfPickVerticalToleranceM(safeStep, 0.18),
      selectorHitToleranceM: resolveShelfSelectorPickToleranceM(safeStep),
    });
    const shelfIndex = shelfPick?.shelfIndex ?? -1;

    const shelfExists = shelfPick !== null && hasShelfAtIndex(configRef, shelfIndex);

    if (!shelfExists) {
      const selectorHit = intersects.find(hit => {
        const data = asRecord(hit.object?.userData);
        return data?.isModuleSelector === true && String(data.moduleIndex) === String(mapKey);
      });
      const selector = selectorHit?.object;
      const point = selectorHit?.point
        ? __wp_projectWorldPointToLocal(App, selectorHit.point, selector?.parent)
        : null;
      const metrics = resolveSelectorInternalMetrics({
        info,
        selectorEnvelope: readSelectorEnvelopeFromObject(selector),
      });
      const addition =
        readFreshShelfShortcutAddition(sketchHover, mapKey, __isBottomStack, targetVariant) ??
        resolveShelfShortcutAddition({
          config: configRef,
          bottomY,
          topY,
          pointerY: moduleHitY ?? firstHitY ?? NaN,
          pointerX: typeof point?.x === 'number' ? point.x : metrics.internalCenterX,
          ...metrics,
        });
      if (!addition || addition.blocked) return;
      const result = __patchConfigForKey(
        mapKey,
        cfg => {
          addShortcutShelf(cfg, addition, targetVariant);
        },
        createCanvasPickingConfigStructuralPatchMeta('shelfShortcut.add')
      );
      if (result !== false) __wp_clearSketchHover(App);
      return;
    }

    if (targetVariant === 'regular') {
      __patchConfigForKey(
        mapKey,
        cfg => {
          const custom = asRecord(cfg.customData);
          const variants = Array.isArray(custom?.shelfVariants) ? custom.shelfVariants : [];
          const braces = Array.isArray(cfg.braceShelves) ? cfg.braceShelves : [];
          const isBrace =
            braces.includes(shelfIndex) ||
            variants[shelfIndex - 1] === 'brace' ||
            variants[shelfIndex - 1] === 'winter_brace';
          const grid = { divs: divisions, topY, bottomY, shelfIndex };
          if (isBrace)
            toggleManualLayoutShelf(cfg, {
              ...grid,
              arrayIdx: shelfIndex - 1,
              shelfVariant: 'regular',
              reset: false,
            });
          else removeManualLayoutBaseShelf(cfg, grid);
        },
        createCanvasPickingConfigStructuralPatchMeta('shelfShortcut.regular')
      );
      return;
    }

    __patchConfigForKey(
      mapKey,
      cfg => {
        const list = ensureBraceShelves(cfg);
        const customData = asRecord(cfg.customData);
        const shelfVariants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : null;
        const arrayIdx = shelfIndex - 1;
        const savedVariant =
          shelfVariants && typeof shelfVariants[arrayIdx] === 'string' ? String(shelfVariants[arrayIdx]) : '';
        const isBrace =
          list.includes(shelfIndex) || savedVariant === 'brace' || savedVariant === 'winter_brace';

        if (isBrace) {
          removeBraceShelfIndex(list, shelfIndex);
          if (shelfVariants && (savedVariant === 'brace' || savedVariant === 'winter_brace'))
            shelfVariants[arrayIdx] = '';
        } else {
          addBraceShelfIndex(list, shelfIndex);
        }
        try {
          list.sort((a, b) => a - b);
        } catch (err) {
          __wp_reportPickingIssue(App, err, {
            where: 'canvasPicking',
            op: 'braceShelves.toggle.sort',
            throttleMs: 1000,
          });
        }
      },
      createCanvasPickingConfigStructuralPatchMeta('braceShelves.toggle')
    );
  })();

  return true;
}
