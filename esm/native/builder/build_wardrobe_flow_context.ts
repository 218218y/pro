import { makeDoorStateAccessors, makeDoorRemovalChecker } from './doors_state_utils.js';
import {
  isRemoveDoorModeFromSnapshot,
  resolveRemoveDoorsEnabledFromSnapshots,
} from '../features/door_authoring/api.js';
import { resolveBuildFlowPlan } from './build_flow_plan.js';
import { createBuildFlowContext } from './build_flow_context_factory.js';
import { prepareBuildWardrobeContextSetup } from './build_wardrobe_flow_context_setup.js';
import { resolveBuildWardrobeSplitMetrics } from './build_wardrobe_flow_context_split.js';
import {
  computeBuildWardrobeSplitLineY,
  resolveBuildWardrobeCarcassMetrics,
} from './build_wardrobe_flow_context_carcass.js';
import { resolveBuildWardrobeHingedContext } from './build_wardrobe_flow_context_hinged.js';
import { asBuilderDoorMapsConfig, asBuilderOpenStateRecord } from './builder_config_boundary.js';
import { createRoomArchitecturePlanFromBuildSnapshot } from './room_architecture_plan_adapter.js';

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
    renderPolicy,
    createDoorVisual,
  } = prepared;

  const {
    THREE,
    pruneCachesSafe,
    triggerRender,
    showToast,
    createInternalDrawerBox,
    buildCornerWing,
    rebuildDrawerMeta,
    addDimensionLine,
    addHangingClothes,
    addFoldedClothes,
    addRealisticHanger,
    restoreNotesFromSave,
  } = deps;
  const addOutlines = renderPolicy.addOutlines;

  const {
    state,
    ui,
    runtime,
    globalClickMode,
    hadEditHold,
    cfgSnapshot: cfg,
    drawerRebuildSnapshot,
  } = buildState;
  const setup = prepareBuildWardrobeContextSetup(prepared);
  if (!setup) return null;
  const { notesToPreserve, calculateModuleStructureFn, getMaterialFn, addOutlinesMesh, toStr } = setup;

  const doorState = makeDoorStateAccessors(cfg);
  const isRemoveDoorMode = isRemoveDoorModeFromSnapshot(state.mode);
  const roomArchitecturePlan = createRoomArchitecturePlanFromBuildSnapshot({
    cfg,
    widthCm,
    heightCm,
    depthCm,
  });
  const plan = resolveBuildFlowPlan({
    orchestration: prepared.orchestration,
    THREE,
    state,
    ui,
    cfg,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    removablePartInteractionActive: isRemoveDoorMode,
    sketchMode,
    getMaterialFn,
    addOutlines,
    calculateModuleStructureFn,
    toStr,
    doorState,
    roomArchitecturePlan,
  });

  const removeDoorsEnabled = resolveRemoveDoorsEnabledFromSnapshots(ui, state.mode);
  const isDoorRemoved = makeDoorRemovalChecker(cfg);
  const { getHandleType, createHandleMesh } = prepared.orchestration.createHandleBindings({
    THREE,
    addOutlines,
    cfg: asBuilderDoorMapsConfig(cfg),
    doorState,
    stackKey: 'top',
  });

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
    roomArchitecturePlan,
  });

  const { startY, cabinetBodyHeight, cabinetTopY, splitLineY } = resolveBuildWardrobeCarcassMetrics({
    App,
    THREE,
    cfg,
    plan,
    roomArchitecturePlan,
    sketchMode,
    addOutlinesMesh,
  });
  const effectiveSplitUpperStartIndex = plan.stackSplitUnifiedFrame
    ? prepared.orchestration.readWardrobeChildCount()
    : splitUpperStartIndex;
  const topStartY = plan.stackSplitUnifiedFrame ? 0 : startY;
  const topCabinetBodyHeight = plan.stackSplitUnifiedFrame ? plan.H : cabinetBodyHeight;
  const topCabinetTopY = plan.stackSplitUnifiedFrame ? topStartY + topCabinetBodyHeight : cabinetTopY;
  const topSplitLineY = plan.stackSplitUnifiedFrame
    ? computeBuildWardrobeSplitLineY({
        startY: topStartY,
        cabinetBodyHeight: topCabinetBodyHeight,
        woodThick: plan.woodThick,
      })
    : splitLineY;

  const { useHingedDoorOps, hingedDoorOpsList, globalHingedHandleAbsY } = resolveBuildWardrobeHingedContext({
    App,
    cfg,
    plan,
    startY: topStartY,
    splitY,
  });

  const buildCtx = createBuildFlowContext({
    App,
    THREE,
    state,
    ui,
    runtime,
    drawerRebuildSnapshot,
    cfg,
    label,
    plan,
    roomArchitecturePlan,
    widthCm,
    heightCm,
    depthCm,
    doorsCount,
    chestDrawersCount,
    startY: topStartY,
    cabinetBodyHeight: topCabinetBodyHeight,
    cabinetTopY: topCabinetTopY,
    splitLineY: topSplitLineY,
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

  prepared.orchestration.syncNoMainWorkspaceMetrics({
    enabled: plan.noMainWardrobe,
    cfg: asBuilderOpenStateRecord(cfg),
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
    splitUpperStartIndex: effectiveSplitUpperStartIndex,
  };
}
