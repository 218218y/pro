import type {
  ActionMetaLike,
  AppContainer,
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../../types';

import { normalizeUnknownError } from '../../services/api.js';

export type CloudSyncUiFeedbackLike = {
  toast?: ((message: string, type?: string) => void) | null;
};

export type CloudSyncUiActionController = {
  toggleRoomMode: (isPublic: boolean | null | undefined) => CloudSyncRoomModeCommandResult;
  copyShareLink: () => Promise<void>;
  syncSketch: () => Promise<void>;
  deleteTemporaryModels: () => Promise<void>;
  deleteTemporaryColors: () => Promise<void>;
  setFloatingSyncEnabled: (enabled: boolean) => Promise<void>;
  toggleFloatingSyncEnabled: () => Promise<void>;
  toggleSite2TabsGate: (nextOpen: boolean, meta: ActionMetaLike) => Promise<void>;
};

export type CreateCloudSyncUiActionControllerArgs = {
  app: AppContainer;
  fb: CloudSyncUiFeedbackLike | null | undefined;
  copyCloudSyncShareLink?: ((app: AppContainer) => Promise<CloudSyncShareLinkCommandResult>) | null;
  goCloudSyncPublic?: ((app: AppContainer) => CloudSyncRoomModeCommandResult) | null;
  goCloudSyncPrivate?: ((app: AppContainer) => CloudSyncRoomModeCommandResult) | null;
  syncSketchNowCommand?: ((app: AppContainer) => Promise<CloudSyncSketchCommandResult>) | null;
  deleteTemporaryModelsWithConfirm?: ((app: AppContainer) => Promise<CloudSyncDeleteTempResult>) | null;
  deleteTemporaryColorsWithConfirm?: ((app: AppContainer) => Promise<CloudSyncDeleteTempResult>) | null;
  setFloatingSketchSyncEnabled?:
    | ((app: AppContainer, enabled: boolean) => Promise<CloudSyncSyncPinCommandResult>)
    | null;
  toggleFloatingSketchSyncEnabled?: ((app: AppContainer) => Promise<CloudSyncSyncPinCommandResult>) | null;
  toggleSite2TabsGate?:
    | ((
        app: AppContainer,
        nextOpen: boolean,
        meta: ActionMetaLike
      ) => Promise<CloudSyncTabsGateCommandResult>)
    | null;
};

export function isCloudSyncUiActionFn<T extends (...args: never[]) => unknown>(
  value: T | null | undefined
): value is T {
  return typeof value === 'function';
}

export function readCloudSyncUiErrorMessage(err: unknown, fallback: string): string {
  return normalizeUnknownError(err, fallback).message;
}

export function buildDeleteTempErrorResult(err?: unknown): CloudSyncDeleteTempResult {
  return {
    ok: false,
    removed: 0,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'מחיקת פריטים זמניים נכשלה'),
  };
}

export function buildDeleteTempBusyResult(): CloudSyncDeleteTempResult {
  return { ok: false, removed: 0, reason: 'busy' };
}

export function buildRoomModeErrorResult(
  mode: 'public' | 'private',
  err?: unknown
): CloudSyncRoomModeCommandResult {
  return {
    ok: false,
    mode,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'החלפת מצב הסנכרון נכשלה'),
  };
}

export function buildShareLinkErrorResult(err?: unknown): CloudSyncShareLinkCommandResult {
  return {
    ok: false,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'העתקת הקישור נכשלה'),
  };
}

export function buildSketchSyncErrorResult(err?: unknown): CloudSyncSketchCommandResult {
  return {
    ok: false,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'סנכרון סקיצה נכשל'),
  };
}

export function buildSyncPinErrorResult(err?: unknown): CloudSyncSyncPinCommandResult {
  return {
    ok: false,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'הצמדת הסנכרון נכשלה'),
  };
}

export function buildSyncPinBusyResult(): CloudSyncSyncPinCommandResult {
  return { ok: false, reason: 'busy' };
}

export function buildTabsGateErrorResult(err?: unknown): CloudSyncTabsGateCommandResult {
  return {
    ok: false,
    reason: 'error',
    message: readCloudSyncUiErrorMessage(err, 'פתיחת/סגירת הטאבים של Site2 נכשלה'),
  };
}

export function buildTabsGateBusyResult(): CloudSyncTabsGateCommandResult {
  return { ok: false, reason: 'busy' };
}

export function cloneActionMeta(meta: ActionMetaLike | null | undefined): ActionMetaLike {
  return meta && typeof meta === 'object' ? { ...meta } : {};
}
