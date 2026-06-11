import type { AppContainer, CloudSyncDiagFn, TimeoutHandleLike } from '../../../types';

import { createCloudSyncPullCoalescer } from './cloud_sync_coalescer.js';
import type { CloudSyncPullScope, CloudSyncPullScopeSpec } from './cloud_sync_pull_scopes.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export function createCloudSyncPullCoalescerFactory(args: {
  App: AppContainer;
  isDisposed: () => boolean;
  isSuppressed: () => boolean;
  isMainPushInFlight: () => boolean;
  subscribeMainPushSettled?: ((listener: () => void) => () => void) | null;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike | undefined) => void;
  diag: CloudSyncDiagFn;
}): (
  scope: CloudSyncPullScope,
  run: () => Promise<void> | void,
  opts?: Pick<CloudSyncPullScopeSpec, 'debounceMs' | 'minGapMs' | 'maxDelayMs'>
) => { trigger: (reason: string, immediate?: boolean) => void; cancel: () => void } {
  const {
    App,
    isDisposed,
    isSuppressed,
    isMainPushInFlight,
    subscribeMainPushSettled,
    setTimeoutFn,
    clearTimeoutFn,
    diag,
  } = args;

  return (
    scope: CloudSyncPullScope,
    run: () => Promise<void> | void,
    opts?: Pick<CloudSyncPullScopeSpec, 'debounceMs' | 'minGapMs' | 'maxDelayMs'>
  ) =>
    createCloudSyncPullCoalescer({
      scope,
      run,
      debounceMs: opts?.debounceMs,
      minGapMs: opts?.minGapMs,
      maxDelayMs: opts?.maxDelayMs,
      isDisposed,
      isSuppressed,
      isMainPushInFlight,
      subscribeMainPushSettled,
      setTimeoutFn,
      clearTimeoutFn,
      reportNonFatal: (op: string, error: unknown) =>
        _cloudSyncReportNonFatal(App, op, error, { throttleMs: 10000, noConsole: true }),
      diag,
    });
}
