import type { CloudSyncTabsGateCommandResult } from '../../../types';

import { type CreateCloudSyncTabsGateRemoteOpsDeps } from './cloud_sync_tabs_gate_remote_shared.js';
import { createCloudSyncTabsGatePullOnce } from './cloud_sync_tabs_gate_remote_pull.js';
import { createCloudSyncTabsGatePushNow } from './cloud_sync_tabs_gate_remote_push.js';

export function createCloudSyncTabsGateRemoteOps(args: CreateCloudSyncTabsGateRemoteOpsDeps): {
  pushTabsGateNow: (nextOpen: boolean, untilIn: number) => Promise<CloudSyncTabsGateCommandResult>;
  pullTabsGateOnce: (isInitial: boolean) => Promise<void>;
} {
  const lastTabsGateUpdatedAtRef = { value: '' };
  return {
    pushTabsGateNow: createCloudSyncTabsGatePushNow({ ...args, lastTabsGateUpdatedAtRef }),
    pullTabsGateOnce: createCloudSyncTabsGatePullOnce({ ...args, lastTabsGateUpdatedAtRef }),
  };
}
