import type {
  BuilderDoorMapsConfigLike,
  BuilderDoorStateAccessorsLike,
  BuilderDrawerRebuildSnapshot,
  BuilderHandleTypeResolver,
  BuilderOutlineFn,
  BuilderRebuildDrawerMetaFn,
  BuildStateResolvedLike,
  ConfigStateLike,
  ThreeLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type {
  NoMainSketchRenderInput,
  NoMainSketchWorkspaceMetricsInput,
} from './build_no_main_sketch_host.js';
import type { FinalizeStackSplitUpperShiftArgs } from './build_stack_split_shared.js';
import type { EdgeHandleDefaultNoneStackKey } from './edge_handle_default_none_runtime.js';
import type { BuildFlowPlanInfrastructurePorts } from './build_flow_plan_contracts.js';
import type { makeHandleCreator } from './handle_factory.js';
import type { BuildChestModeInput } from './chest_mode_pipeline.js';
import type { PrepareBuildSceneInput, PrepareBuildSceneResult } from './pre_build_reset.js';
import type { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';

export type BuildFlowFinalizeBestEffort = {
  pruneCachesSafe: ((scene: unknown) => void) | null;
  drawerRebuildSnapshot: BuilderDrawerRebuildSnapshot | null;
  rebuildDrawerMeta: BuilderRebuildDrawerMetaFn | null;
};

export type BuildFlowSecondaryFailureContext = Readonly<{
  operation: 'build-failure-report' | 'finalize-failure-report' | 'toast';
  originalError?: unknown;
}>;

export type BuildFlowHandleBindings = Readonly<{
  getHandleType: BuilderHandleTypeResolver;
  createHandleMesh: ReturnType<typeof makeHandleCreator>;
}>;

export type BuildFlowHandleBindingsInput = Readonly<{
  THREE: ThreeLike;
  addOutlines: BuilderOutlineFn;
  cfg: BuilderDoorMapsConfigLike;
  doorState: BuilderDoorStateAccessorsLike;
  stackKey: EdgeHandleDefaultNoneStackKey;
}>;

export type BuildFlowStackSplitUpperFinalizeInput = Omit<FinalizeStackSplitUpperShiftArgs, 'App'>;

export type BuildFlowOrchestrationContext = Readonly<{
  resolveState: (stateOrOverride: unknown) => BuildStateResolvedLike;
  resetCaches: () => void;
  captureOpenState: () => void;
  publishBuildUi: (ui: UiStateLike | UnknownRecord) => void;
  sanitizeDimensions: (
    ui: UiStateLike | UnknownRecord,
    cfg: ConfigStateLike | UnknownRecord
  ) => ReturnType<typeof sanitizeBuildDimsAndSyncRuntime>;
  readWardrobeChildCount: () => number;
  prepareScene: (input: PrepareBuildSceneInput) => PrepareBuildSceneResult;
  buildChestModeIfNeeded: (input: BuildChestModeInput) => boolean;
  createHandleBindings: (input: BuildFlowHandleBindingsInput) => BuildFlowHandleBindings;
  syncNoMainWorkspaceMetrics: (input: NoMainSketchWorkspaceMetricsInput) => void;
  renderNoMainSketchHost: (input: NoMainSketchRenderInput) => boolean;
  finalizeStackSplitUpperShift: (input: BuildFlowStackSplitUpperFinalizeInput) => void;
  beginConstructionCorrectionFeedback: () => void;
  completeConstructionCorrectionFeedback: (publish: boolean) => void;
  reportBuildFailure: (label: string, error: unknown, showToast: unknown) => void;
  reportFinalizeFailure: (label: string, error: unknown) => void;
  reportSecondaryFailure: (label: string, error: unknown, context: BuildFlowSecondaryFailureContext) => void;
  finalizeBestEffort: (args: BuildFlowFinalizeBestEffort) => void;
}> &
  BuildFlowPlanInfrastructurePorts;
