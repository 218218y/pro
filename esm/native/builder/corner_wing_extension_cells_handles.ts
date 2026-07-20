import {
  CORNER_WING_BODY_POLICY,
  CORNER_WING_CELL_POLICY,
} from '../../shared/dimensions/corner_system_policy.js';
import { EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY } from '../../shared/dimensions/handle_policy.js';
import {
  __edgeHandleAlignedBaseAbsYForCornerCells,
  __edgeHandleLongLiftAbsYForCornerCells,
  asRecord,
  readFiniteNumber,
} from './corner_geometry_plan.js';

import type { CornerCellCfg } from './corner_geometry_plan.js';
import type {
  CornerWingCellCfgResolver,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

export function resolveCornerWingDoorCount(
  args: Pick<CornerWingCellDerivationArgs, 'activeWidth' | 'uiAny'>
): number {
  const doorRaw = asRecord(args.uiAny).cornerDoors;
  const parsed = readFiniteNumber(doorRaw);
  return parsed != null
    ? Math.max(0, Math.round(parsed))
    : args.activeWidth > CORNER_WING_BODY_POLICY.minActiveWidthM
      ? Math.max(
          1,
          Math.round(
            args.activeWidth /
              (CORNER_WING_CELL_POLICY.doorsPerCell * CORNER_WING_CELL_POLICY.minDoorUnitWidthM)
          )
        )
      : 0;
}

export function resolveCornerSharedLongEdgeHandleLiftAbsY(
  args: CornerWingCellDerivationArgs,
  doorCount: number,
  getCellCfg: CornerWingCellCfgResolver
): number {
  const cfgRec = asRecord(args.__cfg);
  if (!cfgRec || cfgRec.globalHandleType !== 'edge') return 0;
  if (!(doorCount > 0)) return 0;
  const cellCount = Math.max(1, Math.ceil(doorCount / CORNER_WING_CELL_POLICY.doorsPerCell));
  const cellCfgs: CornerCellCfg[] = [];
  for (let ci = 0; ci < cellCount; ci += 1) cellCfgs.push(getCellCfg(ci));
  return __edgeHandleLongLiftAbsYForCornerCells(cfgRec, cellCfgs);
}

export function resolveCornerSharedAlignedEdgeHandleBaseAbsY(
  args: CornerWingCellDerivationArgs,
  doorCount: number,
  getCellCfg: CornerWingCellCfgResolver
): number {
  const cfgRec = asRecord(args.__cfg);
  if (!cfgRec || cfgRec.globalHandleType !== 'edge')
    return EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM;
  if (!(doorCount > 0)) return EDGE_HANDLE_VERTICAL_PLACEMENT_POLICY.defaultGlobalAbsYM;
  const cellCount = Math.max(1, Math.ceil(doorCount / CORNER_WING_CELL_POLICY.doorsPerCell));
  const cellCfgs: CornerCellCfg[] = [];
  for (let ci = 0; ci < cellCount; ci += 1) cellCfgs.push(getCellCfg(ci));
  return __edgeHandleAlignedBaseAbsYForCornerCells(cfgRec, cellCfgs, args.startY, args.woodThick);
}
