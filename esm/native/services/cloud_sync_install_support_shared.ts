import type { AppContainer } from '../../../types';

import { ensureCloudSyncServiceState } from '../runtime/cloud_sync_access.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export type CloudSyncPublishedStateLike = {
  panelApi?: unknown;
  status?: unknown;
  installedAt?: unknown;
  dispose?: unknown;
  __disposePublicationEpoch?: unknown;
  __testHooks?: unknown;
  __publicationEpoch?: unknown;
};

export type ClearCloudSyncPublishedStateOptions = {
  preserveDispose?: boolean;
  preserveTestHooks?: boolean;
  invalidatePublicationEpoch?: boolean;
  publicationEpoch?: number | null;
};

export type CloudSyncPublishedPreservableSlot = 'dispose' | '__disposePublicationEpoch' | '__testHooks';

export type CloudSyncPublishedPreservedState = Partial<
  Pick<CloudSyncPublishedStateLike, CloudSyncPublishedPreservableSlot>
>;

export function readCloudSyncPublicationEpoch(App: AppContainer): number {
  const state = ensureCloudSyncServiceState(App);
  const value = Number(state?.__publicationEpoch);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function reportCloudSyncPublishedStateCleanupError(
  App: AppContainer,
  op: string,
  error: unknown
): void {
  _cloudSyncReportNonFatal(App, op, error, { throttleMs: 4000 });
}

export function reserveCloudSyncPublicationEpoch(App: AppContainer): number {
  const state = ensureCloudSyncServiceState(App);
  if (!state || typeof state !== 'object') return 0;
  const nextEpoch = readCloudSyncPublicationEpoch(App) + 1;
  state.__publicationEpoch = nextEpoch;
  return nextEpoch;
}

export function invalidateCloudSyncPublicationEpoch(
  App: AppContainer,
  expectedEpoch?: number | null
): number {
  const state = ensureCloudSyncServiceState(App);
  if (!state || typeof state !== 'object') return 0;
  const currentEpoch = readCloudSyncPublicationEpoch(App);
  if (typeof expectedEpoch === 'number' && expectedEpoch > 0 && currentEpoch !== expectedEpoch) {
    return currentEpoch;
  }
  const nextEpoch = currentEpoch + 1;
  state.__publicationEpoch = nextEpoch;
  return nextEpoch;
}

export function isCloudSyncPublicationEpochCurrent(
  App: AppContainer,
  publicationEpoch?: number | null
): boolean {
  if (typeof publicationEpoch !== 'number' || publicationEpoch <= 0) return true;
  return readCloudSyncPublicationEpoch(App) === publicationEpoch;
}

export function readCloudSyncDisposePublicationEpoch(
  state: { __disposePublicationEpoch?: unknown } | null | undefined
): number | null {
  const value = Number(state?.__disposePublicationEpoch);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function canInvokeCloudSyncPublishedDispose(
  App: AppContainer,
  state: { dispose?: unknown; __disposePublicationEpoch?: unknown } | null | undefined
): boolean {
  if (!state || typeof state.dispose !== 'function') return false;
  const publicationEpoch = readCloudSyncDisposePublicationEpoch(state);
  if (publicationEpoch === null) return true;
  return isCloudSyncPublicationEpochCurrent(App, publicationEpoch);
}
