import type { AppContainer, UiStateLike, UnknownRecord } from '../../../types';
import type { SpecialDimsRecord } from '../features/special_dims/index.js';

export interface CornerCellHeightDepthContext {
  App: AppContainer;
  ui: UiStateLike;
  stackKey: 'top' | 'bottom';
  nextCornerCfg: UnknownRecord;
  cellIdx: number;
  curH: number;
  curD: number;
  applyH: number | null | undefined;
  applyD: number | null | undefined;
  modsPrev: UnknownRecord[];
  modsNext: UnknownRecord[];
  nextCellCfg: UnknownRecord;
  sdCell: SpecialDimsRecord;
}

export interface CornerCellHeightDepthState {
  cellCurH: number;
  cellBaseH: number;
  hasActiveH: boolean;
  cellCurD: number;
  cellBaseD: number;
  hasActiveD: boolean;
  matchesTargetH: boolean;
  matchesTargetD: boolean;
  willChangeH: boolean;
  willChangeD: boolean;
  toggledBackCellH: boolean;
  toggledBackCellD: boolean;
  hasAnyEffect: boolean;
}
