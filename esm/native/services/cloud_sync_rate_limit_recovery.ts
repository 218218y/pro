import type { CloudSyncRuntimeStatus, TimeoutHandleLike } from '../../../types';

export type CloudSyncRateLimitRecovery = {
  observe: (status?: CloudSyncRuntimeStatus) => void;
  dispose: () => void;
};

export function createCloudSyncRateLimitRecovery(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  subscribeRuntimeStatus: (listener: (status: CloudSyncRuntimeStatus) => void) => () => void;
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (handle: TimeoutHandleLike | null | undefined) => void;
  isLive: () => boolean;
  pushMainNow: () => Promise<void>;
  pullAllNow: (opts: { includeControls: boolean; reason: string }) => void;
  reportFailure: (error: unknown) => void;
  now?: () => number;
}): CloudSyncRateLimitRecovery {
  const now = args.now || Date.now;
  let timer: TimeoutHandleLike | null = null;
  let scheduledRetryAt = 0;
  let disposed = false;

  const clearScheduledRetry = (): void => {
    if (timer != null) args.clearTimeoutFn(timer);
    timer = null;
    scheduledRetryAt = 0;
  };

  const observe = (status: CloudSyncRuntimeStatus = args.runtimeStatus): void => {
    if (disposed || !args.isLive()) {
      clearScheduledRetry();
      return;
    }
    const credential = status.credential;
    const retryAt = Number(credential?.retryAt) || 0;
    if (credential?.state !== 'rate-limited' || retryAt <= now()) {
      if (credential?.state !== 'rate-limited') clearScheduledRetry();
      return;
    }
    if (timer != null && scheduledRetryAt === retryAt) return;
    clearScheduledRetry();
    scheduledRetryAt = retryAt;
    timer = args.setTimeoutFn(
      () => {
        timer = null;
        scheduledRetryAt = 0;
        if (disposed || !args.isLive()) return;
        const remainingMs = (Number(args.runtimeStatus.credential?.retryAt) || 0) - now();
        if (args.runtimeStatus.credential?.state === 'rate-limited' && remainingMs > 0) {
          observe(args.runtimeStatus);
          return;
        }
        void Promise.resolve(args.pushMainNow())
          .catch(args.reportFailure)
          .then(() => {
            if (!disposed && args.isLive()) {
              args.pullAllNow({ includeControls: true, reason: 'rate-limit-recovery' });
            }
          });
      },
      Math.max(0, retryAt - now())
    );
  };

  const unsubscribe = args.subscribeRuntimeStatus(observe);
  observe(args.runtimeStatus);

  return {
    observe,
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      clearScheduledRetry();
      unsubscribe();
    },
  };
}
