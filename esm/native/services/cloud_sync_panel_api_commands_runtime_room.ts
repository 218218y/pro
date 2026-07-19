import type {
  CloudSyncPanelApiDeps,
  CloudSyncRoomModeCommandResult,
  CloudSyncRuntimeStatus,
  CloudSyncShareLinkCommandResult,
} from '../../../types';

import { runCloudSyncCopyShareLinkCommand, runCloudSyncRoomModeCommand } from './cloud_sync_room_commands.js';
import { CLOUD_SYNC_DIAG_LS_KEY } from './cloud_sync_panel_api_commands_runtime_shared.js';
import {
  cloneCloudSyncRuntimeStatus,
  type CloudSyncPanelApiRuntimeShared,
} from './cloud_sync_panel_api_commands_runtime_shared.js';
import { readCloudSyncErrorMessage } from './cloud_sync_support.js';
import { buildCloudSyncCredentialStatus } from './cloud_sync_room_credentials.js';
import type { CloudSyncPanelSnapshotController } from './cloud_sync_panel_api_snapshots.js';

export type CloudSyncPanelApiRoomCommands = Pick<
  import('./cloud_sync_panel_api_commands_runtime_shared.js').CloudSyncPanelApiRuntimeCommands,
  | 'getCurrentRoom'
  | 'getPublicRoom'
  | 'getRoomParam'
  | 'getSyncRuntimeStatus'
  | 'setDiagnosticsEnabled'
  | 'goPublic'
  | 'goPrivate'
  | 'resolveConflict'
  | 'getShareLink'
  | 'copyShareLink'
>;

export function createCloudSyncPanelApiRoomCommands(
  deps: CloudSyncPanelApiDeps,
  snapshots: CloudSyncPanelSnapshotController,
  shared: CloudSyncPanelApiRuntimeShared
): CloudSyncPanelApiRoomCommands {
  const {
    App,
    cfg,
    getCurrentRoom,
    getCurrentRoomCredential,
    getPrivateRoomCredential,
    setPrivateRoomCredential,
    issuePrivateRoom,
    resolveConflict,
    setRoomCredentialInUrl,
    reinstallOwnerForRoomChange,
    cloneRuntimeStatus,
    runtimeStatus,
    publishStatus,
    diag,
    reportNonFatal,
  } = deps;

  const runRoomMode = async (mode: 'public' | 'private'): Promise<CloudSyncRoomModeCommandResult> => {
    const result = await runCloudSyncRoomModeCommand(
      {
        App,
        cfg,
        getCurrentRoom,
        getCurrentRoomCredential,
        getPrivateRoomCredential,
        setPrivateRoomCredential,
        issuePrivateRoom,
        setRoomCredentialInUrl,
        reportNonFatal,
      },
      mode
    );
    if (!result.ok) return result;

    runtimeStatus.room = result.room;
    runtimeStatus.credential = buildCloudSyncCredentialStatus({
      isPublic: mode === 'public',
      credential: mode === 'private' ? getPrivateRoomCredential() : null,
      now: deps.now(),
    });
    publishStatus();
    snapshots.publishPanelSnapshot(result.room || (mode === 'public' ? cfg.publicRoom : getCurrentRoom()));

    if (!result.changed) return result;

    try {
      await reinstallOwnerForRoomChange(result.room);
      return result;
    } catch (__wpErr) {
      reportNonFatal(App, 'services/cloud_sync.ts:roomOwnerReinstall', __wpErr, { throttleMs: 4000 });
      return {
        ...result,
        ok: false,
        reason: 'error',
        message: readCloudSyncErrorMessage(__wpErr),
      };
    }
  };

  return {
    getCurrentRoom: (): string => getCurrentRoom(),
    getPublicRoom: (): string => cfg.publicRoom,
    getRoomParam: (): string => cfg.roomParam,

    getSyncRuntimeStatus: (): CloudSyncRuntimeStatus => {
      try {
        if (shared.syncRuntimeDiagnosticsEnabled()) publishStatus();
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('getSyncRuntimeStatus'), __wpErr, { throttleMs: 4000 });
      }
      return cloneCloudSyncRuntimeStatus(cloneRuntimeStatus, runtimeStatus);
    },

    setDiagnosticsEnabled: (enabled: boolean): void => {
      try {
        const ls = shared.readDiagStorage();
        if (ls) ls.setItem?.(CLOUD_SYNC_DIAG_LS_KEY, enabled ? '1' : '0');
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('setDiagnosticsEnabled.storage'), __wpErr, {
          throttleMs: 4000,
        });
      }
      const diagChanged = shared.syncRuntimeDiagnosticsEnabled();
      if (diagChanged) {
        publishStatus();
        diag('diagnostics', enabled ? 'enabled' : 'disabled');
      }
    },

    goPublic: (): Promise<CloudSyncRoomModeCommandResult> => runRoomMode('public'),
    goPrivate: (): Promise<CloudSyncRoomModeCommandResult> => runRoomMode('private'),
    resolveConflict,

    getShareLink: (): string => {
      try {
        return shared.computeShareLink();
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('getShareLink'), __wpErr, { throttleMs: 4000 });
        return '';
      }
    },

    copyShareLink: async (): Promise<CloudSyncShareLinkCommandResult> => {
      try {
        return await runCloudSyncCopyShareLinkCommand({
          App,
          getShareLink: shared.computeShareLink,
          readClipboard: shared.readClipboard,
          readPromptSink: shared.readPromptSink,
          reportNonFatal,
        });
      } catch (__wpErr) {
        reportNonFatal(App, shared.panelApiOp('copyShareLink'), __wpErr, { throttleMs: 4000 });
        return { ok: false, reason: 'error', message: readCloudSyncErrorMessage(__wpErr) };
      }
    },
  };
}
