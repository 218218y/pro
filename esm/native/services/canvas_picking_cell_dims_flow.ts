// Canvas picking cell-dim click handling.
//
// Extracted from canvas_picking_click_flow.ts to keep the click owner focused on
// routing while preserving the canonical cell-dims click behavior in one helper.

import type { UnknownRecord } from '../../../types';
import type { CanvasCellDimsClickArgs } from './canvas_picking_cell_dims_contracts.js';

import { handleCanvasCornerCellDimsClick } from './canvas_picking_cell_dims_corner.js';
import { handleCanvasLinearCellDimsClick } from './canvas_picking_cell_dims_linear.js';
import {
  __wp_reportPickingIssue,
  __wp_isCornerKey,
  __asNum,
  __wp_ui,
  __wp_cfg,
  __wp_toast,
} from './canvas_picking_core_helpers.js';
import { asRecord } from '../runtime/record.js';

export type { CanvasCellDimsClickArgs } from './canvas_picking_cell_dims_contracts.js';

export function handleCanvasCellDimsClick(args: CanvasCellDimsClickArgs): void {
  const {
    App,
    foundModuleIndex,
    foundPartId,
    isBottomStack: __isBottomStack,
    ensureCornerCellConfigRef,
  } = args;

  if (__isBottomStack) {
    try {
      __wp_toast(App, 'מידות מיוחדות לפי תא זמינות רק לארון העליון', 'info');
    } catch (_e) {
      __wp_reportPickingIssue(App, _e, {
        where: 'canvasPicking',
        op: 'cellDims.bottomStack.toast',
        throttleMs: 1000,
      });
    }
    return;
  }

  try {
    const ui = __wp_ui(App);
    const cfg = __wp_cfg(App);
    const raw = asRecord<UnknownRecord>(ui?.raw) || {};

    const draftW = __asNum(raw.cellDimsWidth, NaN);
    const draftH = __asNum(raw.cellDimsHeight, NaN);
    const draftD = __asNum(raw.cellDimsDepth, NaN);

    const applyW = Number.isFinite(draftW) && draftW > 0 ? draftW : null;
    const applyH = Number.isFinite(draftH) && draftH > 0 ? draftH : null;
    const applyD = Number.isFinite(draftD) && draftD > 0 ? draftD : null;
    if (!applyW && !applyH && !applyD) return;

    const resolved = {
      App,
      ui,
      cfg,
      raw,
      applyW,
      applyH,
      applyD,
    };

    if (__wp_isCornerKey(foundModuleIndex)) {
      handleCanvasCornerCellDimsClick({
        ...resolved,
        foundModuleIndex,
        foundPartId,
        ensureCornerCellConfigRef,
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
