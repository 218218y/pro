import type { CloudSyncDiagFn, CloudSyncDiagPayload, CloudSyncRuntimeStatus } from '../../../types';

export type CloudSyncLifecyclePhase =
  | 'disabled'
  | 'polling-only'
  | 'realtime-connecting'
  | 'realtime-live'
  | 'realtime-recovering'
  | 'idle';

export type CloudSyncLifecycleSnapshot = {
  phase: CloudSyncLifecyclePhase;
  enabled: boolean;
  mode: CloudSyncRuntimeStatus['realtime']['mode'];
  state: CloudSyncRuntimeStatus['realtime']['state'];
  channel: string;
  pollingActive: boolean;
  pollingIntervalMs: number;
  pollingReason: string;
  lastError: string;
};

export function resolveCloudSyncLifecyclePhase(
  snapshot: Pick<CloudSyncLifecycleSnapshot, 'enabled' | 'state' | 'channel' | 'pollingActive'>
): CloudSyncLifecyclePhase {
  const { enabled, state, channel, pollingActive } = snapshot;
  if (!enabled && state === 'disabled') return pollingActive ? 'polling-only' : 'disabled';
  if (enabled && state === 'subscribed' && channel) return 'realtime-live';
  if (enabled && state === 'connecting') return 'realtime-connecting';
  if (pollingActive) return 'polling-only';
  if (enabled && state && state !== 'init') return 'realtime-recovering';
  return 'idle';
}

export function readCloudSyncLifecycleSnapshot(
  runtimeStatus: CloudSyncRuntimeStatus
): CloudSyncLifecycleSnapshot {
  const enabled = !!runtimeStatus.realtime?.enabled;
  const mode = runtimeStatus.realtime?.mode === 'broadcast' ? 'broadcast' : 'broadcast';
  const state = String(runtimeStatus.realtime?.state || '');
  const channel = String(runtimeStatus.realtime?.channel || '');
  const pollingActive = !!runtimeStatus.polling?.active;
  const pollingIntervalMs = Number(runtimeStatus.polling?.intervalMs) || 0;
  const pollingReason = String(runtimeStatus.polling?.reason || '');
  const lastError = String(runtimeStatus.lastError || '');
  return {
    phase: resolveCloudSyncLifecyclePhase({
      enabled,
      state,
      channel,
      pollingActive,
    }),
    enabled,
    mode,
    state,
    channel,
    pollingActive,
    pollingIntervalMs,
    pollingReason,
    lastError,
  };
}

export function hasCloudSyncLifecycleSnapshotChanged(
  left: CloudSyncLifecycleSnapshot,
  right: CloudSyncLifecycleSnapshot
): boolean {
  return (
    left.phase !== right.phase ||
    left.enabled !== right.enabled ||
    left.mode !== right.mode ||
    left.state !== right.state ||
    left.channel !== right.channel ||
    left.pollingActive !== right.pollingActive ||
    left.pollingIntervalMs !== right.pollingIntervalMs ||
    left.pollingReason !== right.pollingReason ||
    left.lastError !== right.lastError
  );
}

export function mutateCloudSyncLifecycleSnapshot(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  mutate: () => void;
  diag?: CloudSyncDiagFn;
  diagEvent?: string;
  diagPayload?: CloudSyncDiagPayload;
}): {
  changed: boolean;
  before: CloudSyncLifecycleSnapshot;
  after: CloudSyncLifecycleSnapshot;
} {
  const { runtimeStatus, publishStatus, mutate, diag, diagEvent, diagPayload } = args;
  const before = readCloudSyncLifecycleSnapshot(runtimeStatus);
  mutate();
  const after = readCloudSyncLifecycleSnapshot(runtimeStatus);
  const changed = hasCloudSyncLifecycleSnapshotChanged(before, after);
  if (changed) publishStatus();
  if (changed && diagEvent && typeof diag === 'function') diag(diagEvent, diagPayload);
  return {
    changed,
    before,
    after,
  };
}
