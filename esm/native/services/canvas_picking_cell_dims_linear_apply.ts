import type { UnknownRecord } from '../../../types';
import type {
  EnsureOwnLinearModule,
  LinearCellDimsContext,
  ModuleShape,
} from './canvas_picking_cell_dims_linear_shared.js';

import { requestBuilderStructuralRefresh } from '../runtime/builder_service_access.js';
import { patchUiSoft } from '../runtime/ui_write_access.js';
import { applyCellDimsConfigSnapshot } from './canvas_picking_config_actions.js';
import { __wp_reportPickingIssue, __wp_commitHistoryTouch, __asInt } from './canvas_picking_core_helpers.js';
import { sanitizeModulesConfigurationListLight } from '../features/modules_configuration/modules_config_api.js';
import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
} from '../features/special_dims/index.js';
import {
  asModuleShape,
  cloneModuleRecord,
  createHistoryableNoBuildMeta,
  readSpecialDimsRecord,
  readToastFn,
} from './canvas_picking_cell_dims_linear_shared.js';
import { applyLinearCellDimsWidthPolicy } from './canvas_picking_cell_dims_linear_width.js';
import { promoteUniformLinearCellDim } from './canvas_picking_cell_dims_linear_normalize.js';

function buildMutableModules(ctx: LinearCellDimsContext): {
  nextModsCfg: UnknownRecord[];
  ensureOwnModule: EnsureOwnLinearModule;
} {
  const prevModsList: unknown[] = Array.isArray(ctx.prevModsCfg) ? ctx.prevModsCfg : [];
  let hasBadEntry = false;
  for (let i = 0; i < ctx.moduleCount; i++) {
    const value = prevModsList[i];
    if (!(value && typeof value === 'object' && !Array.isArray(value))) {
      hasBadEntry = true;
      break;
    }
  }

  const nextModsCfg: UnknownRecord[] = (
    hasBadEntry
      ? sanitizeModulesConfigurationListLight('modulesConfiguration', prevModsList, prevModsList)
      : prevModsList.slice(0, ctx.moduleCount)
  ).map(item => cloneModuleRecord(item));
  while (nextModsCfg.length < ctx.moduleCount) nextModsCfg.push({});

  const ensureOwnModule = (i: number): ModuleShape => {
    const out = cloneModuleRecord(nextModsCfg[i]);
    nextModsCfg[i] = out;
    return out;
  };

  for (let i = 0; i < ctx.moduleCount; i++) {
    const cur = asModuleShape(nextModsCfg[i]);
    const wantDoors = ctx.doorsPerModule[i];
    const curDoors = __asInt(cur.doors, wantDoors);
    if (curDoors !== wantDoors) ensureOwnModule(i).doors = wantDoors;
  }

  return { nextModsCfg, ensureOwnModule };
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

export function applyCanvasLinearCellDimsContext(ctx: LinearCellDimsContext): void {
  const { App } = ctx;
  const { nextModsCfg, ensureOwnModule } = buildMutableModules(ctx);
  applySelectedLinearOverrides(ctx, ensureOwnModule);

  const { setManualWidth, unsetManualWidth, nextTotalW } = applyLinearCellDimsWidthPolicy(
    ctx,
    nextModsCfg,
    ensureOwnModule
  );
  const heightPromotion = promoteUniformLinearCellDim(ctx, nextModsCfg, ensureOwnModule, 'height');
  const depthPromotion = promoteUniformLinearCellDim(ctx, nextModsCfg, ensureOwnModule, 'depth');

  const widthChanged =
    ctx.applyW != null &&
    Number.isFinite(nextTotalW) &&
    nextTotalW > 0 &&
    Math.abs(nextTotalW - ctx.totalW) > 1e-6;
  const heightChanged =
    heightPromotion.promoted &&
    Number.isFinite(heightPromotion.nextTotal) &&
    heightPromotion.nextTotal > 0 &&
    Math.abs(heightPromotion.nextTotal - ctx.totalH) > 1e-6;
  const depthChanged =
    depthPromotion.promoted &&
    Number.isFinite(depthPromotion.nextTotal) &&
    depthPromotion.nextTotal > 0 &&
    Math.abs(depthPromotion.nextTotal - ctx.totalD) > 1e-6;

  try {
    const metaCfg = createHistoryableNoBuildMeta(App, 'cellDims.apply');
    applyCellDimsConfigSnapshot({
      App,
      modulesConfiguration: nextModsCfg,
      manualWidth: setManualWidth ? true : unsetManualWidth ? false : undefined,
      width: widthChanged ? nextTotalW : undefined,
      height: heightChanged ? heightPromotion.nextTotal : undefined,
      depth: depthChanged ? depthPromotion.nextTotal : undefined,
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

  if (widthChanged || heightChanged || depthChanged) {
    try {
      const rawPatch: UnknownRecord = {};
      if (widthChanged) rawPatch.width = nextTotalW;
      if (heightChanged) rawPatch.height = heightPromotion.nextTotal;
      if (depthChanged) rawPatch.depth = depthPromotion.nextTotal;
      patchUiSoft(App, { raw: rawPatch }, createHistoryableNoBuildMeta(App, 'cellDims.apply'));
    } catch (err) {
      __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.syncUiRaw' });
    }
  }

  __wp_commitHistoryTouch(App, 'cellDims.apply');

  try {
    requestBuilderStructuralRefresh(App, {
      source: 'cellDims.apply',
      immediate: true,
      force: true,
      triggerRender: true,
      updateShadows: false,
    });
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.refresh' }, { failFast: true });
  }

  try {
    const fn = readToastFn(App);
    const msg = ctx.didToggleBack ? `תא ${ctx.idx + 1} חזר למידות רגילות` : `הוחל על תא ${ctx.idx + 1}`;
    if (typeof fn === 'function') fn(msg, true);
  } catch (err) {
    __wp_reportPickingIssue(App, err, { where: 'canvasPicking', op: 'cellDims.feedbackToast' });
  }
}
