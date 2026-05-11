import type {
  UiRawInputsLike,
  UiStateLike,
  BuilderCalculateModuleStructureFn,
  BuilderDoorStateAccessorsLike,
  AppContainer,
  BuildStateLike,
  ModuleConfigLike,
  ThreeLike,
  UnknownRecord,
} from '../../../types';
import type { BuilderOutlineFn } from '../../../types';
import type { GetMaterialFn } from './build_flow_readers.js';

type MaterialResolverResult = ReturnType<typeof import('./material_resolver.js').makeMaterialResolver>;
type CommonMatsLike = ReturnType<typeof import('./common_mats_resolver.js').getCommonMatsOrThrow>;
type ModuleLayoutResult = ReturnType<typeof import('./module_layout_pipeline.js').computeModulesAndLayout>;
type BoardCreator = ReturnType<typeof import('./board_factory.js').makeBoardCreator>;

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
  basePlinthHeightCm: number;
  baseLegHeightCm: number;
  baseLegWidthCm: number;
  baseTypeBottom: string;
  baseTypeTop: string;
  hasCornice: boolean;
  corniceType: string;
  splitDoors: boolean;
  isGroovesEnabled: boolean;
  isInternalDrawersEnabled: boolean;
  woodThick: number;
  colorHex: string | null;
  useTexture: boolean;
  textureDataURL: string | null;
  globalFrontMat: unknown;
  bodyMat: unknown;
  masoniteMat: CommonMatsLike['masoniteMat'];
  whiteMat: CommonMatsLike['whiteMat'];
  shadowMat: CommonMatsLike['shadowMat'];
  legMat: unknown;
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
  createBoard: BoardCreator;
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
  | 'basePlinthHeightCm'
  | 'baseLegHeightCm'
  | 'baseLegWidthCm'
  | 'baseTypeBottom'
  | 'baseTypeTop'
  | 'hasCornice'
  | 'corniceType'
  | 'splitDoors'
  | 'isGroovesEnabled'
  | 'isInternalDrawersEnabled'
  | 'woodThick'
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
  toStr: Stringifier;
};

export type BuildFlowPlanMaterialsArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  ui: UnknownRecord;
  cfg: UnknownRecord;
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
  lowerHeightCm: number;
  H: number;
  D: number;
};

export type BuildFlowPlanResolveArgs = BuildFlowPlanMaterialsArgs &
  Pick<
    BuildFlowPlanInputsArgs,
    'ui' | 'cfg' | 'widthCm' | 'heightCm' | 'depthCm' | 'doorsCount' | 'toStr'
  > & {
    state: BuildStateLike;
    sketchMode: boolean;
    addOutlines: BuilderOutlineFn | unknown;
    calculateModuleStructureFn: BuilderCalculateModuleStructureFn | null;
    doorState?: BuilderDoorStateAccessorsLike;
  };
