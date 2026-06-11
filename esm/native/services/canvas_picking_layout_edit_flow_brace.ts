import { getInternalGridMap } from '../runtime/cache_access.js';
import { __wp_reportPickingIssue } from './canvas_picking_core_helpers.js';
import {
  type CanvasLayoutEditClickArgs,
  ensureBraceShelves,
  asRecord,
  readGridInfo,
  readHitPointY,
  readSelectorUserData,
} from './canvas_picking_layout_edit_flow_shared.js';

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

    const shelfBoardHit = intersects.find(h => {
      const o = h && h.object ? h.object : null;
      const obj = asRecord(o);
      const ud = readSelectorUserData(obj?.userData);
      if (!ud) return false;
      if (ud.__kind === 'shelf_pin' || ud.__kind === 'brace_seam') return false;
      return ud.partId === 'all_shelves' || ud.partId === 'corner_shelves';
    });
    const shelfHitY =
      shelfBoardHit && typeof shelfBoardHit.point?.y === 'number' ? shelfBoardHit.point.y : null;
    const firstHitY = readHitPointY(intersects[0]);
    const hitY = typeof shelfHitY === 'number' ? shelfHitY : moduleHitY !== null ? moduleHitY : firstHitY;
    const clickedOnShelf = typeof shelfHitY === 'number';
    if (typeof hitY !== 'number') return;

    const totalHeight = topY - bottomY;
    const safeStep = totalHeight / divisions;
    if (!Number.isFinite(safeStep) || safeStep <= 0) return;

    const relativeY = hitY - bottomY;
    let shelfIndex = Math.round(relativeY / safeStep);
    if (shelfIndex < 1) shelfIndex = 1;
    if (shelfIndex > divisions - 1) shelfIndex = divisions - 1;

    const shelfY = bottomY + shelfIndex * safeStep;
    const maxDelta = clickedOnShelf ? 0.03 : safeStep * 0.3;
    if (Math.abs(hitY - shelfY) > maxDelta) return;

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
        const idx = list.indexOf(shelfIndex);
        if (idx >= 0) list.splice(idx, 1);
        else list.push(shelfIndex);
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
