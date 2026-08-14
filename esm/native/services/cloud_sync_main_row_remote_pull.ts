import type { ConfigStateLike, RootStateLike } from '../../../types';

import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import type { CreateCloudSyncMainRowRemoteOpsArgs } from './cloud_sync_main_row_remote_shared.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function reportMainRowPullFailure(
  App: CreateCloudSyncMainRowRemoteOpsArgs['App'],
  operation: string,
  error: unknown
): void {
  _cloudSyncReportNonFatal(App, operation, error, { throttleMs: 8000 });
}

function readAppConfig(App: CreateCloudSyncMainRowRemoteOpsArgs['App']): ConfigStateLike | null {
  try {
    const rootState = readStoreStateMaybe<RootStateLike>(App);
    if (isRecord(rootState?.config)) return rootState.config;
  } catch (error) {
    reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.readStoreConfig', error);
  }

  return null;
}

function payloadArrayHasItems(payload: Record<string, unknown>, key: string): boolean {
  const value = payload[key];
  return Array.isArray(value) && value.length > 0;
}

function configArrayIsEmpty(config: ConfigStateLike, key: 'savedColors' | 'colorSwatchesOrder'): boolean {
  const value = config[key];
  return !Array.isArray(value) || value.length <= 0;
}

function shouldApplyInitialPayloadToHydrateApp(
  App: CreateCloudSyncMainRowRemoteOpsArgs['App'],
  payload: Record<string, unknown>
): boolean {
  const config = readAppConfig(App);
  if (!config) return false;

  return (
    (payloadArrayHasItems(payload, 'savedColors') && configArrayIsEmpty(config, 'savedColors')) ||
    (payloadArrayHasItems(payload, 'colorSwatchesOrder') && configArrayIsEmpty(config, 'colorSwatchesOrder'))
  );
}

export function createCloudSyncMainRowPullOnce(
  args: CreateCloudSyncMainRowRemoteOpsArgs
): (isInitial: boolean) => Promise<void> {
  const {
    App,
    cfg,
    gatewayUrl,
    room,
    getRow,
    runtimeStatus,
    publishStatus,
    localState,
    state,
    schedulePullSoon,
    schedulePushSoon,
  } = args;

  const safeSchedulePull = (reason: string): void => {
    try {
      schedulePullSoon({ reason });
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.schedulePullRecovery', error);
    }
  };

  const safeSchedulePush = (): void => {
    try {
      schedulePushSoon();
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.schedulePushRecovery', error);
    }
  };

  const adoptRemotePayload = async (
    payload: Record<string, unknown>,
    localRevision: number,
    updatedAt: string
  ): Promise<void> => {
    try {
      const adoption = await localState.applyRemotePayload(payload, localRevision);
      if (adoption.ok === true) {
        state.setLastSeenUpdatedAt(updatedAt);
        return;
      }
      if (adoption.reason === 'revision-mismatch') {
        safeSchedulePush();
        return;
      }
      reportMainRowPullFailure(
        App,
        'cloudSync.mainRow.pull.adoptionCommit',
        new Error('Cloud Sync remote payload adoption commit was rejected')
      );
      safeSchedulePull('pull-local-commit-recovery');
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.adoption', error);
      safeSchedulePull('pull-local-commit-recovery');
    }
  };

  return async (isInitial: boolean): Promise<void> => {
    let localSnapshot: ReturnType<typeof localState.readLocalSnapshot>;
    try {
      localSnapshot = localState.readLocalSnapshot();
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.readLocalSnapshot', error);
      safeSchedulePull('pull-local-snapshot-recovery');
      return;
    }

    let readResult: Awaited<ReturnType<typeof readCloudSyncRowWithPullActivity>>;
    try {
      readResult = await readCloudSyncRowWithPullActivity({
        gatewayUrl,
        anonKey: cfg.anonKey,
        room,
        getRow,
        runtimeStatus,
        publishStatus,
      });
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.readRemoteRow', error);
      safeSchedulePull('pull-remote-read-recovery');
      return;
    }

    if (readResult.ok === false) return;
    const row = readResult.row;

    if (!row) {
      if (isInitial) {
        try {
          await localState.seedMissingRowFromLocal();
        } catch (error) {
          reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.seedMissingRow', error);
          safeSchedulePull('pull-seed-missing-row-recovery');
        }
      }
      return;
    }

    const payload = row.payload || {};
    const updatedAt = String(row.updated_at || '');
    let currentHash = '';
    let nextHash = '';
    try {
      currentHash = state.getLastHash() || localState.syncHashFromLocal();
      nextHash = localState.computeAppliedPayloadHash(payload);
    } catch (error) {
      reportMainRowPullFailure(App, 'cloudSync.mainRow.pull.computeHash', error);
      safeSchedulePull('pull-hash-recovery');
      return;
    }

    if (!state.getLastSeenUpdatedAt()) {
      if (nextHash === currentHash && !shouldApplyInitialPayloadToHydrateApp(App, payload)) {
        state.setLastSeenUpdatedAt(updatedAt);
        state.setLastHash(nextHash);
        return;
      }
      await adoptRemotePayload(payload, localSnapshot.revision, updatedAt);
      return;
    }

    if (updatedAt && updatedAt !== state.getLastSeenUpdatedAt()) {
      if (nextHash === state.getLastHash()) {
        state.setLastSeenUpdatedAt(updatedAt);
        state.setLastHash(nextHash);
        return;
      }
      await adoptRemotePayload(payload, localSnapshot.revision, updatedAt);
    }
  };
}
