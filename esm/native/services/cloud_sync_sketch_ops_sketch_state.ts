import type {
  AppContainer,
  CloudSyncDiagFn,
  CloudSyncRuntimeStatus,
  CloudSyncSketchCommandResult,
} from '../../../types';

import type { CloudSyncRealtimeHintSender } from './cloud_sync_pull_scopes.js';
import type {
  CloudSyncSketchConfig,
  GetCloudSyncRow,
  StorageLike,
  UpsertCloudSyncRow,
} from './cloud_sync_sketch_ops_shared.js';

export type CreateCloudSyncSketchRoomOpsDeps = {
  App: AppContainer;
  cfg: CloudSyncSketchConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  restUrl: string;
  clientId: string;
  currentRoom: () => string;
  getRow: GetCloudSyncRow;
  upsertRow: UpsertCloudSyncRow;
  emitRealtimeHint: CloudSyncRealtimeHintSender;
  runtimeStatus: CloudSyncRuntimeStatus;
  publishStatus: () => void;
  diag: CloudSyncDiagFn;
};

export type CloudSyncSketchRoomOps = {
  syncSketchNow: () => Promise<CloudSyncSketchCommandResult>;
  pullSketchOnce: (isInitial: boolean) => Promise<void>;
};

export type CloudSyncSketchRoomMutableState = {
  sketchBaselineDone: boolean;
  lastSketchPullUpdatedAt: string;
  lastSettledRemoteSketchFingerprint: string;
};

export function createCloudSyncSketchRoomMutableState(): CloudSyncSketchRoomMutableState {
  return {
    sketchBaselineDone: false,
    lastSketchPullUpdatedAt: '',
    lastSettledRemoteSketchFingerprint: '',
  };
}

export function rememberSettledRemoteSketchFingerprint(
  state: CloudSyncSketchRoomMutableState,
  fingerprint: string
): void {
  state.lastSettledRemoteSketchFingerprint = typeof fingerprint === 'string' ? fingerprint : '';
}

export function rememberSettledFingerprintIfPresent(
  state: CloudSyncSketchRoomMutableState,
  fingerprint: string
): void {
  if (fingerprint) rememberSettledRemoteSketchFingerprint(state, fingerprint);
}
