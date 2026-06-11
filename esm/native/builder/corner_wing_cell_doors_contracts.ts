// Corner wing door typed contracts.
//
// Keep the public door layer and its helpers aligned on one canonical type
// surface while dedicated modules own context creation and derived door state.

import { readDoorTrimMap } from '../features/door_trim.js';
import type {
  CornerCell,
  CornerCellCfg,
  CornerWingCellFlowParams,
  DoorGeomLike,
  GroupLike,
  ThreeCornerCellLike,
  ValueRecord,
} from './corner_wing_cell_shared.js';

export type CornerWingDoorContext = {
  App: CornerWingCellFlowParams['ctx']['App'];
  THREE: ThreeCornerCellLike;
  wingGroup: GroupLike;
  doorStyle: string;
  splitDoors: boolean;
  groovesEnabled: boolean;
  removeDoorsEnabled: boolean;
  getGroove: CornerWingCellFlowParams['ctx']['getGroove'];
  getCurtain: CornerWingCellFlowParams['ctx']['getCurtain'];
  createDoorVisual: ReturnType<typeof import('./corner_wing_cell_shared.js').requireCreateDoorVisual>;
  render: CornerWingCellFlowParams['locals']['render'];
  cornerCells: CornerCell[];
  doorCount: number;
  cornerSharedLongEdgeHandleLiftAbsY: number;
  cornerSharedAlignedEdgeHandleBaseAbsY: number;
  readMapOrEmpty: CornerWingCellFlowParams['helpers']['readMapOrEmpty'];
  readSplitPosListFromMap: CornerWingCellFlowParams['helpers']['readSplitPosListFromMap'];
  getCfg: CornerWingCellFlowParams['helpers']['getCfg'];
  MODES: CornerWingCellFlowParams['helpers']['MODES'];
  getOrCreateCacheRecord: CornerWingCellFlowParams['helpers']['getOrCreateCacheRecord'];
  isPrimaryMode: CornerWingCellFlowParams['helpers']['isPrimaryMode'];
  isLongEdgeHandleVariantForPart: CornerWingCellFlowParams['helpers']['__isLongEdgeHandleVariantForPart'];
  topSplitHandleInsetForPart: CornerWingCellFlowParams['helpers']['__topSplitHandleInsetForPart'];
  clampHandleAbsYForPart: CornerWingCellFlowParams['helpers']['__clampHandleAbsYForPart'];
  asRecord: CornerWingCellFlowParams['helpers']['asRecord'];
  readNumFrom: CornerWingCellFlowParams['helpers']['readNumFrom'];
  woodThick: number;
  startY: number;
  wingH: number;
  wingD: number;
  activeWidth: number;
  blindWidth: number;
  uiAny: CornerWingCellFlowParams['ctx']['uiAny'];
  stackKey: string;
  stackSplitEnabled: boolean;
  isDoorRemoved: CornerWingCellFlowParams['ctx']['__isDoorRemoved'];
  stackScopePartKey: CornerWingCellFlowParams['ctx']['__stackScopePartKey'];
  readScopedReader: CornerWingCellFlowParams['ctx']['__readScopedReader'];
  getMirrorMat: CornerWingCellFlowParams['ctx']['__getMirrorMat'];
  resolveSpecial: CornerWingCellFlowParams['ctx']['__resolveSpecial'];
  getCornerMat: CornerWingCellFlowParams['ctx']['getCornerMat'];
  frontMat: CornerWingCellFlowParams['ctx']['frontMat'];
  cfg0: ValueRecord;
  doorTrimMap: ReturnType<typeof readDoorTrimMap>;
  hingeMap0: ValueRecord;
  splitMap0: ValueRecord;
  splitBottomMap0: ValueRecord;
  fallbackDoorW: number;
  splitGap: number;
};

export type CornerWingDoorState = {
  doorIdx: number;
  cell: CornerCell | null;
  cellKey: string;
  cellCfg: CornerCellCfg | null;
  cellEffBottomY: number;
  cellDrawerH: number;
  doorBottomY: number;
  cellD: number;
  doorZShift: number;
  effectiveTopLimit: number;
  splitLineY: number;
  doorBaseId: string;
  scopedDoorBaseId: string;
  geom: DoorGeomLike;
  doorW: number;
  dX: number;
  chosenDirection: 'left' | 'right';
  isLeftHinge: boolean;
  pivotX: number;
  meshOffset: number;
  totalDoorH: number;
  topSplitEnabled: boolean;
  bottomSplitEnabled: boolean;
  shouldSplit: boolean;
  bottomLineY: number;
};
