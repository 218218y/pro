import { createBuildContext } from './build_context.js';

import type {
  AppContainer,
  BuildContextLike,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderDoorStateAccessorsLike,
  BuilderCreateHandleMeshFn,
  ProjectSavedNotesLike,
  BuildStateLike,
  ThreeLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type { BuildFlowPlan } from './build_flow_plan.js';
import type { GetMaterialFn } from './build_flow_readers.js';

type BuildFlowContextFactoryArgs = {
  App: AppContainer;
  THREE: ThreeLike;
  state: BuildStateLike;
  ui: UiStateLike | UnknownRecord;
  runtime: UnknownRecord;
  cfg: UnknownRecord;
  label: string;
  plan: BuildFlowPlan;
  widthCm: number;
  heightCm: number;
  depthCm: number;
  doorsCount: number;
  chestDrawersCount: number;
  startY: number;
  cabinetBodyHeight: number;
  cabinetTopY: number;
  splitLineY: number;
  sketchMode: boolean;
  globalClickMode: boolean;
  hadEditHold: boolean;
  notesToPreserve: ProjectSavedNotesLike | null;
  createDoorVisual: BuilderCreateDoorVisualFn | unknown;
  createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn | unknown;
  createHandleMesh: BuilderCreateHandleMeshFn | unknown;
  doorState: BuilderDoorStateAccessorsLike;
  getHandleType: unknown;
  getMaterialFn: GetMaterialFn;
  addOutlines: unknown;
  addOutlinesMesh: unknown;
  buildCornerWing: unknown;
  addDimensionLine: unknown;
  restoreNotesFromSave: unknown;
  addHangingClothes: unknown;
  addFoldedClothes: unknown;
  addRealisticHanger: unknown;
  rebuildDrawerMeta: unknown;
  pruneCachesSafe: unknown;
  triggerRender: unknown;
  showToast: unknown;
  useHingedDoorOps: boolean;
  hingedDoorOpsList: unknown[] | null;
  globalHingedHandleAbsY: number;
  isDoorRemoved: (id: string) => boolean;
  isRemoveDoorMode: boolean;
  removeDoorsEnabled: boolean;
};

export function createBuildFlowContext(args: BuildFlowContextFactoryArgs): BuildContextLike {
  const {
    App,
    THREE,
    state,
    ui,
    runtime,
    cfg,
    label,
    plan,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    chestDrawersCount,
    startY,
    cabinetBodyHeight,
    cabinetTopY,
    splitLineY,
    sketchMode,
    globalClickMode,
    hadEditHold,
    notesToPreserve,
    createDoorVisual,
    createInternalDrawerBox,
    createHandleMesh,
    doorState,
    getHandleType,
    getMaterialFn,
    addOutlines,
    addOutlinesMesh,
    buildCornerWing,
    addDimensionLine,
    restoreNotesFromSave,
    addHangingClothes,
    addFoldedClothes,
    addRealisticHanger,
    rebuildDrawerMeta,
    pruneCachesSafe,
    triggerRender,
    showToast,
    useHingedDoorOps,
    hingedDoorOpsList,
    globalHingedHandleAbsY,
    isDoorRemoved,
    isRemoveDoorMode,
    removeDoorsEnabled,
  } = args;

  return createBuildContext({
    App,
    THREE,
    state,
    ui,
    runtime,
    cfg,
    label,

    flags: {
      sketchMode,
      globalClickMode: !!globalClickMode,
      hadEditHold: !!hadEditHold,
      isCornerMode: !!plan.isCornerMode,
      handleControlEnabled: !!plan.handleControlEnabled,
      showHangerEnabled: !!plan.showHangerEnabled,
      showContentsEnabled: !!plan.showContentsEnabled,
      splitDoors: !!plan.splitDoors,
      hasCornice: !!plan.hasCornice,
      isGroovesEnabled: !!plan.isGroovesEnabled,
      isInternalDrawersEnabled: !!plan.isInternalDrawersEnabled,
      stackSplitEnabled: !!plan.stackSplitEnabled,
      stackSplitActive: !!plan.splitActiveForBuild,
      stackSplitLowerHeightCm: plan.lowerHeightCm,
      stackSplitLowerDepthCm: plan.lowerDepthCm,
      stackSplitLowerWidthCm: plan.lowerWidthCm,
      stackSplitLowerDoorsCount: plan.lowerDoorsCount,
    },

    dims: {
      widthCm,
      heightCm,
      depthCm,
      doorsCount,
      chestDrawersCount,
      H: plan.carcassH,
      defaultH: plan.H,
      totalW: plan.totalW,
      D: plan.carcassD,
      defaultD: plan.D,
      woodThick: plan.woodThick,
      startY,
      cabinetBodyHeight,
      cabinetTopY,
      internalDepth: plan.internalDepth,
      internalZ: plan.internalZ,
      splitLineY,
    },

    strings: {
      doorStyle: plan.doorStyle,
      baseType: plan.baseTypeTop,
      baseLegStyle: plan.baseLegStyle,
      baseLegColor: plan.baseLegColor,
      baseLegHeightCm: plan.baseLegHeightCm,
      baseLegWidthCm: plan.baseLegWidthCm,
    },

    layout: {
      modules: plan.modules,
      moduleCfgList: plan.moduleCfgList,
      singleUnitWidth: plan.singleUnitWidth,
      moduleInternalWidths: plan.moduleInternalWidths,
      hingedDoorPivotMap: plan.hingedDoorPivotMap,
    },

    materials: {
      colorHex: plan.colorHex,
      useTexture: plan.useTexture,
      textureDataURL: plan.textureDataURL,
      globalFrontMat: plan.globalFrontMat,
      bodyMat: plan.bodyMat,
      masoniteMat: plan.masoniteMat,
      whiteMat: plan.whiteMat,
      shadowMat: plan.shadowMat,
      legMat: plan.legMat,
    },

    create: {
      createBoard: plan.createBoard,
      createDoorVisual,
      createInternalDrawerBox,
      createHandleMesh,
    },

    resolvers: {
      doorState,
      getPartMaterial: plan.getPartMaterial,
      getPartColorValue: plan.getPartColorValue,
      getHandleType,
      isDoorRemoved,
      isRemoveDoorMode,
      removeDoorsEnabled,
    },

    hinged: {
      useOps: !!useHingedDoorOps,
      opsList: hingedDoorOpsList,
      globalHandleAbsY: globalHingedHandleAbsY,
    },

    fns: {
      getMaterial: getMaterialFn,
      addOutlines,
      addOutlinesMesh,
      buildCornerWing,
      addDimensionLine,
      restoreNotesFromSave,
      addHangingClothes,
      addFoldedClothes,
      addRealisticHanger,
      rebuildDrawerMeta,
      pruneCachesSafe,
      triggerRender,
      showToast,
    },

    notesToPreserve,
  });
}
