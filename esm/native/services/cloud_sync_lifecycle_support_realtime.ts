import type { CloudSyncRuntimeStatus } from '../../../types';

function isMutableRealtimeBranch(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRealtimeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function readRealtimeString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

function readRealtimeMode(value: unknown, fallback: 'broadcast'): 'broadcast' {
  return value === 'broadcast' ? 'broadcast' : fallback;
}

export function syncCloudSyncRealtimeStatusInPlace(args: {
  runtimeStatus: CloudSyncRuntimeStatus;
  enabled?: boolean;
  mode?: string;
  state?: string;
  channel?: string;
}): CloudSyncRuntimeStatus['realtime'] {
  const { runtimeStatus } = args;
  const branch = isMutableRealtimeBranch(runtimeStatus.realtime)
    ? runtimeStatus.realtime
    : ({} as Record<string, unknown>);

  for (const key of Object.keys(branch)) {
    if (key === 'enabled' || key === 'mode' || key === 'state' || key === 'channel') continue;
    delete branch[key];
  }

  branch.enabled =
    typeof args.enabled === 'boolean' ? args.enabled : readRealtimeBoolean(branch.enabled, false);
  branch.mode = readRealtimeMode(args.mode, readRealtimeMode(branch.mode, 'broadcast'));
  branch.state = readRealtimeString(args.state, readRealtimeString(branch.state, ''));
  branch.channel = readRealtimeString(args.channel, readRealtimeString(branch.channel, ''));
  runtimeStatus.realtime = branch as CloudSyncRuntimeStatus['realtime'];
  return runtimeStatus.realtime;
}
