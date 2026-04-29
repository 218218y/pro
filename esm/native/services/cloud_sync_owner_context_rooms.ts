import type { AppContainer } from '../../../types';

import {
  getRoomFromUrl,
  isExplicitSite2Bundle,
  randomRoomId,
  type SupabaseCfg,
} from './cloud_sync_config.js';
import { resolveCloudSyncSketchRooms } from './cloud_sync_sketch_rooms.js';
import type { CloudSyncReportNonFatal, StorageLike } from './cloud_sync_owner_context_runtime_shared.js';

export type CloudSyncOwnerRooms = {
  room: string;
  currentRoom: () => string;
  getPrivateRoom: () => string;
  setPrivateRoom: (value: string) => void;
  getGateBaseRoom: () => string;
  getSketchRoom: () => string;
  getSite2TabsRoom: () => string;
  getFloatingSyncRoom: () => string;
};

const PRIVATE_KEY = 'wp_private_room';
const SKETCH_ROOM_SUFFIX = '::sketch';

function readRoomString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readStoredPrivateRoom(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): string {
  const { App, storage, reportNonFatal } = args;
  try {
    return typeof storage.getString === 'function' ? readRoomString(storage.getString(PRIVATE_KEY)) : '';
  } catch (e) {
    reportNonFatal(App, 'privateRoom.read', e, { throttleMs: 8000 });
    return '';
  }
}

function writeStoredPrivateRoom(args: {
  App: AppContainer;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
  value: string;
}): void {
  const { App, storage, reportNonFatal } = args;
  const next = readRoomString(args.value);
  if (!next) return;
  try {
    if (typeof storage.setString === 'function') storage.setString(PRIVATE_KEY, next);
  } catch (e) {
    reportNonFatal(App, 'privateRoom.write', e, { throttleMs: 8000 });
  }
}

function resolveStablePrivateRoom(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): string {
  const { App, cfg, storage, reportNonFatal } = args;
  const stored = readStoredPrivateRoom({ App, storage, reportNonFatal });
  if (stored) return stored;

  const configured = readRoomString(cfg.privateRoom);
  const next = configured || randomRoomId();
  writeStoredPrivateRoom({ App, storage, reportNonFatal, value: next });
  return next;
}

export function createCloudSyncOwnerRooms(args: {
  App: AppContainer;
  cfg: SupabaseCfg;
  storage: StorageLike;
  reportNonFatal: CloudSyncReportNonFatal;
}): CloudSyncOwnerRooms {
  const { App, cfg, storage, reportNonFatal } = args;

  const room = getRoomFromUrl(App, cfg.roomParam) || cfg.publicRoom;

  const currentRoom = (): string => {
    const resolved = getRoomFromUrl(App, cfg.roomParam);
    return resolved || cfg.publicRoom;
  };

  const getPrivateRoom = (): string => resolveStablePrivateRoom({ App, cfg, storage, reportNonFatal });

  const setPrivateRoom = (value: string): void => {
    writeStoredPrivateRoom({ App, storage, reportNonFatal, value });
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
    getPrivateRoom,
    setPrivateRoom,
    getGateBaseRoom,
    getSketchRoom,
    getSite2TabsRoom: (): string => `${getGateBaseRoom()}::tabsGate`,
    getFloatingSyncRoom: (): string => `${getGateBaseRoom()}::syncPin`,
  };
}
