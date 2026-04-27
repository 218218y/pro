import {
  __edgeHandleAlignedBaseAbsYForCornerCells,
  __edgeHandleLongLiftAbsYForCornerCells,
  asRecord,
} from './corner_geometry_plan.js';

import type { CornerCellCfg } from './corner_geometry_plan.js';
import type {
  CornerWingCellCfgResolver,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

export function resolveCornerWingDoorCount(
  args: Pick<CornerWingCellDerivationArgs, 'activeWidth' | 'uiAny'>
): number {
  const doorRaw =
    asRecord(args.uiAny).cornerDoors ??
    asRecord(args.uiAny).cornerDoorCount ??
    asRecord(args.uiAny).cornerDoorsCount;
  const parsed = Number.isFinite(parseFloat(String(doorRaw))) ? parseFloat(String(doorRaw)) : NaN;
  return Number.isFinite(parsed)
    ? Math.max(0, Math.round(parsed))
    : args.activeWidth > 0.01
      ? Math.max(1, Math.round(args.activeWidth / 0.4))
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
  const cellCount = Math.max(1, Math.ceil(doorCount / 2));
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
  if (!cfgRec || cfgRec.globalHandleType !== 'edge') return 1.05;
  if (!(doorCount > 0)) return 1.05;
  const cellCount = Math.max(1, Math.ceil(doorCount / 2));
  const cellCfgs: CornerCellCfg[] = [];
  for (let ci = 0; ci < cellCount; ci += 1) cellCfgs.push(getCellCfg(ci));
  return __edgeHandleAlignedBaseAbsYForCornerCells(cfgRec, cellCfgs, args.startY, args.woodThick);
}
