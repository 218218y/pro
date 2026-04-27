import type {
  AppContainer,
  BuildCtxFlagsLike,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderCreateBoardFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderOutlineFn,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  ConfigStateLike,
  HingedDoorOpLike,
  ModuleConfigLike,
  ThreeLike,
  UiStateLike,
} from '../../../types/index.js';

import type { DoorStateLike, ModuleLike, ValueRecord } from './module_loop_pipeline_shared.js';

export interface ModuleDoorSpan {
  spanW: number;
  centerX: number;
}

export interface ModuleLoopRuntime {
  App: AppContainer;
  THREE: ThreeLike;
  cfg: ConfigStateLike;
  ui: UiStateLike;
  flags: BuildCtxFlagsLike;
  modules: ModuleLike[];
  moduleCfgList: ModuleConfigLike[];
  moduleInternalWidthsList: number[] | null;
  moduleIsCustom: boolean[];
  moduleBodyHeights: number[];
  totalW: number;
  singleUnitWidth: number;
  woodThick: number;
  cabinetBodyHeight: number;
  startY: number;
  D: number;
  totalH: number;
  internalDepth: number;
  depthReduction: number;
  stackKey: string;
  drawerKeyPrefix: string;
  doorStyle: string;
  splitDoors: boolean;
  bodyMat: unknown;
  globalFrontMat: unknown;
  shadowMat: unknown;
  legMat: unknown;
  isGroovesEnabled: boolean;
  isInternalDrawersEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  removeDoorsEnabled: boolean;
  getPartMaterial: BuilderPartMaterialResolver;
  getPartColorValue: BuilderPartColorResolver | undefined;
  createDoorVisual: BuilderCreateDoorVisualFn | undefined;
  createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn | undefined;
  createBoard: BuilderCreateBoardFn;
  addOutlines: BuilderOutlineFn | undefined;
  addRealisticHanger: BuilderAddRealisticHangerFn | undefined;
  addHangingClothes: BuilderAddHangingClothesFn | undefined;
  addFoldedClothes: BuilderAddFoldedClothesFn | undefined;
  hingedDoorOpsList: HingedDoorOpLike[];
  hingedDoorPivotMap: Record<
    number,
    { pivotX?: number; meshOffsetX?: number; isLeftHinge?: boolean; doorWidth?: number }
  > | null;
  globalHandleAbsY: number;
  isDoorRemoved: ((partId: string) => boolean) | undefined;
  getHingeDir: DoorStateLike['getHingeDir'];
  isDoorSplit: DoorStateLike['isDoorSplit'];
  isDoorSplitBottom: DoorStateLike['isDoorSplitBottom'];
  curtainVal: DoorStateLike['curtainVal'];
  grooveVal: DoorStateLike['grooveVal'];
  internalGridMap: ValueRecord;
  computeModuleDoorSpan: (
    startDoorId: number,
    doorsCount: number,
    fallbackCenterX: number,
    fallbackW: number
  ) => ModuleDoorSpan;
}
