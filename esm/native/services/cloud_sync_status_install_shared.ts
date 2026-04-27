import type { CloudSyncRuntimeStatus } from '../../../types';

import { cloneRuntimeStatus } from './cloud_sync_support_shared.js';
import { getUnavailableCloudSyncRuntimeStatus } from './cloud_sync_panel_api_public_support.js';

export type InstallableCloudSyncRuntimeStatus = CloudSyncRuntimeStatus & {
  __wpCloudSyncStatusInstalled?: boolean;
  __wpCloudSyncStatusActive?: boolean;
};

export type RuntimeStatusBranch = Record<string, unknown>;

export const CLOUD_SYNC_STATUS_INSTALLED_KEY = '__wpCloudSyncStatusInstalled';
export const CLOUD_SYNC_STATUS_ACTIVE_KEY = '__wpCloudSyncStatusActive';

export function isMutableRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asInstallableCloudSyncRuntimeStatus(
  value: unknown
): InstallableCloudSyncRuntimeStatus | null {
  return isMutableRecord(value) ? (value as InstallableCloudSyncRuntimeStatus) : null;
}

export function asRuntimeStatusBranch(value: unknown): RuntimeStatusBranch | null {
  return isMutableRecord(value) ? (value as RuntimeStatusBranch) : null;
}

export function readStatusMetaDescriptor(
  target: Record<string, unknown>,
  key: string
): PropertyDescriptor | null {
  try {
    return Object.getOwnPropertyDescriptor(target, key) || null;
  } catch {
    return null;
  }
}

export function defineStatusMeta(target: Record<string, unknown>, key: string, value: boolean): void {
  const descriptor = readStatusMetaDescriptor(target, key);
  if (!descriptor || descriptor.configurable !== false) {
    try {
      if (descriptor) delete target[key];
      Object.defineProperty(target, key, {
        configurable: true,
        enumerable: false,
        writable: true,
        value,
      });
      return;
    } catch {
      // Fall through to direct assignment for exotic objects.
    }
  }
  target[key] = value;
}

export function readStatusMeta(target: Record<string, unknown>, key: string): boolean {
  return target[key] === true;
}

export function hasHiddenStatusMeta(target: Record<string, unknown>, key: string, value: boolean): boolean {
  const descriptor = readStatusMetaDescriptor(target, key);
  return !!descriptor && descriptor.enumerable === false && descriptor.value === value;
}

export function syncBranchInPlace(target: RuntimeStatusBranch, source: RuntimeStatusBranch): void {
  for (const key of Object.keys(target)) {
    if (!(key in source)) delete target[key];
  }
  for (const key of Object.keys(source)) {
    target[key] = source[key];
  }
}

export function cloneCanonicalCloudSyncRuntimeStatus(source: CloudSyncRuntimeStatus): CloudSyncRuntimeStatus {
  return cloneRuntimeStatus(source);
}

export function getFallbackRuntimeStatus(): CloudSyncRuntimeStatus {
  return getUnavailableCloudSyncRuntimeStatus();
}

export function readComparableStatusKeys(status: InstallableCloudSyncRuntimeStatus): string[] {
  return Object.keys(status)
    .filter(key => key !== CLOUD_SYNC_STATUS_INSTALLED_KEY && key !== CLOUD_SYNC_STATUS_ACTIVE_KEY)
    .sort();
}

export function readComparableSourceKeys(status: CloudSyncRuntimeStatus): string[] {
  return Object.keys(status).sort();
}

export function readComparableBranchKeys(branch: RuntimeStatusBranch): string[] {
  return Object.keys(branch).sort();
}

export function branchesEqual(target: RuntimeStatusBranch, source: RuntimeStatusBranch): boolean {
  const targetKeys = readComparableBranchKeys(target);
  const sourceKeys = readComparableBranchKeys(source);
  if (targetKeys.length !== sourceKeys.length) return false;
  for (let index = 0; index < sourceKeys.length; index += 1) {
    if (targetKeys[index] !== sourceKeys[index]) return false;
  }
  for (const key of sourceKeys) {
    if (target[key] !== source[key]) return false;
  }
  return true;
}
