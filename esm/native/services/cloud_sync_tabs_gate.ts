import type {
  AppContainer,
  CloudSyncRuntimeStatus,
  CloudSyncStateRow,
  CloudSyncTabsGateCommandResult,
  CloudSyncTabsGatePayload,
  CloudSyncSite2TabsGateSnapshot,
  CloudSyncUpsertResult,
} from '../../../types';

import {
  createCloudSyncTabsGateLocalState,
  type CloudSyncTabsGateConfig,
  type CloudSyncTabsGateStorageLike as StorageLike,
  type CloudSyncTabsGateTimeoutApi,
} from './cloud_sync_tabs_gate_local.js';
import { createCloudSyncTabsGateRemoteOps } from './cloud_sync_tabs_gate_remote.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';

type GetCloudSyncRow = (restUrl: string, anonKey: string, room: string) => Promise<CloudSyncStateRow | null>;
type UpsertCloudSyncRow = (
  restUrl: string,
  anonKey: string,
  room: string,
  payload: CloudSyncTabsGatePayload,
  opts?: { returnRepresentation?: boolean }
) => Promise<CloudSyncUpsertResult>;

type CreateCloudSyncTabsGateOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncTabsGateConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  restUrl: string;
  clientId: string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  runtimeStatus?: CloudSyncRuntimeStatus;
  publishStatus?: () => void;
} & CloudSyncTabsGateTimeoutApi;

export type CloudSyncTabsGateOps = {
  getSnapshot: () => CloudSyncSite2TabsGateSnapshot;
  subscribeSnapshot: (fn: (snapshot: CloudSyncSite2TabsGateSnapshot) => void) => () => void;
  isTabsGateController: boolean;
  site2TabsTtlMs: number;
  tabsGateOpenRef: { value: boolean };
  tabsGateUntilRef: { value: number };
  writeSite2TabsGateLocal: (open: boolean, until: number) => void;
  patchSite2TabsGateUi: (open: boolean, until: number, by: string) => void;
  pushTabsGateNow: (nextOpen: boolean, untilIn: number) => Promise<CloudSyncTabsGateCommandResult>;
  pullTabsGateOnce: (isInitial: boolean) => Promise<void>;
  dispose: () => void;
};

export function createCloudSyncTabsGateOps(deps: CreateCloudSyncTabsGateOpsDeps): CloudSyncTabsGateOps {
  const {
    App,
    cfg,
    storage,
    getGateBaseRoom,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    setTimeoutFn,
    clearTimeoutFn,
    emitRealtimeHint,
    runtimeStatus,
    publishStatus,
  } = deps;

  const local = createCloudSyncTabsGateLocalState({
    App,
    cfg,
    storage,
    getGateBaseRoom,
    setTimeoutFn,
    clearTimeoutFn,
  });

  const remote = createCloudSyncTabsGateRemoteOps({
    App,
    cfg,
    restUrl,
    clientId,
    getRow,
    upsertRow,
    emitRealtimeHint,
    isTabsGateController: local.isTabsGateController,
    getSite2TabsRoom: local.getSite2TabsRoom,
    writeSite2TabsGateLocal: local.writeSite2TabsGateLocal,
    patchSite2TabsGateUi: local.patchSite2TabsGateUi,
    runtimeStatus,
    publishStatus,
  });

  return {
    getSnapshot: local.getSnapshot,
    subscribeSnapshot: local.subscribeSnapshot,
    isTabsGateController: local.isTabsGateController,
    site2TabsTtlMs: local.site2TabsTtlMs,
    tabsGateOpenRef: local.tabsGateOpenRef,
    tabsGateUntilRef: local.tabsGateUntilRef,
    writeSite2TabsGateLocal: local.writeSite2TabsGateLocal,
    patchSite2TabsGateUi: local.patchSite2TabsGateUi,
    pushTabsGateNow: remote.pushTabsGateNow,
    pullTabsGateOnce: remote.pullTabsGateOnce,
    dispose: local.dispose,
  };
}
