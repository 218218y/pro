import type { UnknownRecord } from '../../../types';

import {
  applyOverrideToSpecialDims,
  assignSpecialDimsToConfig,
  cloneSpecialDims,
} from '../features/special_dims/index.js';
import { __asNum } from './canvas_picking_core_helpers.js';
import type { CornerCellDimsContext } from './canvas_picking_cell_dims_corner_shared.js';
import {
  cloneRecord,
  readCornerSpecialDims,
  reportCornerDimsIssue,
  patchCornerConfig,
  syncCornerUi,
  commitCornerHistory,
  refreshCornerStructure,
  showCornerToast,
  buildCornerCellToastMessage,
  sanitizeCornerModulesForPatch,
} from './canvas_picking_cell_dims_corner_shared.js';
import type {
  CornerCellWidthDistribution,
  CornerCellWidthSelectionState,
} from './canvas_picking_cell_dims_corner_cell_width_contracts.js';

function needsLockWidth(App: CornerCellDimsContext['App'], cfgCell: UnknownRecord, widthCm: number): boolean {
  const eps = 1e-6;
  try {
    const currentDims = readCornerSpecialDims(cfgCell);
    if (!currentDims) return true;
    const baseWidth = __asNum(currentDims.baseWidthCm, NaN);
    const width = __asNum(currentDims.widthCm, NaN);
    if (!Number.isFinite(baseWidth) || Math.abs(baseWidth - widthCm) > eps) return true;
    if (!Number.isFinite(width) || Math.abs(width - widthCm) > eps) return true;
    return false;
  } catch (_e) {
    reportCornerDimsIssue(App, _e, 'cellDims.corner.width.needsLockWidth', 1000);
    return true;
  }
}

export function applyCornerCellWidthSelection(
  ctx: CornerCellDimsContext,
  distribution: CornerCellWidthDistribution,
  selection: CornerCellWidthSelectionState
): boolean {
  const { App, applyH, applyD, cellIdx, nextCornerCfg, sd } = ctx;
  const modsOut = distribution.modsNext;

  for (let ci = 0; ci < distribution.cellCount; ci++) {
    const widthCm = selection.widthsNext[ci] || 0;
    const prevCellCfg = distribution.getCellCfg(ci);

    if (ci === cellIdx) {
      const nextCellCfg = cloneRecord(prevCellCfg);
      const sdCell = cloneSpecialDims(readCornerSpecialDims(nextCellCfg));

      let baseW = __asNum(sdCell.baseWidthCm, NaN);
      if (!Number.isFinite(baseW) || baseW <= 0)
        baseW = selection.toggledBackCellW ? selection.cellBaseW : selection.curCellW;
      applyOverrideToSpecialDims({
        sd: sdCell,
        key: 'widthCm',
        baseKey: 'baseWidthCm',
        baseValueCm: baseW,
        targetValueCm: widthCm,
        toggledBack: selection.toggledBackCellW,
      });

      if (applyH != null && (selection.toggledBackCellH || selection.willChangeH || selection.hasActiveH)) {
        let baseH = __asNum(sdCell.baseHeightCm, NaN);
        if (!Number.isFinite(baseH) || baseH <= 0) baseH = selection.cellBaseH;
        applyOverrideToSpecialDims({
          sd: sdCell,
          key: 'heightCm',
          baseKey: 'baseHeightCm',
          baseValueCm: baseH,
          targetValueCm: selection.tgtCellH,
          toggledBack: selection.toggledBackCellH,
        });
      }

      if (applyD != null && (selection.toggledBackCellD || selection.willChangeD || selection.hasActiveD)) {
        let baseD = __asNum(sdCell.baseDepthCm, NaN);
        if (!Number.isFinite(baseD) || baseD <= 0) baseD = selection.cellBaseD;
        applyOverrideToSpecialDims({
          sd: sdCell,
          key: 'depthCm',
          baseKey: 'baseDepthCm',
          baseValueCm: baseD,
          targetValueCm: selection.tgtCellD,
          toggledBack: selection.toggledBackCellD,
        });
      }

      assignSpecialDimsToConfig(nextCellCfg, sdCell);
      while (modsOut.length <= ci) modsOut.push({});
      modsOut[ci] = nextCellCfg;
      continue;
    }

    if (!needsLockWidth(App, prevCellCfg, widthCm)) {
      while (modsOut.length <= ci) modsOut.push({});
      modsOut[ci] = prevCellCfg;
      continue;
    }

    const nextCellCfg = cloneRecord(prevCellCfg);
    const sdCell = cloneSpecialDims(readCornerSpecialDims(nextCellCfg));
    sdCell.baseWidthCm = widthCm;
    sdCell.widthCm = widthCm;
    assignSpecialDimsToConfig(nextCellCfg, sdCell);
    while (modsOut.length <= ci) modsOut.push({});
    modsOut[ci] = nextCellCfg;
  }

  if (modsOut.length > distribution.cellCount) modsOut.length = distribution.cellCount;
  sanitizeCornerModulesForPatch(nextCornerCfg, distribution.modsNext, distribution.modsPrev);

  try {
    sd.baseWidthCm = selection.newWingWcm;
    sd.widthCm = selection.newWingWcm;
  } catch (_e) {
    reportCornerDimsIssue(App, _e, 'cellDims.corner.lockOthers.persistWidth');
  }
  assignSpecialDimsToConfig(nextCornerCfg, sd);

  patchCornerConfig(
    App,
    nextCornerCfg,
    'cellDims.apply.corner.cell.lockOthers',
    'cellDims.corner.lockOthers.patchConfig'
  );
  syncCornerUi(
    App,
    { cornerWidth: selection.newWingWcm, raw: { cornerWidth: selection.newWingWcm } },
    'cellDims.apply.corner.cell.lockOthers',
    'cellDims.corner.lockOthers.syncUi'
  );
  commitCornerHistory('cellDims.apply.corner.cell.lockOthers', App);
  refreshCornerStructure(App, 'cellDims.apply.corner.cell.lockOthers', 'cellDims.corner.lockOthers.refresh');

  const name = `תא ${cellIdx + 1}`;
  const parts: string[] = [];
  if (selection.toggledBackCellW) parts.push('בוטלה מידת רוחב מיוחדת');
  else if (selection.willChangeW) parts.push('עודכן רוחב');
  if (selection.toggledBackCellH) parts.push('בוטלה מידת גובה מיוחדת');
  else if (selection.willChangeH) parts.push('עודכן גובה');
  if (selection.toggledBackCellD) parts.push('בוטלה מידת עומק מיוחדת');
  else if (selection.willChangeD) parts.push('עודכן עומק');
  showCornerToast(
    App,
    buildCornerCellToastMessage(name, parts, '(עודכנה גם רוחב הארון הפינתי)'),
    'cellDims.corner.lockOthers.feedbackToast'
  );
  return true;
}
