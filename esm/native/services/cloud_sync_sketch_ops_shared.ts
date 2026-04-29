import type {
  AppContainer,
  CloudSyncSketchPayload,
  CloudSyncStateRow,
  CloudSyncSyncPinPayload,
  CloudSyncUpsertResult,
} from '../../../types';

import { asBool, getRoomFromUrl, isExplicitSite2Bundle } from './cloud_sync_config.js';
import { resolveCloudSyncSketchRooms } from './cloud_sync_sketch_rooms.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
export { parseFloatingSyncPayload, parseSketchPayload } from './cloud_sync_payload_state.js';

export type StorageLike = {
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
};

export type CloudSyncSketchConfig = {
  anonKey: string;
  roomParam: string;
  privateRoom?: string;
  publicRoom: string;
  site2SketchInitialAutoLoad: boolean;
  site2SketchInitialMaxAgeHours: number;
};

export type GetCloudSyncRow = (
  restUrl: string,
  anonKey: string,
  room: string
) => Promise<CloudSyncStateRow | null>;
export type UpsertCloudSyncRow = (
  restUrl: string,
  anonKey: string,
  room: string,
  payload: CloudSyncSketchPayload | CloudSyncSyncPinPayload,
  opts?: { returnRepresentation?: boolean }
) => Promise<CloudSyncUpsertResult>;

export type CloudSyncSketchOpsBaseDeps = {
  App: AppContainer;
  cfg: CloudSyncSketchConfig;
  storage: StorageLike;
  getGateBaseRoom?: () => string;
  currentRoom: () => string;
};

export const FLOATING_SYNC_ROOM_SUFFIX = '::syncPin';
export const FLOATING_SYNC_LOCAL_KEY = 'wp_floating_sketch_sync_pin';

export function resolveCloudSyncGateBaseRoom(deps: CloudSyncSketchOpsBaseDeps): string {
  const { App, cfg, getGateBaseRoom } = deps;
  try {
    if (typeof getGateBaseRoom === 'function') {
      const explicit = String(getGateBaseRoom() || '').trim();
      if (explicit) return explicit;
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.getBaseRoom', e, { throttleMs: 8000 });
  }
  const urlRoom = getRoomFromUrl(App, cfg.roomParam);
  if (urlRoom) return urlRoom;
  return cfg.publicRoom;
}

export function resolveCloudSyncSketchRoom(
  deps: CloudSyncSketchOpsBaseDeps,
  direction: 'push' | 'pull'
): string {
  const baseRoom = String(deps.currentRoom() || '').trim();
  if (!baseRoom) return '';
  const rooms = resolveCloudSyncSketchRooms(baseRoom, isExplicitSite2Bundle(deps.App));
  return direction === 'push' ? rooms.pushRoom : rooms.pullRoom;
}

export function resolveFloatingSketchSyncRoom(deps: CloudSyncSketchOpsBaseDeps): string {
  return `${resolveCloudSyncGateBaseRoom(deps)}${FLOATING_SYNC_ROOM_SUFFIX}`;
}

export function readFloatingSketchSyncPinnedLocal(
  deps: Pick<CloudSyncSketchOpsBaseDeps, 'App' | 'storage'>
): boolean {
  const { App, storage } = deps;
  try {
    const raw =
      typeof storage.getString === 'function' ? String(storage.getString(FLOATING_SYNC_LOCAL_KEY) || '') : '';
    const parsed = asBool(raw);
    return parsed === null ? false : parsed;
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.readPinnedLocal', e, { throttleMs: 8000 });
    return false;
  }
}

export function writeFloatingSketchSyncPinnedLocal(
  deps: Pick<CloudSyncSketchOpsBaseDeps, 'App' | 'storage'>,
  enabled: boolean
): void {
  const { App, storage } = deps;
  try {
    if (typeof storage.setString === 'function') {
      storage.setString(FLOATING_SYNC_LOCAL_KEY, enabled ? '1' : '0');
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'floatingSync.writePinnedLocal', e, { throttleMs: 8000 });
  }
}
