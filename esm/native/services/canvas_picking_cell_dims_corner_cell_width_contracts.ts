import type { UnknownRecord } from '../../../types';

import type { CornerCellConfigReader } from './canvas_picking_cell_dims_corner_cell_shared.js';

export interface CornerCellWidthDistribution {
  cellCount: number;
  modsPrev: UnknownRecord[];
  modsNext: UnknownRecord[];
  getCellCfg: CornerCellConfigReader;
  widthsCurr: number[];
  minW: number[];
}

export interface CornerCellWidthSelectionState {
  widthsNext: number[];
  curCellW: number;
  curCellH: number;
  curCellD: number;
  cellBaseW: number;
  cellBaseH: number;
  cellBaseD: number;
  hasActiveW: boolean;
  hasActiveH: boolean;
  hasActiveD: boolean;
  willChangeW: boolean;
  willChangeH: boolean;
  willChangeD: boolean;
  toggledBackCellW: boolean;
  toggledBackCellH: boolean;
  toggledBackCellD: boolean;
  tgtCellW: number;
  tgtCellH: number;
  tgtCellD: number;
  hasAnyEffect: boolean;
  newWingWcm: number;
}
