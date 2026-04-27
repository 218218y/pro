import { buildCornerWingCells } from './corner_wing_extension_cells_dimensions.js';
import {
  type CornerWingCellDerivation,
  type CornerWingCellDerivationArgs,
  type CornerWingCellCfgResolver,
} from './corner_wing_extension_cells_contracts.js';
import { createCornerWingCellCfgResolver } from './corner_wing_extension_cells_config.js';
import {
  resolveCornerSharedAlignedEdgeHandleBaseAbsY,
  resolveCornerSharedLongEdgeHandleLiftAbsY,
  resolveCornerWingDoorCount,
} from './corner_wing_extension_cells_handles.js';

export { resolveCornerWingDoorCount } from './corner_wing_extension_cells_handles.js';
export type {
  CornerWingCellDerivation,
  CornerWingCellDerivationArgs,
} from './corner_wing_extension_cells_contracts.js';

export function deriveCornerWingCells(args: CornerWingCellDerivationArgs): CornerWingCellDerivation {
  const activeFaceCenter = args.blindWidth + args.activeWidth / 2;
  const doorCount = resolveCornerWingDoorCount(args);
  const defaultDoorWidth = doorCount > 0 ? args.activeWidth / doorCount : 0;

  const cornerCellCount = doorCount > 0 ? Math.max(1, Math.ceil(doorCount / 2)) : 0;
  const getCellCfg: CornerWingCellCfgResolver = createCornerWingCellCfgResolver(args, cornerCellCount);

  const cornerSharedLongEdgeHandleLiftAbsY = resolveCornerSharedLongEdgeHandleLiftAbsY(
    args,
    doorCount,
    getCellCfg
  );
  const cornerSharedAlignedEdgeHandleBaseAbsY = resolveCornerSharedAlignedEdgeHandleBaseAbsY(
    args,
    doorCount,
    getCellCfg
  );

  const cornerCells = buildCornerWingCells(args, doorCount, defaultDoorWidth, getCellCfg);

  return {
    activeFaceCenter,
    doorCount,
    defaultDoorWidth,
    cornerCells,
    cornerSharedLongEdgeHandleLiftAbsY,
    cornerSharedAlignedEdgeHandleBaseAbsY,
  };
}
