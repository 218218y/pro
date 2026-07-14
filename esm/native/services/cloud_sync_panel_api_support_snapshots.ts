import type {
  CloudSyncPanelSnapshot,
  CloudSyncRoomStatusSnapshot,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

function areCloudSyncRoomStatusSnapshotsEqual(
  left: CloudSyncRoomStatusSnapshot,
  right: CloudSyncRoomStatusSnapshot
): boolean {
  return (
    left.room === right.room &&
    left.isPublic === right.isPublic &&
    left.status === right.status &&
    left.credentialState === right.credentialState &&
    left.credentialExpiresAt === right.credentialExpiresAt &&
    left.retryAt === right.retryAt &&
    left.failureKind === right.failureKind
  );
}

export function areCloudSyncPanelSnapshotsEqual(
  left: CloudSyncPanelSnapshot,
  right: CloudSyncPanelSnapshot
): boolean {
  return (
    areCloudSyncRoomStatusSnapshotsEqual(left, right) &&
    !!left.floatingSync === !!right.floatingSync &&
    (left.conflict?.room || '') === (right.conflict?.room || '') &&
    (left.conflict?.keys || []).join('|') === (right.conflict?.keys || []).join('|') &&
    Number(left.conflict?.remoteRevision || 0) === Number(right.conflict?.remoteRevision || 0) &&
    Number(left.conflict?.detectedAt || 0) === Number(right.conflict?.detectedAt || 0) &&
    (left.conflict?.state || '') === (right.conflict?.state || '')
  );
}

export function areCloudSyncSite2TabsGateSnapshotsEqual(
  left: CloudSyncSite2TabsGateSnapshot,
  right: CloudSyncSite2TabsGateSnapshot
): boolean {
  return (
    !!left.open === !!right.open &&
    Number(left.until) === Number(right.until) &&
    Number(left.minutesLeft) === Number(right.minutesLeft)
  );
}
