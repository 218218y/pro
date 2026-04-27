import type {
  CloudSyncDeleteTempResult,
  CloudSyncRoomModeCommandResult,
  CloudSyncShareLinkCommandResult,
  CloudSyncSketchCommandResult,
  CloudSyncSyncPinCommandResult,
  CloudSyncTabsGateCommandResult,
} from '../../../types';

import {
  createCloudSyncActionToast,
  emitCloudSyncActionToast,
  readDeleteLabel,
  type CloudSyncActionToastLike,
  type CloudSyncFeedbackLike,
  type DeleteTempKind,
} from './cloud_sync_action_feedback_shared.js';
import {
  getCloudDeleteTempToast,
  getCloudSketchSyncToast,
  getCloudSyncRoomModeToast,
  getCloudSyncShareLinkToast,
  getFloatingSketchSyncPinToast,
  getSite2TabsGateToast,
} from './cloud_sync_action_feedback_toasts.js';

export function reportCloudSyncShareLinkResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncShareLinkCommandResult | null | undefined
): CloudSyncActionToastLike {
  return (
    emitCloudSyncActionToast(fb, getCloudSyncShareLinkToast(result)) ||
    createCloudSyncActionToast('העתקת הקישור נכשלה', 'error')
  );
}

export function reportCloudSyncRoomModeResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncRoomModeCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  return emitCloudSyncActionToast(fb, getCloudSyncRoomModeToast(result));
}

export function reportSite2TabsGateResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncTabsGateCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  return emitCloudSyncActionToast(fb, getSite2TabsGateToast(result));
}

export function reportCloudSketchSyncResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncSketchCommandResult | null | undefined
): CloudSyncActionToastLike {
  return (
    emitCloudSyncActionToast(fb, getCloudSketchSyncToast(result)) ||
    createCloudSyncActionToast('סנכרון סקיצה נכשל', 'error')
  );
}

export function reportCloudDeleteTempResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncDeleteTempResult | null | undefined,
  kind: DeleteTempKind
): CloudSyncActionToastLike {
  return (
    emitCloudSyncActionToast(fb, getCloudDeleteTempToast(result, kind)) ||
    createCloudSyncActionToast(`מחיקת ${readDeleteLabel(kind)} זמניים נכשלה`, 'error')
  );
}

export function reportFloatingSketchSyncPinResult(
  fb: CloudSyncFeedbackLike | null | undefined,
  result: CloudSyncSyncPinCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  const failureToast = getFloatingSketchSyncPinToast(result);
  if (failureToast) return emitCloudSyncActionToast(fb, failureToast);
  if (result && result.ok) {
    return emitCloudSyncActionToast(
      fb,
      createCloudSyncActionToast(result.enabled ? 'הצמדה הופעלה' : 'הצמדה כובתה', 'success')
    );
  }
  return emitCloudSyncActionToast(fb, createCloudSyncActionToast('הצמדת הסנכרון נכשלה', 'error'));
}
