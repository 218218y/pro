import type {
  AppContainer,
  CloudSyncRuntimeStatus,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncDiagFn,
} from '../../../types';

import {
  createCloudSyncFloatingSketchSyncOps,
  type CloudSyncFloatingSketchSyncOps,
} from './cloud_sync_sketch_ops_floating.js';
import { createCloudSyncSketchRoomOps, type CloudSyncSketchRoomOps } from './cloud_sync_sketch_ops_sketch.js';
import {
  createCloudSyncShowContentsOps,
  type CloudSyncShowContentsOps,
} from './cloud_sync_show_contents_ops.js';
import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import {
  type CloudSyncSketchConfig,
  type GetCloudSyncRow,
  type StorageLike,
  type UpsertCloudSyncRow,
} from './cloud_sync_sketch_ops_shared.js';

type CreateCloudSyncSketchOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncSketchConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  gatewayUrl: string;
  clientId: string;
  currentRoom: () => string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
};

export type CloudSyncSketchOps = {
  syncSketchNow: () => Promise<CloudSyncSketchCommandResult>;
  pullSketchOnce: (isInitial: boolean) => Promise<void>;
  pushFloatingSketchSyncPinnedNow: (enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>;
  pullFloatingSketchSyncPinnedOnce: (isInitial: boolean) => Promise<void>;
  getFloatingSketchSyncEnabled: () => boolean;
  setFloatingSketchSyncEnabledState: (enabled: boolean) => boolean;
  subscribeFloatingSketchSyncEnabledState: (fn: (enabled: boolean) => void) => () => void;
  dispose: () => void;
};

export function createCloudSyncSketchOps(deps: CreateCloudSyncSketchOpsDeps): CloudSyncSketchOps {
  const cloudSketchRoomOps: CloudSyncSketchRoomOps = createCloudSyncSketchRoomOps(deps);
  const floatingSketchSyncOps: CloudSyncFloatingSketchSyncOps = createCloudSyncFloatingSketchSyncOps(deps);
  const showContentsOps: CloudSyncShowContentsOps = createCloudSyncShowContentsOps(deps);

  return {
    ...cloudSketchRoomOps,
    ...floatingSketchSyncOps,
    pullFloatingSketchSyncPinnedOnce: async (isInitial: boolean): Promise<void> => {
      await floatingSketchSyncOps.pullFloatingSketchSyncPinnedOnce(isInitial);
      await showContentsOps.pullShowContentsSyncedOnce(isInitial);
    },
    dispose: () => {
      floatingSketchSyncOps.dispose();
      showContentsOps.dispose();
    },
  };
}
