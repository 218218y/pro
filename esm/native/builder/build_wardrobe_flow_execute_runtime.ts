import { buildModulesLoop } from './module_loop_pipeline.js';
import { applyHingedDoorOpsAfterModules } from './hinged_doors_pipeline.js';
import { applySlidingDoorsIfNeeded } from './sliding_doors_pipeline.js';
import { applyPostBuildExtras } from './post_build_extras_pipeline.js';
import { maybeRenderNoMainSketchHost } from './build_no_main_sketch_host.js';
import { finalizeStackSplitUpperShift } from './build_stack_split_pipeline.js';

import type { BuildContextLike } from '../../../types';
import type { PreparedBuildWardrobeExecution } from './build_wardrobe_flow_context.js';
import type { PreparedBuildWardrobeFlow } from './build_wardrobe_flow_prepare.js';

export function runPreparedBuildWardrobePlan(
  prepared: PreparedBuildWardrobeFlow,
  execution: PreparedBuildWardrobeExecution
): void {
  const { buildCtx, plan } = execution;
  const { App, deps, buildState } = prepared;
  const {
    THREE,
    createInternalDrawerBox,
    addOutlines,
    addHangingClothes,
    addFoldedClothes,
    addRealisticHanger,
  } = deps;
  const { cfgSnapshot: cfg, ui } = buildState;

  if (!plan.noMainWardrobe) {
    buildModulesLoop(buildCtx);
    applyHingedDoorOpsAfterModules(buildCtx);
    applySlidingDoorsIfNeeded(buildCtx);
    return;
  }

  maybeRenderNoMainSketchHost({
    App,
    THREE,
    cfg,
    ui,
    totalW: plan.totalW,
    H: plan.carcassH,
    D: plan.carcassD,
    woodThick: plan.woodThick,
    depthReduction: plan.depthReduction,
    internalDepth: plan.internalDepth,
    internalZ: plan.internalZ,
    bodyMat: plan.bodyMat,
    legMat: plan.legMat,
    createBoard: plan.createBoard,
    getPartMaterial: plan.getPartMaterial,
    getPartColorValue: plan.getPartColorValue,
    createInternalDrawerBox,
    addOutlines,
    addHangingClothes,
    addFoldedClothes,
    addRealisticHanger,
    isInternalDrawersEnabled: plan.isInternalDrawersEnabled,
    showHangerEnabled: plan.showHangerEnabled,
    showContentsEnabled: plan.showContentsEnabled,
  });
}

export function completePreparedBuildWardrobeExecution(
  prepared: PreparedBuildWardrobeFlow,
  execution: PreparedBuildWardrobeExecution
): BuildContextLike {
  const { buildCtx, plan, splitY, splitDzTop, splitUpperStartIndex } = execution;

  finalizeStackSplitUpperShift({
    App: prepared.App,
    buildCtx,
    splitActive: !!plan.splitActiveForBuild,
    splitY,
    splitDzTop,
    upperStartIndex: splitUpperStartIndex,
  });

  applyPostBuildExtras(buildCtx);
  return buildCtx;
}
