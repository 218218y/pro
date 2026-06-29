import type { CanvasCornerCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';
import type { UnknownRecord } from '../../../types';

import {
  assignHexCellToConfig,
  clearHexCellFromConfig,
  hasHexCellDraftConfigChange,
  moduleHasHexCell,
  resolveHexCellUpdateConfig,
  HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE,
  shouldBlockHexCellApplyOverDrawers,
} from '../features/hex_cell/index.js';
import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
  getActiveOverrideCm,
} from '../features/special_dims/index.js';
import {
  buildCornerCellDimsContext,
  cloneRecord,
  commitCornerHistory,
  patchCornerConfigForStack,
  readCornerModules,
  readCornerSpecialDims,
  refreshCornerStructure,
  reportCornerDimsIssue,
  sanitizeCornerModulesForPatch,
  showCornerToast,
  syncCornerUi,
} from './canvas_picking_cell_dims_corner_shared.js';
import { createCornerCellConfigReader } from './canvas_picking_cell_dims_corner_cell_shared.js';
import { createCornerCellWidthDistribution } from './canvas_picking_cell_dims_corner_cell_width_distribution.js';
import { __wp_toast } from './canvas_picking_core_helpers.js';
import { readCanonicalPositiveNumberOr } from './canvas_picking_cell_dims_numbers.js';

const EPS_CM = 1e-6;

function hasCornerHexCellDimensionChange(args: {
  ctx: ReturnType<typeof buildCornerCellDimsContext>;
  currentWidthCm: number;
  currentHeightCm: number;
  currentDepthCm: number;
}): boolean {
  const applyH = args.ctx.isBottomStack ? null : args.ctx.applyH;
  return (
    (args.ctx.applyW != null && Math.abs(args.ctx.applyW - args.currentWidthCm) > EPS_CM) ||
    (applyH != null && Math.abs(applyH - args.currentHeightCm) > EPS_CM) ||
    (args.ctx.applyD != null && Math.abs(args.ctx.applyD - args.currentDepthCm) > EPS_CM)
  );
}

function readCornerCellCurrentHeightDepthCm(args: {
  ctx: ReturnType<typeof buildCornerCellDimsContext>;
  cell: UnknownRecord;
}): { heightCm: number; depthCm: number } {
  const sd = readCornerSpecialDims(args.cell);
  return {
    heightCm: getActiveOverrideCm(sd, 'heightCm', 'baseHeightCm') ?? args.ctx.curH,
    depthCm: getActiveOverrideCm(sd, 'depthCm', 'baseDepthCm') ?? args.ctx.curD,
  };
}

function shouldRemoveCornerHexCell(args: {
  ctx: ReturnType<typeof buildCornerCellDimsContext>;
  cell: UnknownRecord;
  currentWidthCm: number;
}): boolean {
  if (!moduleHasHexCell(args.cell)) return false;
  const currentDims = readCornerCellCurrentHeightDepthCm({ ctx: args.ctx, cell: args.cell });
  const moduleWidthCm =
    args.ctx.applyW != null && Number.isFinite(args.ctx.applyW) ? args.ctx.applyW : args.currentWidthCm;

  return (
    !hasCornerHexCellDimensionChange({
      ctx: args.ctx,
      currentWidthCm: args.currentWidthCm,
      currentHeightCm: currentDims.heightCm,
      currentDepthCm: currentDims.depthCm,
    }) &&
    !hasHexCellDraftConfigChange({
      cfgMod: args.cell,
      protrusionCm: args.ctx.hexCellProtrusionCm,
      doorWidthCm: args.ctx.hexCellDoorWidthCm,
      moduleWidthCm,
      toleranceCm: EPS_CM,
    })
  );
}

function readPositiveBase(sd: UnknownRecord, key: string, defaultValue: number): number {
  const value = readCanonicalPositiveNumberOr(sd[key], NaN);
  return Number.isFinite(value) && value > 0 ? value : defaultValue;
}

function assignHeightDepthOverrides(args: {
  cell: UnknownRecord;
  sd: UnknownRecord;
  applyH: number | null;
  applyD: number | null;
  baseH: number;
  baseD: number;
}): void {
  if (args.applyH != null) {
    applyOverrideToSpecialDims({
      sd: args.sd,
      key: 'heightCm',
      baseKey: 'baseHeightCm',
      baseValueCm: readPositiveBase(args.sd, 'baseHeightCm', args.baseH),
      targetValueCm: args.applyH,
      toggledBack: false,
    });
  }
  if (args.applyD != null) {
    applyOverrideToSpecialDims({
      sd: args.sd,
      key: 'depthCm',
      baseKey: 'baseDepthCm',
      baseValueCm: readPositiveBase(args.sd, 'baseDepthCm', args.baseD),
      targetValueCm: args.applyD,
      toggledBack: false,
    });
  }
  assignSpecialDimsToConfig(args.cell, args.sd);
}

export function handleCanvasCornerHexCellClick(args: CanvasCornerCellDimsArgs): void {
  const ctx = buildCornerCellDimsContext(args);
  const { App, stackKey, cellIdx, applyW, applyH, applyD, hexCellProtrusionCm, hexCellDoorWidthCm } = ctx;

  if (!ctx.isPerCellWing) {
    showCornerToast(
      App,
      'תא משושה זמין בתאי התוספת של הארון הפינתי, לא בחלק הפנטגון',
      'cellDims.hex.corner.unsupportedToast'
    );
    return;
  }

  try {
    const distribution = createCornerCellWidthDistribution(ctx);
    if (!(cellIdx >= 0 && cellIdx < distribution.cellCount)) return;

    const selectedCell = distribution.getCellCfg(cellIdx);
    const removeHexCell = shouldRemoveCornerHexCell({
      ctx,
      cell: selectedCell,
      currentWidthCm: distribution.widthsCurr[cellIdx] || ctx.curWingW,
    });

    if (!removeHexCell && shouldBlockHexCellApplyOverDrawers(selectedCell)) {
      __wp_toast(App, HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE, 'error');
      return;
    }

    if (removeHexCell) {
      const modsPrev = readCornerModules(ctx.nextCornerCfg);
      const modsNext = modsPrev.slice();
      const nextCell = cloneRecord(distribution.getCellCfg(cellIdx));
      clearHexCellFromConfig(nextCell);

      while (modsNext.length <= cellIdx) modsNext.push({});
      modsNext[cellIdx] = nextCell;
      sanitizeCornerModulesForPatch(ctx.nextCornerCfg, modsNext, modsPrev, stackKey);

      patchCornerConfigForStack(
        App,
        ctx.nextCornerCfg,
        'cellDims.hex.remove.corner.cell',
        'cellDims.hex.corner.cell.remove.patchConfig',
        stackKey
      );
      commitCornerHistory('cellDims.hex.remove.corner.cell', App);
      refreshCornerStructure(
        App,
        'cellDims.hex.remove.corner.cell',
        'cellDims.hex.corner.cell.remove.refresh'
      );
      showCornerToast(App, `תא ${cellIdx + 1} חזר לתא רגיל`, 'cellDims.hex.corner.cell.remove.feedbackToast');
      return;
    }

    if (applyW != null) {
      if (!(cellIdx >= 0 && cellIdx < distribution.cellCount)) return;

      const nextWidths = distribution.widthsCurr.slice();
      nextWidths[cellIdx] = Math.max(distribution.minW[cellIdx] || 20, applyW);
      const newWingWcm = Math.max(
        0,
        nextWidths.reduce((sum, value) => sum + value, 0)
      );

      for (let ci = 0; ci < distribution.cellCount; ci += 1) {
        const prevCell = distribution.getCellCfg(ci);
        const nextCell = cloneRecord(prevCell);
        const sd = cloneSpecialDims(readCornerSpecialDims(nextCell));
        const widthCm = nextWidths[ci] || distribution.widthsCurr[ci] || 20;
        const baseWidthCm = readPositiveBase(sd, 'baseWidthCm', distribution.widthsCurr[ci] || widthCm);
        applyOverrideToSpecialDims({
          sd,
          key: 'widthCm',
          baseKey: 'baseWidthCm',
          baseValueCm: baseWidthCm,
          targetValueCm: widthCm,
          toggledBack: false,
        });

        if (ci === cellIdx) {
          assignHeightDepthOverrides({
            cell: nextCell,
            sd,
            applyH,
            applyD,
            baseH: ctx.curH,
            baseD: ctx.curD,
          });
          assignHexCellToConfig(
            nextCell,
            resolveHexCellUpdateConfig({
              cfgMod: prevCell,
              protrusionCm: hexCellProtrusionCm,
              doorWidthCm: hexCellDoorWidthCm,
              moduleWidthCm: widthCm,
            })
          );
        } else {
          assignSpecialDimsToConfig(nextCell, sd);
        }

        while (distribution.modsNext.length <= ci) distribution.modsNext.push({});
        distribution.modsNext[ci] = nextCell;
      }

      if (distribution.modsNext.length > distribution.cellCount)
        distribution.modsNext.length = distribution.cellCount;
      sanitizeCornerModulesForPatch(
        ctx.nextCornerCfg,
        distribution.modsNext,
        distribution.modsPrev,
        stackKey
      );

      ctx.sd.baseWidthCm = newWingWcm;
      ctx.sd.widthCm = newWingWcm;
      assignSpecialDimsToConfig(ctx.nextCornerCfg, ctx.sd);

      patchCornerConfigForStack(
        App,
        ctx.nextCornerCfg,
        'cellDims.hex.apply.corner.cell.width',
        'cellDims.hex.corner.cell.width.patchConfig',
        stackKey
      );
      if (!ctx.isBottomStack) {
        syncCornerUi(
          App,
          { cornerWidth: newWingWcm, raw: { cornerWidth: newWingWcm } },
          'cellDims.hex.apply.corner.cell.width',
          'cellDims.hex.corner.cell.width.syncUi'
        );
      }
    } else {
      const modsPrev = readCornerModules(ctx.nextCornerCfg);
      const modsNext = modsPrev.slice();
      const getCellCfg = createCornerCellConfigReader(ctx, modsPrev, 'cellDims.hex.corner.cell');
      const prevCell = getCellCfg(cellIdx);
      const nextCell = cloneRecord(prevCell);
      const sd = cloneSpecialDims(readCornerSpecialDims(nextCell));
      const moduleWidthCm =
        distribution.widthsCurr[cellIdx] || readCanonicalPositiveNumberOr(sd.widthCm, NaN) || ctx.curWingW;

      assignHeightDepthOverrides({
        cell: nextCell,
        sd,
        applyH,
        applyD,
        baseH: ctx.curH,
        baseD: ctx.curD,
      });
      assignHexCellToConfig(
        nextCell,
        resolveHexCellUpdateConfig({
          cfgMod: prevCell,
          protrusionCm: hexCellProtrusionCm,
          doorWidthCm: hexCellDoorWidthCm,
          moduleWidthCm,
        })
      );

      while (modsNext.length <= cellIdx) modsNext.push({});
      modsNext[cellIdx] = nextCell;
      sanitizeCornerModulesForPatch(ctx.nextCornerCfg, modsNext, modsPrev, stackKey);

      patchCornerConfigForStack(
        App,
        ctx.nextCornerCfg,
        'cellDims.hex.apply.corner.cell',
        'cellDims.hex.corner.cell.patchConfig',
        stackKey
      );
    }

    commitCornerHistory('cellDims.hex.apply.corner.cell', App);
    refreshCornerStructure(App, 'cellDims.hex.apply.corner.cell', 'cellDims.hex.corner.cell.refresh');
    showCornerToast(App, `תא ${cellIdx + 1} הוגדר כתא משושה`, 'cellDims.hex.corner.cell.feedbackToast');
  } catch (err) {
    reportCornerDimsIssue(App, err, 'cellDims.hex.corner.cell.apply', 500, { failFast: true });
  }
}
