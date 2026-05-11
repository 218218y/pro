import type {
  AppContainer,
  BuilderBuildCornerWingFn,
  BuilderCalculateModuleStructureFn,
  BuilderDoorStateAccessorsLike,
  BuilderOutlineFn,
  BuilderPartColorResolver,
  BuilderPartMaterialResolver,
  ModuleConfigLike,
  ProjectSavedNotesLike,
  ThreeLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';

export type ShowToastFn = (message: string, level?: string) => unknown;

export type BuildStackSplitLowerUnitArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  state: unknown;
  ui: UiStateLike | null;
  runtime: unknown;
  cfg: UnknownRecord;
  label: string;

  splitSeamGapM: number;
  carcassDepthM: number;
  lowerHeightCm: number;
  lowerDepthCm: number;
  lowerWidthCm: number;
  lowerDoorsCount: number;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
  woodThick: number;
  depthReduction: number;
  baseTypeBottom: string;
  baseLegStyle?: string;
  baseLegColor?: string;
  basePlinthHeightCm?: number | string;
  baseLegHeightCm?: number | string;
  baseLegWidthCm?: number | string;
  doorStyle: string;
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
  handleControlEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  splitDoors: boolean;
  isGroovesEnabled: boolean;
  isInternalDrawersEnabled: boolean;
  isCornerMode: boolean;
  sketchMode: boolean;
  globalClickMode: boolean;
  hadEditHold: boolean;
  hasCornice: boolean;
  showHanger?: boolean;

  colorHex: unknown;
  useTexture: unknown;
  textureDataURL: unknown;
  globalFrontMat: unknown;
  bodyMat: unknown;
  masoniteMat: unknown;
  whiteMat: unknown;
  shadowMat: unknown;
  legMat: unknown;

  createBoard: unknown;
  createDoorVisual: unknown;
  createInternalDrawerBox: unknown;
  createHandleMesh: unknown;

  doorState: BuilderDoorStateAccessorsLike;
  getPartMaterial: BuilderPartMaterialResolver;
  getPartColorValue: BuilderPartColorResolver;
  getHandleType: (id: unknown) => unknown;
  isDoorRemoved: unknown;
  isRemoveDoorMode: unknown;
  removeDoorsEnabled: boolean;

  getMaterial: unknown;
  addOutlines: unknown;
  addOutlinesMesh: BuilderOutlineFn | null;
  buildCornerWing: BuilderBuildCornerWingFn | null;
  addDimensionLine: unknown;
  restoreNotesFromSave: unknown;
  addHangingClothes: unknown;
  addFoldedClothes: unknown;
  addRealisticHanger: unknown;
  rebuildDrawerMeta: unknown;
  pruneCachesSafe: unknown;
  triggerRender: unknown;
  showToast: ShowToastFn | null;

  calculateModuleStructure: BuilderCalculateModuleStructureFn | null;
  notesToPreserve: ProjectSavedNotesLike | null | undefined;
};

export type BuildStackSplitLowerUnitResult = {
  splitY: number;
  splitDzTop: number;
  upperStartIndex: number;
};

export type FinalizeStackSplitUpperShiftArgs = {
  App: AppContainer;
  buildCtx: import('../../../types').BuildContextLike;
  splitActive: boolean;
  splitY: number;
  splitDzTop: number;
  upperStartIndex: number;
};

export type PreparedStackSplitLowerSetup = {
  group: UnknownRecord | null;
  splitBottomStartIndex: number;
  splitDzBottom: number;
  splitDzTop: number;
  splitY: number;
  splitBottomHeightCm: number;
  splitBottomDepthCm: number;
  bottomWidthCm: number;
  bottomDoorsCount: number;
  bottomTotalW: number;
  bottomD: number;
  bottomH: number;
  uiBottom: UiStateLike;
  bottomModules: unknown[];
  bottomModuleCfgList: ModuleConfigLike[];
  bottomSingleUnitWidth: number;
  bottomModuleInternalWidths: number[] | null;
  bottomHingedDoorPivotMap: UnknownRecord | null;
  bottomStartY: number;
  bottomCabinetBodyHeight: number;
  bottomCabinetTopY: number;
  bottomInternalDepth: number;
  bottomInternalZ: number;
  bottomSplitLineY: number;
  lowerDoorIdStart: number;
  useLowerHingedDoorOps: boolean;
  lowerHingedDoorOpsList: unknown[] | null;
  lowerGlobalHingedHandleAbsY: number;
  getHandleTypeBottom: (id: unknown) => unknown;
};

export function toStr(x: unknown, def = ''): string {
  return typeof x === 'string' ? x : x == null ? def : String(x);
}
