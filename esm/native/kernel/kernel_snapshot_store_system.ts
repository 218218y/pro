import { readKernelSnapshotBuildState } from './kernel_snapshot_store_build_state.js';
import { createKernelSnapshotStoreCommitOps } from './kernel_snapshot_store_commits.js';

export type {
  CreateKernelSnapshotStoreSystemArgs,
  KernelBuildStateLike,
  KernelSnapshotStoreMetaLike,
  KernelSnapshotStoreSyncOpts,
  KernelSnapshotStoreSystem,
} from './kernel_snapshot_store_contracts.js';
import type {
  CreateKernelSnapshotStoreSystemArgs,
  KernelBuildStateLike,
  KernelSnapshotStoreSystem,
} from './kernel_snapshot_store_contracts.js';

export function createKernelSnapshotStoreSystem(
  args: CreateKernelSnapshotStoreSystemArgs
): KernelSnapshotStoreSystem {
  const captureConfigFn = args.stateKernel?.captureConfig;
  const captureConfig = typeof captureConfigFn === 'function' ? () => captureConfigFn() : null;

  const getBuildState = (override?: unknown): KernelBuildStateLike => {
    try {
      const overrideRec = args.asRecord(override, {});
      const isStateOverride = args.isRecord(override) && ('ui' in overrideRec || 'config' in overrideRec);
      const uiOverride = isStateOverride ? args.asRecord(overrideRec.ui, {}) : args.asRecord(override, {});
      if (
        uiOverride &&
        typeof uiOverride === 'object' &&
        !isStateOverride &&
        !Array.isArray(uiOverride) &&
        !('raw' in uiOverride) &&
        !('width' in uiOverride) &&
        !('height' in uiOverride) &&
        !('depth' in uiOverride) &&
        !('doors' in uiOverride) &&
        ('source' in uiOverride ||
          'reason' in uiOverride ||
          'immediate' in uiOverride ||
          'force' in uiOverride ||
          'noBuild' in uiOverride ||
          'silent' in uiOverride)
      ) {
        const err = new Error(
          '[WardrobePro] getBuildState(uiOverride) received an options-like object. ' +
            'Pass a UI snapshot/patch, or pass { ui, config } if you intend to override state slices.'
        );
        try {
          args.reportKernelError(err, 'kernel.getBuildState.override');
        } catch (_eReportMissingUi) {
          args.reportNonFatal('getBuildState.missingUiAfterOverride.reportError', _eReportMissingUi, {
            throttleMs: 12000,
          });
        }
        throw err;
      }

      return readKernelSnapshotBuildState(
        {
          App: args.App,
          asRecord: args.asRecord,
          asRecordOrNull: args.asRecordOrNull,
          isRecord: args.isRecord,
          reportNonFatal: args.reportNonFatal,
          captureConfig,
        },
        override
      );
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      try {
        if (
          !args.reportKernelError(err, 'kernel.getBuildState') &&
          typeof console !== 'undefined' &&
          console &&
          typeof console.error === 'function'
        ) {
          console.error(err);
        }
      } catch (_eGetBuildStateReport) {
        args.reportNonFatal('getBuildState.outer.reportError', _eGetBuildStateReport, {
          throttleMs: 12000,
        });
      }
      throw err;
    }
  };

  const commitOps = createKernelSnapshotStoreCommitOps({
    App: args.App,
    asRecord: args.asRecord,
    asRecordOrNull: args.asRecordOrNull,
    reportNonFatal: args.reportNonFatal,
    setStoreUiSnapshot: args.setStoreUiSnapshot,
    touchStore: args.touchStore,
    captureConfig,
    setLastCommitAt: timestamp => {
      const stateKernelRec = args.asRecordOrNull(args.stateKernel);
      if (stateKernelRec) stateKernelRec._lastCommitAt = timestamp;
    },
    setLastDirtyReason: reason => {
      const stateKernelRec = args.asRecordOrNull(args.stateKernel);
      if (stateKernelRec) stateKernelRec._lastDirtyReason = reason;
    },
  });

  return {
    getBuildState,
    ...commitOps,
  };
}
