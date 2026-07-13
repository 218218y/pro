import type {
  AppContainer,
  CloudSyncContentsTogglePayload,
  CloudSyncSketchPayload,
  CloudSyncStateRow,
  CloudSyncSyncPinPayload,
  CloudSyncUpsertResult,
} from '../../../types';

import { asBool, getRoomFromUrl, isExplicitSite2Bundle } from './cloud_sync_config.js';
import { resolveCloudSyncSketchRooms } from './cloud_sync_sketch_rooms.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';
export {
  parseContentsTogglePayload,
  parseFloatingSyncPayload,
  parseSketchPayload,
} from './cloud_sync_payload_state.js';

export type StorageLike = {
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
};

export type CloudSyncSketchConfig = {
  anonKey: string;
  roomParam: string;
  publicRoom: string;
  site2SketchInitialAutoLoad: boolean;
  site2SketchInitialMaxAgeHours: number;
};

export type GetCloudSyncRow = (
  gatewayUrl: string,
  anonKey: string,
  room: string
) => Promise<CloudSyncStateRow | null>;
export type UpsertCloudSyncRow = (
  gatewayUrl: string,
  anonKey: string,
  room: string,
  payload: CloudSyncSketchPayload | CloudSyncSyncPinPayload | CloudSyncContentsTogglePayload
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
export const SHOW_CONTENTS_SYNC_ROOM_SUFFIX = '::showContents';
export const SHOW_CONTENTS_SYNC_LOCAL_KEY = 'wp_show_contents_sync_state';

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

export function resolveShowContentsSyncRoom(deps: CloudSyncSketchOpsBaseDeps): string {
  return `${resolveCloudSyncGateBaseRoom(deps)}${SHOW_CONTENTS_SYNC_ROOM_SUFFIX}`;
}

function resolveShowContentsLocalStorageKey(storage: StorageLike): string {
  try {
    const rec =
      storage && typeof storage === 'object' ? (storage as { KEYS?: Record<string, unknown> }) : null;
    const savedModelsKey = typeof rec?.KEYS?.SAVED_MODELS === 'string' ? String(rec.KEYS.SAVED_MODELS) : '';
    const suffix = 'wardrobeSavedModels';
    if (savedModelsKey.endsWith(suffix)) {
      return `${savedModelsKey.slice(0, -suffix.length)}${SHOW_CONTENTS_SYNC_LOCAL_KEY}`;
    }
  } catch {
    // Use the stable shared key below when the site-specific key cannot be derived.
  }
  return SHOW_CONTENTS_SYNC_LOCAL_KEY;
}

export function readShowContentsSyncedLocal(deps: Pick<CloudSyncSketchOpsBaseDeps, 'App' | 'storage'>): {
  hasValue: boolean;
  enabled: boolean;
} {
  const { App, storage } = deps;
  try {
    const key = resolveShowContentsLocalStorageKey(storage);
    const raw = typeof storage.getString === 'function' ? storage.getString(key) : null;
    if (raw === null || typeof raw === 'undefined' || String(raw).trim() === '') {
      return { hasValue: false, enabled: false };
    }
    const parsed = asBool(raw);
    return { hasValue: true, enabled: parsed === null ? false : parsed };
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'showContentsSync.readLocal', e, { throttleMs: 8000 });
    return { hasValue: false, enabled: false };
  }
}

export function writeShowContentsSyncedLocal(
  deps: Pick<CloudSyncSketchOpsBaseDeps, 'App' | 'storage'>,
  enabled: boolean
): void {
  const { App, storage } = deps;
  try {
    if (typeof storage.setString === 'function') {
      storage.setString(resolveShowContentsLocalStorageKey(storage), enabled ? '1' : '0');
    }
  } catch (e) {
    _cloudSyncReportNonFatal(App, 'showContentsSync.writeLocal', e, { throttleMs: 8000 });
  }
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
