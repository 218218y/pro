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
    getPrivateRoom,
    setPrivateRoom,
    randomRoomId,
    setRoomInUrl,
    cloneRuntimeStatus,
    runtimeStatus,
    publishStatus,
    diag,
    reportNonFatal,
  } = deps;

  const runRoomMode = (mode: 'public' | 'private'): CloudSyncRoomModeCommandResult => {
    const result = runCloudSyncRoomModeCommand(
      {
        App,
        cfg,
        getCurrentRoom,
        getPrivateRoom,
        setPrivateRoom,
        randomRoomId,
        setRoomInUrl,
        reportNonFatal,
      },
      mode
    );
    if (result.ok)
      snapshots.publishPanelSnapshot(result.room || (mode === 'public' ? cfg.publicRoom : getCurrentRoom()));
    return result;
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

    goPublic: (): CloudSyncRoomModeCommandResult => runRoomMode('public'),
    goPrivate: (): CloudSyncRoomModeCommandResult => runRoomMode('private'),

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
