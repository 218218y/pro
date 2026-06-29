// Canvas picking cell-dim click handling.
//
// Extracted from canvas_picking_click_flow.ts to keep the click owner focused on
// routing while preserving the canonical cell-dims click behavior in one helper.

import type { UnknownRecord } from '../../../types';
import type { CanvasCellDimsClickArgs } from './canvas_picking_cell_dims_contracts.js';

import { handleCanvasCornerCellDimsClick } from './canvas_picking_cell_dims_corner.js';
import { handleCanvasLinearCellDimsClick } from './canvas_picking_cell_dims_linear.js';
import { handleCanvasLinearHexCellClick } from './canvas_picking_cell_dims_hex_linear.js';
import { handleCanvasCornerHexCellClick } from './canvas_picking_cell_dims_hex_corner.js';
import { tryHandleCanvasFreeBoxCellDimsClick } from './canvas_picking_cell_dims_free_box.js';
import {
  __wp_reportPickingIssue,
  __wp_isCornerKey,
  __asNum,
  __wp_ui,
  __wp_cfg,
  __wp_toast,
  __wp_toModuleKey,
} from './canvas_picking_core_helpers.js';
import { asRecord } from '../runtime/record.js';
import { rememberCellDimsPostClickHoverTarget } from './canvas_picking_cell_dims_post_click_hover.js';
import { readCellDimsFreeBoxIdFromPartId } from './canvas_picking_cell_dims_free_box_identity.js';

export type { CanvasCellDimsClickArgs } from './canvas_picking_cell_dims_contracts.js';

export function handleCanvasCellDimsClick(args: CanvasCellDimsClickArgs): void {
  const {
    App,
    foundModuleIndex,
    foundPartId,
    isBottomStack: __isBottomStack,
    ensureCornerCellConfigRef,
    ndcX,
    ndcY,
  } = args;

  try {
    const ui = __wp_ui(App);
    const cfg = __wp_cfg(App);
    const raw = asRecord<UnknownRecord>(ui?.raw) || {};

    const draftW = __asNum(raw.cellDimsWidth, NaN);
    const draftH = __asNum(raw.cellDimsHeight, NaN);
    const draftD = __asNum(raw.cellDimsDepth, NaN);
    const draftHexProtrusion = __asNum(raw.cellDimsHexProtrusion, NaN);
    const draftHexDoorWidth = __asNum(raw.cellDimsHexDoorWidth, NaN);
    const hexCellMode = raw.cellDimsHexMode === true;

    const applyW = Number.isFinite(draftW) && draftW > 0 ? draftW : null;
    const applyH = !__isBottomStack && Number.isFinite(draftH) && draftH > 0 ? draftH : null;
    const applyD = Number.isFinite(draftD) && draftD > 0 ? draftD : null;
    const hexCellProtrusionCm =
      Number.isFinite(draftHexProtrusion) && draftHexProtrusion >= 0 ? draftHexProtrusion : null;
    const hexCellDoorWidthCm =
      Number.isFinite(draftHexDoorWidth) && draftHexDoorWidth > 0 ? draftHexDoorWidth : null;
    if (!hexCellMode && !applyW && !applyH && !applyD) {
      if (__isBottomStack && Number.isFinite(draftH) && draftH > 0) {
        try {
          __wp_toast(App, 'בארון התחתון ניתן להחיל לפי תא רק רוחב או עומק', 'info');
        } catch (_e) {
          __wp_reportPickingIssue(App, _e, {
            where: 'canvasPicking',
            op: 'cellDims.bottomStack.heightToast',
            throttleMs: 1000,
          });
        }
      }
      return;
    }

    const freeBoxHoverIdRaw = args.hitUserData?.__wpSketchBoxId;
    const freeBoxHoverPartIdRaw = args.hitUserData?.partId ?? foundPartId;
    const isFreeBoxHoverHit =
      args.hitUserData?.__wpSketchFreePlacement === true ||
      (typeof freeBoxHoverPartIdRaw === 'string' && freeBoxHoverPartIdRaw.startsWith('sketch_box_free_'));
    const freeBoxHoverModuleKey = isFreeBoxHoverHit
      ? (args.hitUserData?.__wpSketchModuleKey ?? args.hitUserData?.moduleIndex ?? foundModuleIndex)
      : foundModuleIndex;
    const freeBoxHoverId =
      typeof freeBoxHoverIdRaw === 'string' && isFreeBoxHoverHit
        ? freeBoxHoverIdRaw
        : typeof freeBoxHoverPartIdRaw === 'string' && isFreeBoxHoverHit
          ? readCellDimsFreeBoxIdFromPartId(
              freeBoxHoverPartIdRaw,
              __wp_toModuleKey(freeBoxHoverModuleKey as never)
            )
          : null;
    rememberCellDimsPostClickHoverTarget({
      App,
      moduleKey: freeBoxHoverModuleKey,
      isBottom: __isBottomStack,
      ndcX,
      ndcY,
      freeBoxId: freeBoxHoverId,
    });

    const resolved = {
      App,
      isBottomStack: __isBottomStack,
      ui,
      cfg,
      raw,
      applyW,
      applyH,
      applyD,
      hexCellMode,
      hexCellProtrusionCm,
      hexCellDoorWidthCm,
    };

    if (
      tryHandleCanvasFreeBoxCellDimsClick({
        ...resolved,
        foundModuleIndex,
        foundPartId: typeof foundPartId === 'string' ? foundPartId : null,
        hitUserData: args.hitUserData || null,
      })
    ) {
      return;
    }

    if (__wp_isCornerKey(foundModuleIndex)) {
      if (hexCellMode) {
        handleCanvasCornerHexCellClick({
          ...resolved,
          foundModuleIndex,
          foundPartId,
          ensureCornerCellConfigRef,
        });
        return;
      }
      handleCanvasCornerCellDimsClick({
        ...resolved,
        foundModuleIndex,
        foundPartId,
        ensureCornerCellConfigRef,
      });
      return;
    }

    if (hexCellMode) {
      handleCanvasLinearHexCellClick({
        ...resolved,
        foundModuleIndex,
      });
      return;
    }

    handleCanvasLinearCellDimsClick({
      ...resolved,
      foundModuleIndex,
    });
  } catch (err) {
    __wp_reportPickingIssue(
      App,
      err,
      { where: 'canvasPicking', op: 'cellDims.apply', throttleMs: 500 },
      { failFast: true }
    );
  }
}
