import type {
  CloudSyncPanelSnapshot,
  CloudSyncRoomStatusSnapshot,
  CloudSyncSite2TabsGateSnapshot,
} from '../../../types';

function areCloudSyncRoomStatusSnapshotsEqual(
  left: CloudSyncRoomStatusSnapshot,
  right: CloudSyncRoomStatusSnapshot
): boolean {
  return left.room === right.room && left.isPublic === right.isPublic && left.status === right.status;
}

export function areCloudSyncPanelSnapshotsEqual(
  left: CloudSyncPanelSnapshot,
  right: CloudSyncPanelSnapshot
): boolean {
  return areCloudSyncRoomStatusSnapshotsEqual(left, right) && !!left.floatingSync === !!right.floatingSync;
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
