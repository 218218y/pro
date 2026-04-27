import type {
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

export type ToastLevel = 'success' | 'error' | 'warning' | 'info';

export type CloudSyncActionToastLike = {
  message: string;
  type: ToastLevel;
};

export type CloudSyncFeedbackLike = {
  toast?: ((message: string, type?: ToastLevel) => void) | null;
};

export type DeleteTempKind = 'models' | 'colors';

export type FailureWithMessage = {
  ok: false;
  message?: string;
};

export type FailureResult<T> = Extract<T, { ok: false }>;

export type CloudSyncActionResult =
  | CloudSyncShareLinkCommandResult
  | CloudSyncRoomModeCommandResult
  | CloudSyncTabsGateCommandResult
  | CloudSyncSketchCommandResult
  | CloudSyncDeleteTempResult
  | CloudSyncSyncPinCommandResult;

export function readFailureMessage(result: FailureWithMessage | null | undefined): string {
  return typeof result?.message === 'string' ? result.message.trim() : '';
}

export function readDeleteLabel(kind: DeleteTempKind): string {
  return kind === 'models' ? 'דגמים' : 'צבעים';
}

export function createCloudSyncActionToast(message: string, type: ToastLevel): CloudSyncActionToastLike {
  return { message, type };
}

export function emitCloudSyncActionToast(
  fb: CloudSyncFeedbackLike | null | undefined,
  toast: CloudSyncActionToastLike | null
): CloudSyncActionToastLike | null {
  if (toast && fb && typeof fb.toast === 'function') fb.toast(toast.message, toast.type);
  return toast;
}
