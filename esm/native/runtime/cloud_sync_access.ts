import type { CloudSyncServiceLike, CloudSyncServiceStateLike, CloudSyncTestHooksLike } from '../../../types';

import { asRecord } from './record.js';
import { ensureServiceSlot, getServiceSlotMaybe } from './services_root_access.js';

function asCloudSyncState(value: unknown): CloudSyncServiceStateLike | null {
  return asRecord<CloudSyncServiceStateLike>(value);
}

function asCloudSyncApi(value: unknown): CloudSyncServiceLike | null {
  return asRecord<CloudSyncServiceLike>(value);
}

function asCloudSyncTestHooks(value: unknown): CloudSyncTestHooksLike | null {
  return asRecord<CloudSyncTestHooksLike>(value);
}

export function getCloudSyncServiceStateMaybe(App: unknown): CloudSyncServiceStateLike | null {
  try {
    return asCloudSyncState(getServiceSlotMaybe(App, 'cloudSync'));
  } catch {
    return null;
  }
}

export function ensureCloudSyncServiceState(App: unknown): CloudSyncServiceStateLike | null {
  try {
    return asCloudSyncState(ensureServiceSlot<CloudSyncServiceStateLike>(App, 'cloudSync'));
  } catch {
    return null;
  }
}

export function getCloudSyncServiceMaybe(App: unknown): CloudSyncServiceLike | null {
  try {
    const state = getCloudSyncServiceStateMaybe(App);
    return asCloudSyncApi(state?.panelApi);
  } catch {
    return null;
  }
}

export function getCloudSyncTestHooksMaybe(App: unknown): CloudSyncTestHooksLike | null {
  try {
    const state = getCloudSyncServiceStateMaybe(App);
    return asCloudSyncTestHooks(state?.__testHooks);
  } catch {
    return null;
  }
}
