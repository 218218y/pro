import {
  makeDoorStateAccessors,
  isRemoveDoorMode as isRemoveDoorModeFn,
  isRemoveDoorsEnabled,
  makeDoorRemovalChecker,
  makeHandleTypeResolver,
} from './doors_state_utils.js';
import { makeHandleCreator } from './handle_factory.js';
import { resolveBuildFlowPlan } from './build_flow_plan.js';
import { createBuildFlowContext } from './build_flow_context_factory.js';
import { prepareBuildWardrobeContextSetup } from './build_wardrobe_flow_context_setup.js';
import { resolveBuildWardrobeSplitMetrics } from './build_wardrobe_flow_context_split.js';
import { resolveBuildWardrobeCarcassMetrics } from './build_wardrobe_flow_context_carcass.js';
import { resolveBuildWardrobeHingedContext } from './build_wardrobe_flow_context_hinged.js';
import { syncNoMainSketchWorkspaceMetrics } from './build_no_main_sketch_host.js';

import type { BuildContextLike } from '../../../types';
import type { BuildFlowPlan } from './build_flow_plan.js';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

export type PreparedBuildWardrobeExecution = {
  buildCtx: BuildContextLike;
  plan: BuildFlowPlan;
  splitY: number;
  splitDzTop: number;
  splitUpperStartIndex: number;
};

export function prepareBuildWardrobeExecution(
  prepared: PreparedBuildWardrobeFlow
): PreparedBuildWardrobeExecution | null {
  const {
    App,
    label,
    deps,
    buildState,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    chestDrawersCount,
    sketchMode,
  } = prepared;

  const {
    THREE,
    pruneCachesSafe,
    triggerRender,
    showToast,
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
  } = deps;

  const { state, ui, runtime, globalClickMode, hadEditHold, cfgSnapshot: cfg } = buildState;
  const setup = prepareBuildWardrobeContextSetup(prepared);
  if (!setup) return null;
  const { notesToPreserve, calculateModuleStructureFn, getMaterialFn, addOutlinesMesh, toStr } = setup;

  const doorState = makeDoorStateAccessors(cfg);
  const plan = resolveBuildFlowPlan({
    App,
    THREE,
    state,
    ui,
    cfg,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    sketchMode,
    getMaterialFn,
    addOutlines,
    calculateModuleStructureFn,
    toStr,
    doorState,
  });

  const isRemoveDoorMode = isRemoveDoorModeFn(App, state);
  const removeDoorsEnabled = isRemoveDoorsEnabled(App, ui, state);
  const isDoorRemoved = makeDoorRemovalChecker(cfg);
  const getHandleType = makeHandleTypeResolver({
    App,
    cfg,
    doorState,
    handleControlEnabled: plan.handleControlEnabled,
    stackKey: 'top',
  });
  const createHandleMesh = makeHandleCreator({ App, THREE, addOutlines });

  const { splitY, splitDzTop, splitUpperStartIndex } = resolveBuildWardrobeSplitMetrics({
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
  });

  const { startY, cabinetBodyHeight, cabinetTopY, splitLineY } = resolveBuildWardrobeCarcassMetrics({
    App,
    THREE,
    cfg,
    plan,
    sketchMode,
    addOutlinesMesh,
  });

  const { useHingedDoorOps, hingedDoorOpsList, globalHingedHandleAbsY } = resolveBuildWardrobeHingedContext({
    App,
    cfg,
    plan,
    startY,
    splitY,
  });

  const buildCtx = createBuildFlowContext({
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
    globalClickMode: !!globalClickMode,
    hadEditHold: !!hadEditHold,
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
    useHingedDoorOps: !!useHingedDoorOps,
    hingedDoorOpsList,
    globalHingedHandleAbsY,
    isDoorRemoved,
    isRemoveDoorMode,
    removeDoorsEnabled,
  });

  syncNoMainSketchWorkspaceMetrics({
    App,
    enabled: plan.noMainWardrobe,
    cfg,
    totalW: plan.totalW,
    H: plan.carcassH,
    woodThick: plan.woodThick,
    internalDepth: plan.internalDepth,
    internalZ: plan.internalZ,
  });

  return {
    buildCtx,
    plan,
    splitY,
    splitDzTop,
    splitUpperStartIndex,
  };
}
