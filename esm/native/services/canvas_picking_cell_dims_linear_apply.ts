import type { UnknownRecord } from '../../../types';
import type {
  EnsureOwnLinearModule,
  LinearCellDimsContext,
} from './canvas_picking_cell_dims_linear_shared.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { applyCellDimsConfigSnapshot } from './canvas_picking_config_actions.js';
import { __wp_reportPickingIssue, __wp_commitHistoryTouch } from './canvas_picking_core_helpers.js';
import { requestCanvasPickingCommitStructuralRefresh } from './canvas_picking_structural_refresh.js';
import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
} from '../features/special_dims/index.js';
import { readSpecialDimsRecord, readToastFn } from './canvas_picking_cell_dims_linear_shared.js';
import { createCanvasPickingCellDimsRefreshGatedMeta } from './canvas_picking_cell_dims_meta.js';
import { buildMutableLinearModules } from './canvas_picking_cell_dims_linear_mutable.js';
import { applyLinearCellDimsWidthPolicy } from './canvas_picking_cell_dims_linear_width.js';
import { promoteUniformLinearCellDim } from './canvas_picking_cell_dims_linear_normalize.js';

export type LinearCellDimsSelectedModuleMutationResult = {
  toastMessage?: string;
};

export type LinearCellDimsApplyOptions = {
  source?: string;
  /**
   * Hex-cell updates are additive geometry updates. Re-applying them while the
   * width/height/depth draft matches the current special dimension must keep the
   * existing override instead of using the normal "click same value to remove"
   * cell-dims behavior.
   */
  disableToggleBack?: boolean;
  skipDimensionMutations?: boolean;
  mutateSelectedModule?: (
    ctx: LinearCellDimsContext,
    ensureOwnModule: EnsureOwnLinearModule
  ) => LinearCellDimsSelectedModuleMutationResult | void;
};

function withoutLinearToggleBack(ctx: LinearCellDimsContext): LinearCellDimsContext {
  return {
    ...ctx,
    tgtW: ctx.applyW != null ? ctx.applyW : ctx.widthsCurr[ctx.idx],
    tgtH: ctx.applyH != null ? ctx.applyH : ctx.heightsCurr[ctx.idx],
    tgtD: ctx.applyD != null ? ctx.applyD : ctx.depthsCurr[ctx.idx],
    didToggleBack: false,
    toggledBackW: false,
    toggledBackH: false,
    toggledBackD: false,
  };
}

function applySelectedLinearOverrides(
  ctx: LinearCellDimsContext,
  ensureOwnModule: EnsureOwnLinearModule
): void {
  if ((ctx.applyH == null && ctx.applyD == null) || ctx.idx < 0 || ctx.idx >= ctx.moduleCount) return;

  const next = ensureOwnModule(ctx.idx);
  const sd = cloneSpecialDims(readSpecialDimsRecord(next));

  if (ctx.applyH != null) {
    applyOverrideToSpecialDims({
      sd,
      key: 'heightCm',
      baseKey: 'baseHeightCm',
      baseValueCm: ctx.baseH[ctx.idx],
      targetValueCm: ctx.tgtH,
      toggledBack: ctx.toggledBackH,
    });
  }

  if (ctx.applyD != null) {
    applyOverrideToSpecialDims({
      sd,
      key: 'depthCm',
      baseKey: 'baseDepthCm',
      baseValueCm: ctx.baseD[ctx.idx],
      targetValueCm: ctx.tgtD,
      toggledBack: ctx.toggledBackD,
    });
  }

  assignSpecialDimsToConfig(next, sd);
}

export function applyCanvasLinearCellDimsContextWithOptions(
  ctx: LinearCellDimsContext,
  options: LinearCellDimsApplyOptions = {}
): void {
  const source = options.source || 'cellDims.apply';
  const applyCtx = options.disableToggleBack ? withoutLinearToggleBack(ctx) : ctx;
  const { App } = applyCtx;
  const { nextModsCfg, ensureOwnModule } = buildMutableLinearModules(applyCtx);
  const skipDimensionMutations = options.skipDimensionMutations === true;
  if (!skipDimensionMutations) applySelectedLinearOverrides(applyCtx, ensureOwnModule);
  const mutationResult = options.mutateSelectedModule?.(applyCtx, ensureOwnModule);
  const extraMutation: LinearCellDimsSelectedModuleMutationResult | undefined =
    mutationResult && typeof mutationResult === 'object' ? mutationResult : undefined;

  const { setManualWidth, unsetManualWidth, nextTotalW } = skipDimensionMutations
    ? { setManualWidth: false, unsetManualWidth: false, nextTotalW: applyCtx.totalW }
    : applyLinearCellDimsWidthPolicy(applyCtx, nextModsCfg, ensureOwnModule);
  const heightPromotion = skipDimensionMutations
    ? { nextTotal: applyCtx.totalH, promoted: false }
    : applyCtx.isBottomStack
      ? { nextTotal: applyCtx.totalH, promoted: false }
      : promoteUniformLinearCellDim(applyCtx, nextModsCfg, ensureOwnModule, 'height');
  const depthPromotion = skipDimensionMutations
    ? { nextTotal: applyCtx.totalD, promoted: false }
    : promoteUniformLinearCellDim(applyCtx, nextModsCfg, ensureOwnModule, 'depth');

  const widthChanged =
    applyCtx.applyW != null &&
    Number.isFinite(nextTotalW) &&
    nextTotalW > 0 &&
    Math.abs(nextTotalW - applyCtx.totalW) > 1e-6;
  const heightChanged =
    heightPromotion.promoted &&
    Number.isFinite(heightPromotion.nextTotal) &&
    heightPromotion.nextTotal > 0 &&
    Math.abs(heightPromotion.nextTotal - applyCtx.totalH) > 1e-6;
  const depthChanged =
    depthPromotion.promoted &&
    Number.isFinite(depthPromotion.nextTotal) &&
    depthPromotion.nextTotal > 0 &&
    Math.abs(depthPromotion.nextTotal - applyCtx.totalD) > 1e-6;

  try {
    const metaCfg = createCanvasPickingCellDimsRefreshGatedMeta(App, source);
    applyCellDimsConfigSnapshot({
      App,
      modulesConfiguration: nextModsCfg,
      modulesBucket: applyCtx.configBucket,
      manualWidth:
        !applyCtx.isBottomStack && (setManualWidth || unsetManualWidth)
          ? setManualWidth
            ? true
            : false
          : undefined,
      width: !applyCtx.isBottomStack && widthChanged ? nextTotalW : undefined,
      height: !applyCtx.isBottomStack && heightChanged ? heightPromotion.nextTotal : undefined,
      depth: !applyCtx.isBottomStack && depthChanged ? depthPromotion.nextTotal : undefined,
      meta: metaCfg,
    });
  } catch (err) {
    __wp_reportPickingIssue(
      App,
      err,
      { where: 'canvasPicking', op: 'cellDims.applyConfigPatch' },
      { failFast: true }
    );
  }

  if (
    widthChanged ||
    heightChanged ||
    depthChanged ||
    (applyCtx.isBottomStack && (setManualWidth || unsetManualWidth))
  ) {
    try {
      const rawPatch: UnknownRecord = {};
      if (applyCtx.isBottomStack) {
        if (widthChanged) rawPatch.stackSplitLowerWidth = nextTotalW;
        if (widthChanged || setManualWidth || unsetManualWidth) {
          rawPatch.stackSplitLowerWidthManual = setManualWidth ? true : unsetManualWidth ? false : true;
        }
        if (depthChanged) {
          rawPatch.stackSplitLowerDepth = depthPromotion.nextTotal;
          rawPatch.stackSplitLowerDepthManual = true;
        }
      } else {
        if (widthChanged) rawPatch.width = nextTotalW;
        if (heightChanged) rawPatch.height = heightPromotion.nextTotal;
        if (depthChanged) rawPatch.depth = depthPromotion.nextTotal;
      }
      if (Object.keys(rawPatch).length) {
        patchUiSoft(App, { raw: rawPatch }, createCanvasPickingCellDimsRefreshGatedMeta(App, source));
      }
    } catch (err) {
      __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.syncUiRaw' });
    }
  }

  if (source === 'cellDims.apply') __wp_commitHistoryTouch(App, 'cellDims.apply');
  else __wp_commitHistoryTouch(App, source);

  try {
    requestCanvasPickingCommitStructuralRefresh(App, source);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.refresh' }, { failFast: true });
  }

  try {
    const fn = readToastFn(App);
    const msg =
      extraMutation?.toastMessage ||
      (applyCtx.didToggleBack
        ? `תא ${applyCtx.idx + 1} חזר למידות רגילות`
        : `הוחל על תא ${applyCtx.idx + 1}`);
    if (typeof fn === 'function') fn(msg, true);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.feedbackToast' });
  }
}

export function applyCanvasLinearCellDimsContext(ctx: LinearCellDimsContext): void {
  applyCanvasLinearCellDimsContextWithOptions(ctx);
}
