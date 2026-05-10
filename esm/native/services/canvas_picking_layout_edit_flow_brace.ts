import { getInternalGridMap } from '../runtime/cache_access.js';
import { resolveShelfBoardPick } from './canvas_picking_shelf_hit_targets.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
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

  if (!__isBraceShelvesMode || foundModuleIndex === null) return false;

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
      boardToleranceM: Math.min(0.05, Math.max(0.035, safeStep * 0.12)),
      selectorHitToleranceM: safeStep * 0.3,
    });
    if (!shelfPick) return;

    const { shelfIndex } = shelfPick;

    const isCustom = !!(configRef && configRef.isCustom);
    let shelfExists = false;
    if (isCustom) {
      const cd = asRecord(configRef.customData) || {};
      const shelvesArr = Array.isArray(cd.shelves) ? cd.shelves : [];
      shelfExists = !!shelvesArr[shelfIndex - 1];
    } else {
      const lt = String(configRef.layout || 'shelves');
      switch (lt) {
        case 'shelves':
        case 'mixed':
          shelfExists = true;
          break;
        case 'hanging':
        case 'hanging_top2':
        case 'storage':
        case 'storage_shelf':
          shelfExists = shelfIndex === 4 || shelfIndex === 5;
          break;
        case 'hanging_split':
          shelfExists = shelfIndex === 1 || shelfIndex === 5;
          break;
        default:
          shelfExists = false;
      }
    }

    if (!shelfExists) return;

    __patchConfigForKey(
      mapKey,
      cfg => {
        const list = ensureBraceShelves(cfg);
        const customData = asRecord(cfg.customData);
        const shelfVariants = Array.isArray(customData?.shelfVariants) ? customData.shelfVariants : null;
        const arrayIdx = shelfIndex - 1;
        const savedVariant =
          shelfVariants && typeof shelfVariants[arrayIdx] === 'string' ? String(shelfVariants[arrayIdx]) : '';
        const isBrace = list.some(value => Number(value) === shelfIndex) || savedVariant === 'brace';

        if (isBrace) {
          removeBraceShelfIndex(list, shelfIndex);
          if (shelfVariants && savedVariant === 'brace') shelfVariants[arrayIdx] = '';
        } else {
          addBraceShelfIndex(list, shelfIndex);
        }
        try {
          list.sort((a, b) => Number(a) - Number(b));
        } catch (err) {
          __wp_reportPickingIssue(App, err, {
            where: 'canvasPicking',
            op: 'braceShelves.toggle.sort',
            throttleMs: 1000,
          });
        }
      },
      { source: 'braceShelves.toggle', immediate: true }
    );
  })();

  return true;
}
