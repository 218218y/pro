import type { IntervalHandleLike, CloudSyncRuntimeStatus } from '../../../types';

export type CloudSyncLifecyclePollingStatusArgs = {
  runtimeStatus: CloudSyncRuntimeStatus;
  active: boolean;
  intervalMs: number;
  reason: string;
};

export type CloudSyncLifecyclePollingControlArgs = {
  pollTimerRef: { current: IntervalHandleLike | null };
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
  runtimeStatus: CloudSyncRuntimeStatus;
  pollIntervalMs: number;
  publishStatus: () => void;
  reason: string;
  publish?: boolean;
};

export function isMutablePollingBranch(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function syncCloudSyncPollingStatusInPlace(
  args: CloudSyncLifecyclePollingStatusArgs
): CloudSyncRuntimeStatus['polling'] {
  const { runtimeStatus, active, intervalMs, reason } = args;
  const branch = isMutablePollingBranch(runtimeStatus.polling)
    ? runtimeStatus.polling
    : ({} as Record<string, unknown>);

  for (const key of Object.keys(branch)) {
    if (key === 'active' || key === 'intervalMs' || key === 'reason') continue;
    delete branch[key];
  }

  branch.active = active;
  branch.intervalMs = intervalMs;
  branch.reason = String(reason || '');
  runtimeStatus.polling = branch as CloudSyncRuntimeStatus['polling'];
  return runtimeStatus.polling;
}

export function hasCanonicalPollingStatus(args: CloudSyncLifecyclePollingStatusArgs): boolean {
  const { runtimeStatus, active, intervalMs, reason } = args;
  const branch = runtimeStatus.polling;
  if (!isMutablePollingBranch(branch)) return false;
  const keys = Object.keys(branch);
  if (keys.length !== 3) return false;
  return (
    typeof branch.active === 'boolean' &&
    branch.active === active &&
    typeof branch.intervalMs === 'number' &&
    branch.intervalMs === intervalMs &&
    typeof branch.reason === 'string' &&
    branch.reason === String(reason || '')
  );
}

export function clearCloudSyncPollingTimer(args: {
  pollTimerRef: { current: IntervalHandleLike | null };
  clearIntervalFn: (id: IntervalHandleLike | null | undefined) => void;
}): boolean {
  const { pollTimerRef, clearIntervalFn } = args;
  if (!pollTimerRef.current) return false;
  clearIntervalFn(pollTimerRef.current);
  pollTimerRef.current = null;
  return true;
}
