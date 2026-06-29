import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';

import {
  assignHexCellToConfig,
  clearHexCellFromConfig,
  hasHexCellDraftConfigChange,
  moduleHasHexCell,
  resolveHexCellUpdateConfig,
  HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE,
  shouldBlockHexCellApplyOverDrawers,
} from '../features/hex_cell/index.js';
import { applyCanvasLinearCellDimsContextWithOptions } from './canvas_picking_cell_dims_linear_apply.js';
import { buildCanvasLinearCellDimsContext } from './canvas_picking_cell_dims_linear_context.js';
import { readCanonicalNumber } from './canvas_picking_cell_dims_linear_shared.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';

const EPS_CM = 1e-6;

function hasLinearHexCellDimensionChange(
  ctx: NonNullable<ReturnType<typeof buildCanvasLinearCellDimsContext>>
): boolean {
  const idx = ctx.idx;
  const applyH = ctx.isBottomStack ? null : ctx.applyH;
  return (
    (ctx.applyW != null && Math.abs(ctx.applyW - ctx.widthsCurr[idx]) > EPS_CM) ||
    (applyH != null && Math.abs(applyH - ctx.heightsCurr[idx]) > EPS_CM) ||
    (ctx.applyD != null && Math.abs(ctx.applyD - ctx.depthsCurr[idx]) > EPS_CM)
  );
}

function shouldRemoveLinearHexCell(
  ctx: NonNullable<ReturnType<typeof buildCanvasLinearCellDimsContext>>
): boolean {
  const current = ctx.prevModsCfg[ctx.idx];
  if (!moduleHasHexCell(current)) return false;

  const moduleWidthCm =
    ctx.applyW != null && Number.isFinite(ctx.applyW)
      ? ctx.applyW
      : (readCanonicalNumber(ctx.widthsCurr[ctx.idx]) ?? 0);

  return (
    !hasLinearHexCellDimensionChange(ctx) &&
    !hasHexCellDraftConfigChange({
      cfgMod: current,
      protrusionCm: ctx.hexCellProtrusionCm,
      doorWidthCm: ctx.hexCellDoorWidthCm,
      moduleWidthCm,
      toleranceCm: EPS_CM,
    })
  );
}

export function handleCanvasLinearHexCellClick(args: CanvasLinearCellDimsArgs): void {
  const ctx = buildCanvasLinearCellDimsContext(args);
  if (!ctx) return;

  const removeHexCell = shouldRemoveLinearHexCell(ctx);
  if (!removeHexCell && shouldBlockHexCellApplyOverDrawers(ctx.prevModsCfg[ctx.idx])) {
    __wp_toast(args.App, HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE, 'error');
    return;
  }

  applyCanvasLinearCellDimsContextWithOptions(ctx, {
    source: removeHexCell ? 'cellDims.hex.remove' : 'cellDims.hex.apply',
    disableToggleBack: true,
    skipDimensionMutations: removeHexCell,
    mutateSelectedModule: (linearCtx, ensureOwnModule) => {
      const next = ensureOwnModule(linearCtx.idx);
      if (removeHexCell) {
        clearHexCellFromConfig(next);
        return { toastMessage: `תא ${linearCtx.idx + 1} חזר לתא רגיל` };
      }

      const moduleWidthCm =
        linearCtx.applyW != null && Number.isFinite(linearCtx.applyW)
          ? linearCtx.applyW
          : (readCanonicalNumber(linearCtx.widthsCurr[linearCtx.idx]) ?? 0);

      assignHexCellToConfig(
        next,
        resolveHexCellUpdateConfig({
          cfgMod: linearCtx.prevModsCfg[linearCtx.idx],
          protrusionCm: linearCtx.hexCellProtrusionCm,
          doorWidthCm: linearCtx.hexCellDoorWidthCm,
          moduleWidthCm,
        })
      );

      return { toastMessage: `תא ${linearCtx.idx + 1} הוגדר כתא משושה` };
    },
  });
}
