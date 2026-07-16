import type {
  BuilderDrawerRebuildSnapshot,
  BuilderRebuildDrawerMetaFn,
  BuildStateResolvedLike,
  ConfigStateLike,
  UiStateLike,
  UnknownRecord,
} from '../../../types';
import type { sanitizeBuildDimsAndSyncRuntime } from './state_sanitize_pipeline.js';

export type BuildFlowFinalizeFallback = {
  pruneCachesSafe: ((scene: unknown) => void) | null;
  drawerRebuildSnapshot: BuilderDrawerRebuildSnapshot | null;
  rebuildDrawerMeta: BuilderRebuildDrawerMetaFn | null;
};

export type BuildFlowOrchestrationContext = Readonly<{
  resolveState: (stateOrOverride: unknown) => BuildStateResolvedLike;
  resetCaches: () => void;
  captureOpenState: () => void;
  publishBuildUi: (ui: UiStateLike | UnknownRecord) => void;
  sanitizeDimensions: (
    ui: UiStateLike | UnknownRecord,
    cfg: ConfigStateLike | UnknownRecord
  ) => ReturnType<typeof sanitizeBuildDimsAndSyncRuntime>;
  reportBuildFailure: (label: string, error: unknown, showToast: unknown) => void;
  reportFinalizeFailure: (label: string, error: unknown) => void;
  finalizeBestEffort: (args: BuildFlowFinalizeFallback) => void;
}>;
