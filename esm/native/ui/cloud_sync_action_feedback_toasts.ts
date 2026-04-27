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
  readDeleteLabel,
  readFailureMessage,
  type CloudSyncActionToastLike,
  type DeleteTempKind,
  type FailureResult,
} from './cloud_sync_action_feedback_shared.js';

export function getCloudSyncShareLinkToast(
  result: CloudSyncShareLinkCommandResult | null | undefined
): CloudSyncActionToastLike {
  if (!result) return createCloudSyncActionToast('העתקת הקישור נכשלה', 'error');
  if (result.ok === true) {
    if (result.copied) return createCloudSyncActionToast('הקישור הועתק', 'success');
    if (result.prompted) return createCloudSyncActionToast('פתחתי חלון להעתקת הקישור', 'info');
    return createCloudSyncActionToast('הקישור זמין להעתקה', 'info');
  }
  const failure: FailureResult<CloudSyncShareLinkCommandResult> = result;
  switch (failure.reason) {
    case 'missing-link':
      return createCloudSyncActionToast('אין קישור לשיתוף כרגע', 'error');
    case 'clipboard':
    case 'unavailable':
    case 'not-installed':
      return createCloudSyncActionToast('העתקת הקישור לא זמינה כרגע', 'error');
    default: {
      const message = readFailureMessage(failure);
      return message
        ? createCloudSyncActionToast(message, 'error')
        : createCloudSyncActionToast('העתקת הקישור נכשלה', 'error');
    }
  }
}

export function getCloudSyncRoomModeToast(
  result: CloudSyncRoomModeCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  if (!result) return createCloudSyncActionToast('החלפת מצב הסנכרון נכשלה', 'error');
  if (result.ok === true) return null;
  const failure: FailureResult<CloudSyncRoomModeCommandResult> = result;
  if (failure.reason === 'not-installed') {
    return createCloudSyncActionToast('החלפת מצב הסנכרון לא זמינה כרגע', 'error');
  }
  const message = readFailureMessage(failure);
  return message
    ? createCloudSyncActionToast(message, 'error')
    : createCloudSyncActionToast('החלפת מצב הסנכרון נכשלה', 'error');
}

export function getSite2TabsGateToast(
  result: CloudSyncTabsGateCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  if (!result) return createCloudSyncActionToast('פתיחת/סגירת הטאבים של Site2 נכשלה', 'error');
  if (result.ok === true) return null;
  const failure: FailureResult<CloudSyncTabsGateCommandResult> = result;
  switch (failure.reason) {
    case 'controller-only':
    case 'not-installed':
      return createCloudSyncActionToast('פתיחת/סגירת הטאבים של Site2 לא זמינה כרגע', 'error');
    case 'busy':
      return createCloudSyncActionToast('סנכרון טאבי Site2 כבר בתהליך', 'warning');
    default: {
      const message = readFailureMessage(failure);
      return message
        ? createCloudSyncActionToast(message, 'error')
        : createCloudSyncActionToast('פתיחת/סגירת הטאבים של Site2 נכשלה', 'error');
    }
  }
}

export function getCloudSketchSyncToast(
  result: CloudSyncSketchCommandResult | null | undefined
): CloudSyncActionToastLike {
  if (!result) return createCloudSyncActionToast('סנכרון סקיצה נכשל', 'error');
  if (result.ok === true) {
    if (result.changed === false || result.reason === 'noop') {
      return createCloudSyncActionToast('הסקיצה כבר מעודכנת בענן', 'info');
    }
    return createCloudSyncActionToast('הסקיצה סונכרנה לענן', 'success');
  }
  const failure: FailureResult<CloudSyncSketchCommandResult> = result;
  switch (failure.reason) {
    case 'not-installed':
      return createCloudSyncActionToast('סנכרון הסקיצה לא זמין כרגע', 'error');
    case 'capture':
      return createCloudSyncActionToast('לא הצלחתי ללכוד את הסקיצה הנוכחית', 'error');
    case 'room':
      return createCloudSyncActionToast('אין כרגע חדר סנכרון פעיל', 'error');
    case 'write':
      return createCloudSyncActionToast('שמירת הסקיצה לענן נכשלה', 'error');
    default: {
      const message = readFailureMessage(failure);
      return message
        ? createCloudSyncActionToast(message, 'error')
        : createCloudSyncActionToast('סנכרון סקיצה נכשל', 'error');
    }
  }
}

export function getCloudDeleteTempToast(
  result: CloudSyncDeleteTempResult | null | undefined,
  kind: DeleteTempKind
): CloudSyncActionToastLike {
  const label = readDeleteLabel(kind);
  if (!result) return createCloudSyncActionToast(`מחיקת ${label} זמניים נכשלה`, 'error');
  if (result.ok === true) {
    return createCloudSyncActionToast(`נמחקו ${result.removed} ${label}`, 'success');
  }
  const failure: FailureResult<CloudSyncDeleteTempResult> = result;
  switch (failure.reason) {
    case 'cancelled':
      return createCloudSyncActionToast('המחיקה בוטלה', 'info');
    case 'not-installed':
      return createCloudSyncActionToast(`מחיקת ${label} זמניים לא זמינה כרגע`, 'error');
    case 'busy':
      return createCloudSyncActionToast(`מחיקת ${label} זמניים כבר בתהליך`, 'warning');
    case 'room':
      return createCloudSyncActionToast('אין כרגע חדר סנכרון פעיל', 'error');
    case 'write':
      return createCloudSyncActionToast(`שמירת מחיקת ${label} לענן נכשלה`, 'error');
    default: {
      const message = readFailureMessage(failure);
      return message
        ? createCloudSyncActionToast(message, 'error')
        : createCloudSyncActionToast(`מחיקת ${label} זמניים נכשלה`, 'error');
    }
  }
}

export function getFloatingSketchSyncPinToast(
  result: CloudSyncSyncPinCommandResult | null | undefined
): CloudSyncActionToastLike | null {
  if (!result) return createCloudSyncActionToast('הצמדת הסנכרון נכשלה', 'error');
  if (result.ok === true) return null;
  const failure: FailureResult<CloudSyncSyncPinCommandResult> = result;
  switch (failure.reason) {
    case 'busy':
      return createCloudSyncActionToast('סנכרון ההצמדה כבר בתהליך', 'warning');
    case 'not-installed':
      return createCloudSyncActionToast('הצמדת הסנכרון לא זמינה כרגע', 'error');
    default: {
      const message = readFailureMessage(failure);
      return message
        ? createCloudSyncActionToast(message, 'error')
        : createCloudSyncActionToast('הצמדת הסנכרון נכשלה', 'error');
    }
  }
}
