import type {
  AppContainer,
  CloudSyncRuntimeStatus,
  CloudSyncStateRow,
  CloudSyncTabsGateCommandResult,
  CloudSyncTabsGatePayload,
  CloudSyncUpsertResult,
} from '../../../types';

import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import type { CloudSyncTabsGateConfig } from './cloud_sync_tabs_gate_shared.js';
import type { CloudSyncAsyncFamilyFlight } from './cloud_sync_async_singleflight.js';

export type GetCloudSyncRow = (
  restUrl: string,
  anonKey: string,
  room: string
) => Promise<CloudSyncStateRow | null>;

export type UpsertCloudSyncRow = (
  restUrl: string,
  anonKey: string,
  room: string,
  payload: CloudSyncTabsGatePayload,
  opts?: { returnRepresentation?: boolean }
) => Promise<CloudSyncUpsertResult>;

export type CloudSyncTabsGateRemoteKey = 'open' | 'close';

export type CreateCloudSyncTabsGateRemoteOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncTabsGateConfig;
  restUrl: string;
  clientId: string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  isTabsGateController: boolean;
  getSite2TabsRoom: () => string;
  writeSite2TabsGateLocal: (open: boolean, until: number) => void;
  patchSite2TabsGateUi: (open: boolean, until: number, by: string) => void;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
};

export const cloudSyncTabsGateRemoteFlights = new WeakMap<
  object,
  CloudSyncAsyncFamilyFlight<CloudSyncTabsGateCommandResult, CloudSyncTabsGateRemoteKey>
>();
