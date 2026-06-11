import type { CloudSyncRuntimeStatus } from '../../../types';

export function readCloudSyncLifecycleLastPullAt(runtimeStatus: CloudSyncRuntimeStatus): number {
  const value = Number(runtimeStatus.lastPullAt) || 0;
  return value > 0 ? value : 0;
}

export function hasCloudSyncLifecycleRecentPull(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  minGapMs: number;
  now?: number;
}): boolean {
  const { runtimeStatus, minGapMs } = args;
  const gapMs = Number(minGapMs) || 0;
  if (gapMs <= 0) return false;

  const lastPullAt = readCloudSyncLifecycleLastPullAt(runtimeStatus);
  if (lastPullAt <= 0) return false;

  const now = typeof args.now === 'number' ? args.now : Date.now();
  return now - lastPullAt < gapMs;
}
