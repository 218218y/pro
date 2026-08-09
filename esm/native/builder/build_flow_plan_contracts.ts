import type {
  UiRawInputsLike,
  UiStateLike,
  BuilderCalculateModuleStructureFn,
  BuilderDoorStateAccessorsLike,
  BuilderOutlineFn,
  AppContainer,
  BuildStateLike,
  ModuleConfigLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { GetMaterialFn } from './build_flow_readers.js';

type MaterialResolverResult = ReturnType<typeof import('./material_resolver.js').makeMaterialResolver>;
type CommonMatsLike = ReturnType<typeof import('./common_mats_resolver.js').getCommonMatsOrThrow>;
type ModuleLayoutResult = ReturnType<typeof import('./module_layout_pipeline.js').computeModulesAndLayout>;
export type BuildFlowBoardCreator = ReturnType<typeof import('./board_factory.js').makeBoardCreator>;

export type PartMaterialResolver = MaterialResolverResult['getPartMaterial'];
export type PartColorValueResolver = MaterialResolverResult['getPartColorValue'];
export type Stringifier = (value: unknown, defaultValue?: string) => string;

export type BuildFlowPlan = {
  uiState: UiStateLike | null;
  rawUi: UiRawInputsLike;
  isCornerMode: boolean;
  handleControlEnabled: boolean;
  showHangerEnabled: boolean;
  showContentsEnabled: boolean;
  stackSplitEnabled: boolean;
  stackSplitDecorativeSeparatorEnabled: boolean;
  splitActiveForBuild: boolean;
  stackSplitUnifiedFrame: boolean;
  lowerHeightCm: number;
  lowerDepthCm: number;
  lowerWidthCm: number;
  lowerDoorsCount: number;
  splitSeamGapM: number;
  H: number;
  totalW: number;
  D: number;
  doorsCount: number;
  noMainWardrobe: boolean;
  depthReduction: number;
  internalDepth: number;
  internalZ: number;
  doorStyle: string;
  baseLegStyle: string;
  baseLegColor: string;
  baseLegPlatformMode: string;
  baseLegPlatformSideMode: string;
  baseLegPlatformSideOverhangCm: number;
  baseLegPlatformFrontOverhangCm: number;
  stackSplitDecorativeSeparatorSideOverhangCm: number;
  stackSplitDecorativeSeparatorFrontOverhangCm: number;
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseTypeBottom: string;
  baseTypeTop: string;
  baseLegTopPlatformOnly: boolean;
  hasCornice: boolean;
  corniceType: string;
  splitDoors: boolean;
  isGroovesEnabled: boolean;
  isInternalDrawersEnabled: boolean;
  woodThick: number;
  shelfThick: number;
  colorHex: string | null;
  useTexture: boolean;
  textureDataURL: string | null;
  globalFrontMat: unknown;
  bodyMat: unknown;
  masoniteMat: CommonMatsLike['masoniteMat'];
  whiteMat: CommonMatsLike['whiteMat'];
  shadowMat: CommonMatsLike['shadowMat'];
  legMat: unknown;
  defaultShelfMat: unknown;
  braceShelfMat: unknown;
  getPartColorValue: PartColorValueResolver;
  getPartMaterial: PartMaterialResolver;
  modules: ModuleLayoutResult['modules'];
  moduleCfgList: ModuleConfigLike[];
  singleUnitWidth: ModuleLayoutResult['singleUnitWidth'];
  moduleInternalWidths: number[] | null;
  hingedDoorPivotMap: ModuleLayoutResult['hingedDoorPivotMap'];
  moduleHeightsTotal: number[];
  moduleDepthsTotal: number[];
  carcassH: number;
  carcassD: number;
  createBoard: BuildFlowBoardCreator;
};

export type BuildFlowPlanInputs = Pick<
  BuildFlowPlan,
  | 'uiState'
  | 'rawUi'
  | 'isCornerMode'
  | 'handleControlEnabled'
  | 'showHangerEnabled'
  | 'showContentsEnabled'
  | 'stackSplitEnabled'
  | 'stackSplitDecorativeSeparatorEnabled'
  | 'splitActiveForBuild'
  | 'stackSplitUnifiedFrame'
  | 'lowerHeightCm'
  | 'lowerDepthCm'
  | 'lowerWidthCm'
  | 'lowerDoorsCount'
  | 'splitSeamGapM'
  | 'H'
  | 'totalW'
  | 'D'
  | 'doorsCount'
  | 'noMainWardrobe'
  | 'depthReduction'
  | 'doorStyle'
  | 'baseLegStyle'
  | 'baseLegColor'
  | 'baseLegPlatformMode'
  | 'baseLegPlatformSideMode'
  | 'baseLegPlatformSideOverhangCm'
  | 'baseLegPlatformFrontOverhangCm'
  | 'stackSplitDecorativeSeparatorSideOverhangCm'
  | 'stackSplitDecorativeSeparatorFrontOverhangCm'
  | 'basePlinthHeightCm'
  | 'baseLegHeightCm'
  | 'baseLegWidthCm'
  | 'baseTypeBottom'
  | 'baseTypeTop'
  | 'baseLegTopPlatformOnly'
  | 'hasCornice'
  | 'corniceType'
  | 'splitDoors'
  | 'isGroovesEnabled'
  | 'isInternalDrawersEnabled'
  | 'woodThick'
  | 'shelfThick'
>;

export type BuildFlowPlanMaterials = Pick<
  BuildFlowPlan,
  | 'colorHex'
  | 'useTexture'
  | 'textureDataURL'
  | 'globalFrontMat'
  | 'bodyMat'
  | 'masoniteMat'
  | 'whiteMat'
  | 'shadowMat'
  | 'legMat'
  | 'defaultShelfMat'
  | 'braceShelfMat'
  | 'getPartColorValue'
  | 'getPartMaterial'
>;

export type BuildFlowPlanLayoutMetrics = Pick<
  BuildFlowPlan,
  | 'modules'
  | 'moduleCfgList'
  | 'singleUnitWidth'
  | 'moduleInternalWidths'
  | 'hingedDoorPivotMap'
  | 'moduleHeightsTotal'
  | 'moduleDepthsTotal'
  | 'carcassH'
  | 'carcassD'
>;

export type BuildFlowPlanInputsArgs = {
  ui: UnknownRecord;
  cfg: UnknownRecord;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  removablePartInteractionActive?: boolean;
  toStr: Stringifier;
};

export type BuildFlowPlanMaterialsArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  ui: UnknownRecord;
  cfg: UnknownRecord;
  sketchMode: boolean;
  toStr: Stringifier;
  getMaterialFn: GetMaterialFn;
};

export type BuildFlowPlanLayoutArgs = {
  App: AppContainer;
  state: BuildStateLike;
  cfg: UnknownRecord;
  ui: UnknownRecord;
  totalW: number;
  woodThick: number;
  doorsCount: number;
  calculateModuleStructureFn: BuilderCalculateModuleStructureFn | null;
  splitActiveForBuild: boolean;
  stackSplitUnifiedFrame?: boolean;
  lowerHeightCm: number;
  H: number;
  D: number;
};

export type BuildFlowPlanMaterialsInput = Omit<BuildFlowPlanMaterialsArgs, 'App'>;
export type BuildFlowPlanLayoutInput = Omit<BuildFlowPlanLayoutArgs, 'App'>;
export type BuildFlowBoardFactoryInput = Readonly<{
  THREE: ThreeLike;
  sketchMode: boolean;
  addOutlines: BuilderOutlineFn | null;
}>;

export type BuildFlowPlanInfrastructurePorts = Readonly<{
  resolvePlanMaterials: (input: BuildFlowPlanMaterialsInput) => BuildFlowPlanMaterials;
  computeModuleLayout: (input: BuildFlowPlanLayoutInput) => BuildFlowPlanLayoutMetrics;
  createBoardFactory: (input: BuildFlowBoardFactoryInput) => BuildFlowBoardCreator;
}>;

export type BuildFlowPlanResolveArgs = BuildFlowPlanMaterialsInput &
  Pick<
    BuildFlowPlanInputsArgs,
    'ui' | 'cfg' | 'widthCm' | 'heightCm' | 'depthCm' | 'doorsCount' | 'toStr'
  > & {
    orchestration: BuildFlowPlanInfrastructurePorts;
    state: BuildStateLike;
    sketchMode: boolean;
    addOutlines: BuilderOutlineFn;
    calculateModuleStructureFn: BuilderCalculateModuleStructureFn | null;
    doorState?: BuilderDoorStateAccessorsLike;
  };
