import { buildStackSplitLowerUnit } from './build_stack_split_pipeline.js';

import type {
  BuilderCalculateModuleStructureFn,
  BuilderDoorStateAccessorsLike,
  ProjectSavedNotesLike,
} from '../../../types';
import type { GetMaterialFn } from './build_flow_readers.js';
import type { BuildFlowPlan } from './build_flow_plan.js';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

export type BuildWardrobeSplitMetrics = {
  splitY: number;
  splitDzTop: number;
  splitUpperStartIndex: number;
};

export function createDefaultBuildWardrobeSplitMetrics(): BuildWardrobeSplitMetrics {
  return {
    splitY: 0,
    splitDzTop: 0,
    splitUpperStartIndex: -1,
  };
}

export function resolveBuildWardrobeSplitMetrics(args: {
  prepared: PreparedBuildWardrobeFlow;
  plan: BuildFlowPlan;
  calculateModuleStructureFn: BuilderCalculateModuleStructureFn | null;
  getMaterialFn: GetMaterialFn;
  addOutlinesMesh: ((mesh: unknown) => unknown) | null;
  createHandleMesh: unknown;
  doorState: BuilderDoorStateAccessorsLike;
  getHandleType: (id: unknown) => unknown;
  isDoorRemoved: (id: string) => boolean;
  isRemoveDoorMode: boolean;
  removeDoorsEnabled: boolean;
  notesToPreserve: ProjectSavedNotesLike | null;
  runSplitBuild?: typeof buildStackSplitLowerUnit;
}): BuildWardrobeSplitMetrics {
  const {
    prepared,
    plan,
    calculateModuleStructureFn,
    getMaterialFn,
    addOutlinesMesh,
    createHandleMesh,
    doorState,
    getHandleType,
    isDoorRemoved,
    isRemoveDoorMode,
    removeDoorsEnabled,
    notesToPreserve,
    runSplitBuild = buildStackSplitLowerUnit,
  } = args;

  if (!plan.splitActiveForBuild) {
    return createDefaultBuildWardrobeSplitMetrics();
  }

  const { App, label, deps, buildState, widthCm, heightCm, depthCm, chestDrawersCount, sketchMode } =
    prepared;
  const {
    THREE,
    addOutlines,
    createDoorVisual,
    createInternalDrawerBox,
    buildCornerWing,
    rebuildDrawerMeta,
    addDimensionLine,
    addHangingClothes,
    addFoldedClothes,
    addRealisticHanger,
    restoreNotesFromSave,
    pruneCachesSafe,
    triggerRender,
    showToast,
  } = deps;
  const { state, ui, runtime, globalClickMode, hadEditHold, cfgSnapshot: cfg } = buildState;

  const splitBuildArgs = {
    App,
    THREE,
    state,
    ui,
    runtime,
    cfg,
    label,
    splitSeamGapM: plan.splitSeamGapM,
    carcassDepthM: plan.carcassD,
    lowerHeightCm: plan.lowerHeightCm,
    lowerDepthCm: plan.lowerDepthCm,
    lowerWidthCm: plan.lowerWidthCm,
    lowerDoorsCount: plan.lowerDoorsCount,
    widthCm,
    heightCm,
    depthCm,
    doorsCount: plan.doorsCount,
    chestDrawersCount,
    woodThick: plan.woodThick,
    depthReduction: plan.depthReduction,
    baseTypeBottom: plan.baseTypeBottom,
    baseLegStyle: plan.baseLegStyle,
    baseLegColor: plan.baseLegColor,
    baseLegHeightCm: plan.baseLegHeightCm,
    baseLegWidthCm: plan.baseLegWidthCm,
    doorStyle: plan.doorStyle,
    stackSplitEnabled: !!plan.stackSplitEnabled,
    handleControlEnabled: !!plan.handleControlEnabled,
    showHangerEnabled: !!plan.showHangerEnabled,
    showContentsEnabled: !!plan.showContentsEnabled,
    splitDoors: !!plan.splitDoors,
    isGroovesEnabled: !!plan.isGroovesEnabled,
    isInternalDrawersEnabled: !!plan.isInternalDrawersEnabled,
    isCornerMode: !!plan.isCornerMode,
    sketchMode,
    globalClickMode: !!globalClickMode,
    hadEditHold: !!hadEditHold,
    hasCornice: false,
    colorHex: plan.colorHex,
    useTexture: plan.useTexture,
    textureDataURL: plan.textureDataURL,
    globalFrontMat: plan.globalFrontMat,
    bodyMat: plan.bodyMat,
    masoniteMat: plan.masoniteMat,
    whiteMat: plan.whiteMat,
    shadowMat: plan.shadowMat,
    legMat: plan.legMat,
    createBoard: plan.createBoard,
    createDoorVisual,
    createInternalDrawerBox,
    createHandleMesh,
    doorState,
    getPartMaterial: plan.getPartMaterial,
    getPartColorValue: plan.getPartColorValue,
    getHandleType,
    isDoorRemoved,
    isRemoveDoorMode,
    removeDoorsEnabled,
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
    calculateModuleStructure: calculateModuleStructureFn,
    notesToPreserve,
  };

  const splitBuild = runSplitBuild(splitBuildArgs);

  return {
    splitY: splitBuild.splitY,
    splitDzTop: splitBuild.splitDzTop,
    splitUpperStartIndex: splitBuild.upperStartIndex,
  };
}
