import { getWindowMaybe } from '../runtime/api.js';
import { isCloudSyncLifecycleGuardDisposed } from './cloud_sync_lifecycle_liveness_runtime.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
import {
  readStorageEventLike,
  type CloudSyncDiagStorageListenerArgs,
} from './cloud_sync_lifecycle_attention_shared.js';

export function bindCloudSyncDiagStorageListener(args: CloudSyncDiagStorageListenerArgs): void {
  const { App, runtimeStatus, diagStorageKey, updateDiagEnabled, publishStatus, addListener, isDisposed } =
    args;
  try {
    const w = getWindowMaybe(App);
    const onStorage = (ev: unknown): void => {
      try {
        if (isCloudSyncLifecycleGuardDisposed(isDisposed)) return;
        const rec = readStorageEventLike(ev);
        if (rec && String(rec.key || '') === diagStorageKey) {
          const prevDiagEnabled = !!runtimeStatus.diagEnabled;
          updateDiagEnabled();
          if (!!runtimeStatus.diagEnabled !== prevDiagEnabled) publishStatus();
        }
      } catch (err) {
        _cloudSyncReportNonFatal(App, 'diag.storageListener.callback', err, { throttleMs: 10000 });
      }
    };
    addListener(w, 'storage', onStorage);
  } catch (err) {
    _cloudSyncReportNonFatal(App, 'diag.storageListener.bind', err, { throttleMs: 10000 });
  }
}
