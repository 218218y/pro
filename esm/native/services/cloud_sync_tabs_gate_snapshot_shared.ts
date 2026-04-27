import type { CloudSyncSite2TabsGateSnapshot } from '../../../types';

import { readCloudSyncErrorMessage } from './cloud_sync_support.js';

export function readCloudSyncTabsGateErrorMessage(err: unknown, fallback = ''): string {
  return readCloudSyncErrorMessage(err, fallback || 'Unexpected cloud sync tabs gate error');
}

export function cloneCloudSyncSite2TabsGateSnapshot(
  snapshot: CloudSyncSite2TabsGateSnapshot
): CloudSyncSite2TabsGateSnapshot {
  return {
    open: !!snapshot.open,
    until: Number(snapshot.until) || 0,
    minutesLeft: Number(snapshot.minutesLeft) || 0,
  };
}

export function readCloudSyncSite2TabsGateSnapshot(
  openIn: boolean,
  untilIn: number,
  now = Date.now()
): CloudSyncSite2TabsGateSnapshot {
  const until = Number(untilIn) || 0;
  const remainingMs = until - now;
  const open = !!openIn && remainingMs > 0;
  return {
    open,
    until,
    minutesLeft: open ? Math.ceil(remainingMs / 60000) : 0,
  };
}

export function equalCloudSyncSite2TabsGateSnapshots(
  left: CloudSyncSite2TabsGateSnapshot,
  right: CloudSyncSite2TabsGateSnapshot
): boolean {
  return (
    !!left.open === !!right.open &&
    (Number(left.until) || 0) === (Number(right.until) || 0) &&
    (Number(left.minutesLeft) || 0) === (Number(right.minutesLeft) || 0)
  );
}
