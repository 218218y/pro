import type { CloudSyncRuntimeStatus } from '../../../types';

export function readCloudSyncLifecycleLastPullSuccessAt(runtimeStatus: CloudSyncRuntimeStatus): number {
  const value = Number(runtimeStatus.lastPullSuccessAt) || 0;
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

  const lastPullSuccessAt = readCloudSyncLifecycleLastPullSuccessAt(runtimeStatus);
  if (lastPullSuccessAt <= 0) return false;

  const now = typeof args.now === 'number' ? args.now : Date.now();
  return now - lastPullSuccessAt < gapMs;
}
