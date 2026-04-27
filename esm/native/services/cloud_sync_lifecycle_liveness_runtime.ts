export type CloudSyncLifecycleLivenessGuard = (() => boolean) | null | undefined;

export function isCloudSyncLifecycleGuardDisposed(isDisposed?: CloudSyncLifecycleLivenessGuard): boolean {
  return typeof isDisposed === 'function' && isDisposed();
}

export function isCloudSyncLifecycleGuardLive(isDisposed?: CloudSyncLifecycleLivenessGuard): boolean {
  return !isCloudSyncLifecycleGuardDisposed(isDisposed);
}
