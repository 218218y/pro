import type {
  CanvasLinearCellDimsArgs,
  CanvasLinearCellDimsGeometryArgs,
} from './canvas_picking_cell_dims_contracts.js';
import type {
  LinearCellDimsContext,
  LinearCellDimsGeometryContext,
} from './canvas_picking_cell_dims_linear_shared.js';

import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import {
  readLinearCellDimsTotals,
  resolveLinearModules,
} from './canvas_picking_cell_dims_linear_context_modules.js';
import { computeCurrentLinearDims } from './canvas_picking_cell_dims_linear_context_current.js';
import { applyLinearToggleBack } from './canvas_picking_cell_dims_linear_context_toggle.js';

export function buildCanvasLinearCellDimsGeometryContext(
  args: CanvasLinearCellDimsGeometryArgs
): LinearCellDimsGeometryContext | null {
  const resolved = resolveLinearModules(args);
  if (!resolved) return null;

  const { cfg, foundModuleIndex } = args;
  const { modules, moduleCount, configBucket, wardrobeType, doorsPerModule, sumDoors } = resolved;
  const { totalW, totalH, totalD } = readLinearCellDimsTotals(args);
  const prevModsCfg = readModulesConfigurationListFromConfigSnapshot(cfg, configBucket);
  const current = computeCurrentLinearDims(
    modules,
    moduleCount,
    totalW,
    totalH,
    totalD,
    doorsPerModule,
    sumDoors,
    prevModsCfg
  );

  const idx = Number(foundModuleIndex);
  if (!Number.isInteger(idx) || idx < 0 || idx >= moduleCount) return null;

  const applyH = args.isBottomStack ? null : args.applyH;
  const toggles = applyLinearToggleBack(
    idx,
    args.applyW,
    applyH,
    args.applyD,
    current.widthsCurr,
    current.heightsCurr,
    current.depthsCurr,
    current.baseW,
    current.baseH,
    current.baseD
  );

  return {
    ...args,
    applyH,
    idx,
    configBucket,
    moduleCount,
    wardrobeType,
    totalW,
    totalH,
    totalD,
    doorsPerModule,
    defaultWidths: current.defaultWidths,
    prevModsCfg,
    widthsCurr: current.widthsCurr,
    heightsCurr: current.heightsCurr,
    depthsCurr: current.depthsCurr,
    baseW: current.baseW,
    baseH: current.baseH,
    baseD: current.baseD,
    ...toggles,
  };
}

export function buildCanvasLinearCellDimsContext(
  args: CanvasLinearCellDimsArgs
): LinearCellDimsContext | null {
  const geometry = buildCanvasLinearCellDimsGeometryContext(args);
  if (!geometry) return null;
  return { ...geometry, autoWidthMatchToleranceCm: args.autoWidthMatchToleranceCm };
}
