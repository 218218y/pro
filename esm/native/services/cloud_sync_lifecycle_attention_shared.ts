// Cloud Sync lifecycle browser/attention shared helpers.
//
// Keeps listener arg surfaces and event readers separate from the browser
// binding runtimes so the attention and diagnostics owners can stay focused.

import type { AppContainer, CloudSyncRuntimeStatus } from '../../../types';

import { asRecord } from './cloud_sync_support.js';
import type { CloudSyncPullAllNowFn } from './cloud_sync_lifecycle_support_bindings.js';

export type CloudSyncListenerTargetLike = {
  addEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
  removeEventListener?: (type: string, handler: (ev: unknown) => void) => unknown;
};

export type CloudSyncAddListenerLike = (
  target: CloudSyncListenerTargetLike | null,
  type: string,
  handler: (ev: unknown) => void
) => void;

export type CloudSyncDiagStorageListenerArgs = {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  diagStorageKey: string;
  updateDiagEnabled: () => void;
  publishStatus: () => void;
  addListener: CloudSyncAddListenerLike;
  isDisposed?: () => boolean;
};

export type CloudSyncAttentionPullArgs = {
  App: AppContainer;
  runtimeStatus: CloudSyncRuntimeStatus;
  suppressRef: { v: boolean };
  pullAllNow: CloudSyncPullAllNowFn;
  addListener: CloudSyncAddListenerLike;
  isDisposed?: () => boolean;
};

export function readStorageEventLike(ev: unknown): { key: string | null } | null {
  const rec = asRecord(ev);
  if (!rec) return null;
  const key = rec.key;
  const nextKey: string | null = typeof key === 'string' ? key : null;
  return { key: nextKey };
}
