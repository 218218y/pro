import type { CloudSyncPayload } from '../../../types';

import { stableSerializeCloudSyncValue } from './cloud_sync_support_serialize.js';

export function cloneCloudSyncGatewayPayload(payload: CloudSyncPayload): CloudSyncPayload {
  const source = payload && typeof payload === 'object' ? payload : {};
  try {
    return JSON.parse(JSON.stringify(source)) as CloudSyncPayload;
  } catch {
    return { ...source };
  }
}

export function readCloudSyncGatewayPayloadDifferenceKeys(
  left: CloudSyncPayload,
  right: CloudSyncPayload
): string[] {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  return Array.from(keys)
    .sort()
    .filter(key => {
      const leftHasKey = Object.prototype.hasOwnProperty.call(left, key);
      const rightHasKey = Object.prototype.hasOwnProperty.call(right, key);
      if (leftHasKey !== rightHasKey) return true;
      return stableSerializeCloudSyncValue(left[key]) !== stableSerializeCloudSyncValue(right[key]);
    });
}
