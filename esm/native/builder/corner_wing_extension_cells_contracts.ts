import type { CornerCell, CornerCellCfg } from './corner_geometry_plan.js';
import type { CornerOpsEmitContext } from './corner_ops_emit_common.js';

export type CornerWingCellDerivationArgs = Pick<
  CornerOpsEmitContext,
  | 'App'
  | 'activeWidth'
  | 'blindWidth'
  | 'cabinetBodyHeight'
  | 'config'
  | 'startY'
  | 'uiAny'
  | 'wingD'
  | 'wingH'
  | 'woodThick'
  | '__cfg'
  | '__mirrorX'
  | '__stackKey'
  | '__stackSplitEnabled'
>;

export type CornerWingCellDerivation = {
  activeFaceCenter: number;
  doorCount: number;
  defaultDoorWidth: number;
  cornerCells: CornerCell[];
  cornerSharedLongEdgeHandleLiftAbsY: number;
  cornerSharedAlignedEdgeHandleBaseAbsY: number;
};

export type CornerWingCellCfgResolver = (idx: number) => CornerCellCfg;
