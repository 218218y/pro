import type { AppContainer } from '../../../types';

import {
  getRoomFromUrl,
  isExplicitSite2Bundle,
  removeRoomTokenFromUrl,
  type SupabaseCfg,
} from './cloud_sync_config.js';
import { resolveCloudSyncSketchRooms } from './cloud_sync_sketch_rooms.js';
import type { CloudSyncReportNonFatal, StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncOwnerRooms = {
  room: string;
  currentRoom: () => string;
  currentRoomToken: () => string;
  getPrivateRoom: () => string;
  getPrivateRoomToken: () => string;
  setPrivateRoomCredential: (room: string, token: string) => void;
  getGateBaseRoom: () => string;
  getSketchRoom: () => string;
  getSite2TabsRoom: () => string;
  getFloatingSyncRoom: () => string;
};

const PRIVATE_CREDENTIAL_KEY = 'wp_private_room_credential';
const SKETCH_ROOM_SUFFIX = '::sketch';

type StoredPrivateRoomCredential = {
  schemaVersion: 1;
  room: string;
  token: string;
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

function readStoredPrivateCredential(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): StoredPrivateRoomCredential | null {
  const { App, storage, reportNonFatal } = args;
  try {
    const raw =
      typeof storage.getString === 'function' ? storage.getString(readPrivateRoomStorageKey(storage)) : null;
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const rec = value as Record<string, unknown>;
    const room = readRoomString(rec.room);
    const token = readRoomString(rec.token);
    return rec.schemaVersion === 1 && room && token ? { schemaVersion: 1, room, token } : null;
  } catch (e) {
    reportNonFatal(App, 'privateRoomCredential.read', e, { throttleMs: 8000 });
    return null;
  }
}

function writeStoredPrivateCredential(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
  room: string;
  token: string;
}): boolean {
  const { App, storage, reportNonFatal } = args;
  const room = readRoomString(args.room);
  const token = readRoomString(args.token);
  if (!room || !token) return false;
  try {
    if (typeof storage.setString === 'function') {
      const credential: StoredPrivateRoomCredential = { schemaVersion: 1, room, token };
      const written = storage.setString(readPrivateRoomStorageKey(storage), JSON.stringify(credential));
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
    const persisted = writeStoredPrivateCredential({
      App,
      storage,
      reportNonFatal,
      room,
      token: initialRoomToken,
    });
    if (persisted) removeRoomTokenFromUrl(App, cfg.roomTokenParam);
  }

  const currentRoom = (): string => {
    const resolved = getRoomFromUrl(App, cfg.roomParam);
    return resolved || cfg.publicRoom;
  };

  const getPrivateCredential = (): StoredPrivateRoomCredential | null =>
    readStoredPrivateCredential({ App, storage, reportNonFatal });
  const getPrivateRoom = (): string => getPrivateCredential()?.room || '';
  const getPrivateRoomToken = (): string => getPrivateCredential()?.token || '';

  const setPrivateRoomCredential = (nextRoom: string, token: string): void => {
    writeStoredPrivateCredential({ App, storage, reportNonFatal, room: nextRoom, token });
  };

  const currentRoomToken = (): string => {
    const current = currentRoom();
    if (!current || current === cfg.publicRoom) return '';
    const urlToken = readRoomString(getRoomFromUrl(App, cfg.roomTokenParam));
    if (urlToken) return urlToken;
    return current === getPrivateRoom() ? getPrivateRoomToken() : '';
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
    currentRoomToken,
    getPrivateRoom,
    getPrivateRoomToken,
    setPrivateRoomCredential,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom: (): string => `${getGateBaseRoom()}::tabsGate`,
    getFloatingSyncRoom: (): string => `${getGateBaseRoom()}::syncPin`,
  };
}
