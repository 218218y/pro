import type { CanvasLinearCellDimsArgs } from './canvas_picking_cell_dims_contracts.js';
import type { LinearCellDimsContext } from './canvas_picking_cell_dims_linear_shared.js';

import { __asNum } from './canvas_picking_core_helpers.js';
import { readModulesConfigurationListFromConfigSnapshot } from '../features/modules_configuration/modules_config_api.js';
import { resolveLinearModules } from './canvas_picking_cell_dims_linear_context_modules.js';
import { computeCurrentLinearDims } from './canvas_picking_cell_dims_linear_context_current.js';
import { applyLinearToggleBack } from './canvas_picking_cell_dims_linear_context_toggle.js';

export function buildCanvasLinearCellDimsContext(
  args: CanvasLinearCellDimsArgs
): LinearCellDimsContext | null {
  const resolved = resolveLinearModules(args);
  if (!resolved) return null;

  const { cfg, raw, foundModuleIndex } = args;
  const { modules, moduleCount, wardrobeType, doorsPerModule, sumDoors } = resolved;
  const totalW = __asNum(raw.width, 0);
  const totalH = __asNum(raw.height, 0);
  const totalD = __asNum(raw.depth, 0);
  const prevModsCfg = readModulesConfigurationListFromConfigSnapshot(cfg, 'modulesConfiguration');
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

  const toggles = applyLinearToggleBack(
    idx,
    args.applyW,
    args.applyH,
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
    idx,
    moduleCount,
    wardrobeType,
    totalW,
    totalH,
    totalD,
    doorsPerModule,
    fallbackW: current.fallbackW,
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
