import type { MirrorLayoutList } from '../../../types';
import type { CornerCellCfg } from './corner_geometry_plan.js';
import {
  type CornerCell,
  type CornerWingCellFlowParams,
  type SlotMetaLike,
  type ValueRecord,
  requireAddFoldedClothes,
  requireAddHangingClothes,
  requireAddOutlines,
  requireAddRealisticHanger,
  requireCreateDoorVisual,
  requireCreateInternalDrawerBox,
  requireGroupLike,
  requireThreeCornerCellLike,
} from './corner_wing_cell_shared.js';

export type CornerWingInteriorRuntime = {
  ctx: CornerWingCellFlowParams['ctx'];
  locals: CornerWingCellFlowParams['locals'];
  helpers: CornerWingCellFlowParams['helpers'];
  App: CornerWingCellFlowParams['ctx']['App'];
  woodThick: number;
  startY: number;
  wingD: number;
  wingW: number;
  blindWidth: number;
  __mirrorX: unknown;
  __stackKey: string;
  __stackSplitEnabled: boolean;
  __stackOffsetZ: number;
  __isDoorRemoved: CornerWingCellFlowParams['ctx']['__isDoorRemoved'];
  __stackScopePartKey: CornerWingCellFlowParams['ctx']['__stackScopePartKey'];
  __handlesMap: unknown;
  __individualColors: CornerWingCellFlowParams['ctx']['__individualColors'];
  __doorSpecialMap: unknown;
  __readScopedMapVal: CornerWingCellFlowParams['ctx']['__readScopedMapVal'];
  __readScopedReader: CornerWingCellFlowParams['ctx']['__readScopedReader'];
  __getMirrorMat: CornerWingCellFlowParams['ctx']['__getMirrorMat'];
  __resolveSpecial: CornerWingCellFlowParams['ctx']['__resolveSpecial'];
  getCornerMat: CornerWingCellFlowParams['ctx']['getCornerMat'];
  bodyMat: unknown;
  frontMat: unknown;
  getMaterial: CornerWingCellFlowParams['ctx']['getMaterial'];
  __sketchMode: unknown;
  THREE: ReturnType<typeof requireThreeCornerCellLike>;
  wingGroup: ReturnType<typeof requireGroupLike>;
  doorStyle: string;
  groovesEnabled: boolean;
  internalDrawersEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  __cfg: ValueRecord;
  getGroove: unknown;
  shadowMat: unknown;
  addOutlines: ReturnType<typeof requireAddOutlines>;
  createDoorVisual: ReturnType<typeof requireCreateDoorVisual>;
  createInternalDrawerBox: ReturnType<typeof requireCreateInternalDrawerBox>;
  addRealisticHanger: ReturnType<typeof requireAddRealisticHanger>;
  addHangingClothes: ReturnType<typeof requireAddHangingClothes>;
  addFoldedClothes: ReturnType<typeof requireAddFoldedClothes>;
  render: ValueRecord | null;
  materials: CornerWingCellFlowParams['locals']['materials'];
  cornerCells: CornerCell[];
  __defaultDoorW: number;
  __cornerSharedLongEdgeHandleLiftAbsY: number;
  __cornerSharedAlignedEdgeHandleBaseAbsY: number;
  readMap: CornerWingCellFlowParams['helpers']['readMap'];
  readMapOrEmpty: CornerWingCellFlowParams['helpers']['readMapOrEmpty'];
  getOrCreateCacheRecord: CornerWingCellFlowParams['helpers']['getOrCreateCacheRecord'];
  __isLongEdgeHandleVariantForPart: CornerWingCellFlowParams['helpers']['__isLongEdgeHandleVariantForPart'];
  __topSplitHandleInsetForPart: CornerWingCellFlowParams['helpers']['__topSplitHandleInsetForPart'];
  __edgeHandleLongLiftAbsYForCell: CornerWingCellFlowParams['helpers']['__edgeHandleLongLiftAbsYForCell'];
  __edgeHandleLongLiftAbsYForCornerCells: CornerWingCellFlowParams['helpers']['__edgeHandleLongLiftAbsYForCornerCells'];
  __edgeHandleAlignedBaseAbsYForCornerCells: CornerWingCellFlowParams['helpers']['__edgeHandleAlignedBaseAbsYForCornerCells'];
  __clampHandleAbsYForPart: CornerWingCellFlowParams['helpers']['__clampHandleAbsYForPart'];
  isRecord: CornerWingCellFlowParams['helpers']['isRecord'];
  asRecord: CornerWingCellFlowParams['helpers']['asRecord'];
  readMirrorLayout(partId: string): MirrorLayoutList | null;
  readScopedReaderAny(reader: unknown, partId: string): unknown;
  ensureRenderArray(rec: ValueRecord, key: string): unknown[];
};

export type CornerWingInteriorCellRuntime = {
  runtime: CornerWingInteriorRuntime;
  cell: CornerCell;
  cfgCell: CornerCellCfg;
  cellKey: string;
  cellW: number;
  cellCenterX: number;
  cellInnerLeftX: number;
  cellInnerRightX: number;
  cellInnerW: number;
  cellInnerCenterX: number;
  cellShelfW: number;
  cellD: number;
  effectiveBottomY: number;
  effectiveTopY: number;
  internalStartY: number;
  gridDivisions: number;
  localGridStep: number;
  __braceSet: Record<number, true>;
  __internalDepth: number;
  __regularDepth: number;
  __fullDepthCenterZ: number;
  __backFaceZ: number;
  __z(z: number): number;
};

export type CornerWingInteriorLayoutOps = {
  createRod(yPos: number, limitHeight?: number | null): void;
  checkAndCreateInternalDrawer(slotIndex: number, slotMeta?: SlotMetaLike): boolean;
  addGridShelf(gridIndex: number): void;
};
