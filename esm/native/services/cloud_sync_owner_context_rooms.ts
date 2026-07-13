import type { AppContainer, CloudSyncRoomCredential } from '../../../types';

import {
  getRoomFromUrl,
  isExplicitSite2Bundle,
  removeRoomTokenFromUrl,
  type SupabaseCfg,
} from './cloud_sync_config.js';
import { resolveCloudSyncSketchRooms } from './cloud_sync_sketch_rooms.js';
import { normalizeCloudSyncRoomCredential } from './cloud_sync_room_credentials.js';
import type { CloudSyncReportNonFatal, StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncOwnerRooms = {
  room: string;
  currentRoom: () => string;
  currentRoomCredential: () => CloudSyncRoomCredential | null;
  getPrivateRoomCredential: () => CloudSyncRoomCredential | null;
  setPrivateRoomCredential: (credential: CloudSyncRoomCredential) => boolean;
  getGateBaseRoom: () => string;
  getSketchRoom: () => string;
  getSite2TabsRoom: () => string;
  getFloatingSyncRoom: () => string;
};

const PRIVATE_CREDENTIAL_KEY = 'wp_private_room_credential';
const SKETCH_ROOM_SUFFIX = '::sketch';

type StoredPrivateRoomCredential = {
  schemaVersion: 2;
  room: string;
  token: string;
  expiresAt: string;
};

function readPrivateRoomStorageKey(storage: StorageLike): string {
  try {
    const rec =
      storage && typeof storage === 'object' ? (storage as { KEYS?: Record<string, unknown> }) : null;
    const key = rec?.KEYS?.PRIVATE_ROOM_CREDENTIAL;
    return typeof key === 'string' && key.trim() ? key.trim() : PRIVATE_CREDENTIAL_KEY;
  } catch {
    return PRIVATE_CREDENTIAL_KEY;
  }
}

function readRoomString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function writeStoredPrivateCredential(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
  credential: CloudSyncRoomCredential;
}): boolean {
  const { App, storage, reportNonFatal } = args;
  const credential = normalizeCloudSyncRoomCredential(args.credential);
  if (!credential) return false;
  try {
    if (typeof storage.setString === 'function') {
      const stored: StoredPrivateRoomCredential = { schemaVersion: 2, ...credential };
      const written = storage.setString(readPrivateRoomStorageKey(storage), JSON.stringify(stored));
      if (written) return true;
    }
    reportNonFatal(
      App,
      'privateRoomCredential.write',
      new Error('Private room credential was not persisted'),
      {
        throttleMs: 8000,
      }
    );
  } catch (e) {
    reportNonFatal(App, 'privateRoomCredential.write', e, { throttleMs: 8000 });
  }
  return false;
}

function readStoredPrivateCredential(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): CloudSyncRoomCredential | null {
  const { App, storage, reportNonFatal } = args;
  try {
    const raw =
      typeof storage.getString === 'function' ? storage.getString(readPrivateRoomStorageKey(storage)) : null;
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const rec = value as Record<string, unknown>;
    const credential = normalizeCloudSyncRoomCredential(rec, {
      deriveExpiresAtFromToken: rec.schemaVersion === 1,
    });
    if (!credential || (rec.schemaVersion !== 1 && rec.schemaVersion !== 2)) return null;
    if (rec.schemaVersion === 1) {
      writeStoredPrivateCredential({ App, storage, reportNonFatal, credential });
    }
    return credential;
  } catch (e) {
    reportNonFatal(App, 'privateRoomCredential.read', e, { throttleMs: 8000 });
    return null;
  }
}

export function createCloudSyncOwnerRooms(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): CloudSyncOwnerRooms {
  const { App, cfg, storage, reportNonFatal } = args;

  const room = getRoomFromUrl(App, cfg.roomParam) || cfg.publicRoom;
  const initialRoomToken = readRoomString(getRoomFromUrl(App, cfg.roomTokenParam));
  if (room !== cfg.publicRoom && initialRoomToken) {
    const initialCredential = normalizeCloudSyncRoomCredential(
      { room, token: initialRoomToken },
      { deriveExpiresAtFromToken: true }
    );
    const persisted = initialCredential
      ? writeStoredPrivateCredential({ App, storage, reportNonFatal, credential: initialCredential })
      : false;
    if (persisted) removeRoomTokenFromUrl(App, cfg.roomTokenParam);
  }

  const currentRoom = (): string => {
    const resolved = getRoomFromUrl(App, cfg.roomParam);
    return resolved || cfg.publicRoom;
  };

  const getPrivateRoomCredential = (): CloudSyncRoomCredential | null =>
    readStoredPrivateCredential({ App, storage, reportNonFatal });

  const setPrivateRoomCredential = (credential: CloudSyncRoomCredential): boolean =>
    writeStoredPrivateCredential({ App, storage, reportNonFatal, credential });

  const currentRoomCredential = (): CloudSyncRoomCredential | null => {
    const current = currentRoom();
    if (!current || current === cfg.publicRoom) return null;
    const urlToken = readRoomString(getRoomFromUrl(App, cfg.roomTokenParam));
    if (urlToken) {
      return normalizeCloudSyncRoomCredential(
        { room: current, token: urlToken },
        { deriveExpiresAtFromToken: true }
      );
    }
    const stored = getPrivateRoomCredential();
    return current === stored?.room ? stored : null;
  };

  const getGateBaseRoom = (): string => {
    return currentRoom();
  };

  const getSketchRoom = (): string => {
    const baseRoom = String(currentRoom() || '').trim();
    if (!baseRoom) return '';
    const pullRoom = resolveCloudSyncSketchRooms(baseRoom, isExplicitSite2Bundle(App)).pullRoom;
    return pullRoom || `${baseRoom}${SKETCH_ROOM_SUFFIX}`;
  };

  return {
    room,
    currentRoom,
    currentRoomCredential,
    getPrivateRoomCredential,
    setPrivateRoomCredential,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom: (): string => `${getGateBaseRoom()}::tabsGate`,
    getFloatingSyncRoom: (): string => `${getGateBaseRoom()}::syncPin`,
  };
}
