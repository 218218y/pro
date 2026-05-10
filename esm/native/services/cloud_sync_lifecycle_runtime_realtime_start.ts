import type { AppContainer, CloudSyncDiagFn, CloudSyncRuntimeStatus } from '../../../types';

import { normalizeUnknownError } from '../runtime/error_normalization.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import { markCloudSyncRealtimeFailure } from './cloud_sync_lifecycle_realtime_support.js';
import type {
  CloudSyncPollingTransitionFn,
  CloudSyncRealtimeLifecycleOps,
} from './cloud_sync_lifecycle_realtime_shared.js';

export type CloudSyncLifecycleRealtimeStartGuardArgs = {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
  startPolling: CloudSyncPollingTransitionFn;
  cloudSyncRealtime: Pick<CloudSyncRealtimeLifecycleOps, 'startRealtime'>;
  op: string;
  diagEvent: string;
  pollingReason: string;
};

export function startCloudSyncRealtimeWithLifecycleRecovery(
  args: CloudSyncLifecycleRealtimeStartGuardArgs
): void {
  const {
    App,
    runtimeStatus,
    publishStatus,
    diag,
    startPolling,
    cloudSyncRealtime,
    op,
    diagEvent,
    pollingReason,
  } = args;

  const handleRealtimeStartFailure = (err: unknown): void => {
    _cloudSyncReportNonFatal(App, op, err, { throttleMs: 6000 });
    try {
      markCloudSyncRealtimeFailure({
        runtimeStatus,
        publishStatus,
        diag,
        startPolling,
        state: 'error',
        lastError: normalizeUnknownError(err).message,
        diagEvent,
        pollingReason,
      });
    } catch (recoveryErr) {
      _cloudSyncReportNonFatal(App, `${op}.recovery`, recoveryErr, { throttleMs: 6000 });
    }
  };

  try {
    const startResult = cloudSyncRealtime.startRealtime();
    void Promise.resolve(startResult).catch(handleRealtimeStartFailure);
  } catch (err) {
    handleRealtimeStartFailure(err);
  }
}
