import type { AppContainer } from '../../../types';

import { getRoomFromUrl, isExplicitSite2Bundle, type SupabaseCfg } from './cloud_sync_config.js';
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

  const getPrivateRoom = (): string => {
    try {
      return typeof storage.getString === 'function'
        ? String(storage.getString(PRIVATE_KEY) || '').trim()
        : '';
    } catch (e) {
      reportNonFatal(App, 'privateRoom.read', e, { throttleMs: 8000 });
      return '';
    }
  };

  const setPrivateRoom = (value: string): void => {
    const next = String(value || '').trim();
    if (!next) return;
    try {
      if (typeof storage.setString === 'function') storage.setString(PRIVATE_KEY, next);
    } catch (e) {
      reportNonFatal(App, 'privateRoom.write', e, { throttleMs: 8000 });
    }
  };

  const getGateBaseRoom = (): string => {
    const urlRoom = getRoomFromUrl(App, cfg.roomParam);
    if (urlRoom) return urlRoom;
    const configuredPrivateRoom = String(cfg.privateRoom || '').trim();
    if (configuredPrivateRoom) return configuredPrivateRoom;
    return cfg.publicRoom;
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
