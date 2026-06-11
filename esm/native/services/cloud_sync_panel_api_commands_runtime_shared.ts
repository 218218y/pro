import type {
  CloudSyncDeleteTempResult,
  CloudSyncPanelApiDeps,
  CloudSyncRuntimeStatus,
  CloudSyncServiceLike,
  CloudSyncSyncPinCommandResult,
} from '../../../types';

import {
  buildCloudSyncPanelApiOp,
  CLOUD_SYNC_DIAG_LS_KEY,
  getCloudSyncClipboardMaybe,
  getCloudSyncDiagStorageMaybe,
  getCloudSyncPromptSinkMaybe,
} from './cloud_sync_panel_api_support.js';
import { buildCloudSyncShareLink } from './cloud_sync_room_commands.js';
import { readCloudSyncErrorMessage } from './cloud_sync_support.js';

export { CLOUD_SYNC_DIAG_LS_KEY };

export type CloudSyncPanelApiRuntimeCommands = Required<
  Pick<
    CloudSyncServiceLike,
    | 'getCurrentRoom'
    | 'getPublicRoom'
    | 'getRoomParam'
    | 'getSyncRuntimeStatus'
    | 'setDiagnosticsEnabled'
    | 'goPublic'
    | 'goPrivate'
    | 'getShareLink'
    | 'copyShareLink'
    | 'syncSketchNow'
    | 'isFloatingSketchSyncEnabled'
    | 'setFloatingSketchSyncEnabled'
    | 'toggleFloatingSketchSyncEnabled'
    | 'subscribeFloatingSketchSyncEnabled'
    | 'deleteTemporaryModels'
    | 'deleteTemporaryColors'
  >
>;

export type CloudSyncPanelApiRuntimeShared = {
  panelApiOp: (name: string) => string;
  readDiagStorage: () => ReturnType<typeof getCloudSyncDiagStorageMaybe>;
  readClipboard: () => ReturnType<typeof getCloudSyncClipboardMaybe>;
  readPromptSink: () => ReturnType<typeof getCloudSyncPromptSinkMaybe>;
  computeShareLink: () => string;
  syncRuntimeDiagnosticsEnabled: () => boolean;
  readDeleteTempFailure: (__wpErr: unknown) => CloudSyncDeleteTempResult;
  readSyncPinFailure: (__wpErr: unknown) => CloudSyncSyncPinCommandResult;
};

export function createCloudSyncPanelApiRuntimeShared(
  deps: CloudSyncPanelApiDeps
): CloudSyncPanelApiRuntimeShared {
  const {
    cfg,
    getCurrentRoom,
    runtimeStatus,
    updateDiagEnabled,
    getDiagStorageMaybe: readDiagStorageMaybe,
    getClipboardMaybe: readClipboardMaybe,
    getPromptSinkMaybe: readPromptSinkMaybe,
  } = deps;

  return {
    panelApiOp: (name: string): string => buildCloudSyncPanelApiOp(name),
    readDiagStorage: () => getCloudSyncDiagStorageMaybe(readDiagStorageMaybe),
    readClipboard: () => getCloudSyncClipboardMaybe(readClipboardMaybe),
    readPromptSink: () => getCloudSyncPromptSinkMaybe(readPromptSinkMaybe),
    computeShareLink: (): string => buildCloudSyncShareLink(cfg, getCurrentRoom()),
    syncRuntimeDiagnosticsEnabled: (): boolean => {
      const prevDiagEnabled = !!runtimeStatus.diagEnabled;
      updateDiagEnabled();
      return !!runtimeStatus.diagEnabled !== prevDiagEnabled;
    },
    readDeleteTempFailure: (__wpErr: unknown): CloudSyncDeleteTempResult => ({
      ok: false,
      removed: 0,
      reason: 'error',
      message: readCloudSyncErrorMessage(__wpErr),
    }),
    readSyncPinFailure: (__wpErr: unknown): CloudSyncSyncPinCommandResult => ({
      ok: false,
      reason: 'error',
      message: readCloudSyncErrorMessage(__wpErr),
    }),
  };
}

export function cloneCloudSyncRuntimeStatus(
  cloneRuntimeStatus: CloudSyncPanelApiDeps['cloneRuntimeStatus'],
  runtimeStatus: CloudSyncRuntimeStatus
): CloudSyncRuntimeStatus {
  return cloneRuntimeStatus(runtimeStatus);
}
