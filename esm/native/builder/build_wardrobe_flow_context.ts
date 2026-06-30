import {
  makeDoorStateAccessors,
  makeDoorRemovalChecker,
  makeHandleTypeResolver,
} from './doors_state_utils.js';
import {
  isRemoveDoorModeFromSnapshot,
  resolveRemoveDoorsEnabledFromSnapshots,
} from '../features/door_authoring/api.js';
import { bindEdgeHandleDefaultNoneReader } from './edge_handle_default_none_runtime.js';
import { makeHandleCreator } from './handle_factory.js';
import { resolveBuildFlowPlan } from './build_flow_plan.js';
import { createBuildFlowContext } from './build_flow_context_factory.js';
import { prepareBuildWardrobeContextSetup } from './build_wardrobe_flow_context_setup.js';
import { resolveBuildWardrobeSplitMetrics } from './build_wardrobe_flow_context_split.js';
import {
  computeBuildWardrobeSplitLineY,
  resolveBuildWardrobeCarcassMetrics,
} from './build_wardrobe_flow_context_carcass.js';
import { resolveBuildWardrobeHingedContext } from './build_wardrobe_flow_context_hinged.js';
import { syncNoMainSketchWorkspaceMetrics } from './build_no_main_sketch_host.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import { readRecord, readUnknownArray } from './build_flow_readers.js';

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

function getWardrobeChildCount(App: unknown): number {
  const group = readRecord(getWardrobeGroup(App));
  return group ? readUnknownArray(group.children).length : -1;
}

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

  const isRemoveDoorMode = isRemoveDoorModeFromSnapshot(state.mode);
  const removeDoorsEnabled = resolveRemoveDoorsEnabledFromSnapshots(ui, state.mode);
  const isDoorRemoved = makeDoorRemovalChecker(cfg);
  const getHandleType = makeHandleTypeResolver({
    cfg,
    doorState,
    isEdgeHandleDefaultNone: bindEdgeHandleDefaultNoneReader(App, 'top'),
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
  const effectiveSplitUpperStartIndex = plan.stackSplitUnifiedFrame
    ? getWardrobeChildCount(App)
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
    splitUpperStartIndex: effectiveSplitUpperStartIndex,
  };
}
