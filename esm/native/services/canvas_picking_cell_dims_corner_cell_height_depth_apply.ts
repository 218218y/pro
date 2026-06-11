import { applyOverrideToSpecialDims, assignSpecialDimsToConfig } from '../features/special_dims/index.js';
import {
  patchCornerConfig,
  commitCornerHistory,
  refreshCornerStructure,
  showCornerToast,
  buildCornerCellToastMessage,
  sanitizeCornerModulesForPatch,
} from './canvas_picking_cell_dims_corner_shared.js';
import type {
  CornerCellHeightDepthContext,
  CornerCellHeightDepthState,
} from './canvas_picking_cell_dims_corner_cell_height_depth_contracts.js';

export function applyCornerCellHeightDepthSelection(
  ctx: CornerCellHeightDepthContext,
  state: CornerCellHeightDepthState
): boolean {
  const { App, nextCornerCfg, cellIdx, applyH, applyD, modsPrev, modsNext, nextCellCfg, sdCell } = ctx;
  const { cellBaseH, cellBaseD, toggledBackCellH, toggledBackCellD, willChangeH, willChangeD } = state;

  if (applyH != null) {
    applyOverrideToSpecialDims({
      sd: sdCell,
      key: 'heightCm',
      baseKey: 'baseHeightCm',
      baseValueCm: cellBaseH,
      targetValueCm: applyH,
      toggledBack: toggledBackCellH,
    });
  }
  if (applyD != null) {
    applyOverrideToSpecialDims({
      sd: sdCell,
      key: 'depthCm',
      baseKey: 'baseDepthCm',
      baseValueCm: cellBaseD,
      targetValueCm: applyD,
      toggledBack: toggledBackCellD,
    });
  }

  assignSpecialDimsToConfig(nextCellCfg, sdCell);
  while (modsNext.length <= cellIdx) modsNext.push({});
  modsNext[cellIdx] = nextCellCfg;
  sanitizeCornerModulesForPatch(nextCornerCfg, modsNext, modsPrev);

  patchCornerConfig(
    App,
    nextCornerCfg,
    'cellDims.apply.corner.cell.heightOnly',
    'cellDims.corner.cell.patchConfig'
  );
  commitCornerHistory('cellDims.apply.corner.cell.heightOnly', App);
  refreshCornerStructure(App, 'cellDims.apply.corner.cell.heightOnly', 'cellDims.corner.cell.refresh');

  const name = `תא ${cellIdx + 1}`;
  const parts: string[] = [];
  if (toggledBackCellH) parts.push('בוטלה מידת גובה מיוחדת');
  else if (willChangeH) parts.push('עודכן גובה');
  if (toggledBackCellD) parts.push('בוטלה מידת עומק מיוחדת');
  else if (willChangeD) parts.push('עודכן עומק');
  showCornerToast(App, buildCornerCellToastMessage(name, parts), 'cellDims.corner.cell.feedbackToast');
  return true;
}
