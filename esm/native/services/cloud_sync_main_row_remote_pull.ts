import type { ConfigStateLike, RootStateLike } from '../../../types';

import { getConfigRootMaybe } from '../runtime/app_roots_access.js';
import { readStoreStateMaybe } from '../runtime/store_surface_access.js';
import { readCloudSyncRowWithPullActivity } from './cloud_sync_remote_read_support.js';
import type { CreateCloudSyncMainRowRemoteOpsArgs } from './cloud_sync_main_row_remote_shared.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readAppConfig(App: CreateCloudSyncMainRowRemoteOpsArgs['App']): ConfigStateLike | null {
  try {
    const rootState = readStoreStateMaybe<RootStateLike>(App);
    if (isRecord(rootState?.config)) return rootState.config;
  } catch {
    // fall through to the boot-time config root below
  }

  try {
    const configRoot = getConfigRootMaybe<ConfigStateLike>(App);
    return isRecord(configRoot) ? configRoot : null;
  } catch {
    return null;
  }
}

function payloadArrayHasItems(payload: Record<string, unknown>, key: string): boolean {
  const value = payload[key];
  return Array.isArray(value) && value.length > 0;
}

function configArrayIsEmpty(config: Record<string, unknown>, key: string): boolean {
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
  const { App, cfg, gatewayUrl, room, getRow, runtimeStatus, publishStatus, localState, state } = args;

  return async (isInitial: boolean): Promise<void> => {
    const readResult = await readCloudSyncRowWithPullActivity({
      gatewayUrl,
      anonKey: cfg.anonKey,
      room,
      getRow,
      runtimeStatus,
      publishStatus,
    });

    if (readResult.ok === false) return;
    const row = readResult.row;

    if (!row) {
      if (isInitial) await localState.seedMissingRowFromLocal();
      return;
    }

    const payload = row.payload || {};
    const updatedAt = String(row.updated_at || '');
    const currentHash = state.getLastHash() || localState.syncHashFromLocal();
    const nextHash = localState.computeAppliedPayloadHash(payload);

    if (!state.getLastSeenUpdatedAt()) {
      if (nextHash === currentHash && !shouldApplyInitialPayloadToHydrateApp(App, payload)) {
        state.setLastSeenUpdatedAt(updatedAt);
        state.setLastHash(nextHash);
        return;
      }
      if (localState.applyRemotePayload(payload)) state.setLastSeenUpdatedAt(updatedAt);
      return;
    }

    if (updatedAt && updatedAt !== state.getLastSeenUpdatedAt()) {
      if (nextHash === state.getLastHash()) {
        state.setLastSeenUpdatedAt(updatedAt);
        state.setLastHash(nextHash);
        return;
      }
      if (localState.applyRemotePayload(payload)) state.setLastSeenUpdatedAt(updatedAt);
    }
  };
}
