import type { AppContainer, TimeoutHandleLike } from '../../../types';

import { getRoomFromUrl, isExplicitSite2Bundle } from './cloud_sync_config.js';
import { _cloudSyncReportNonFatal } from './cloud_sync_support.js';

export type CloudSyncTabsGateStorageLike = {
  getString?(key: unknown): string | null;
  setString?(key: unknown, value: unknown): boolean;
};

export type CloudSyncTabsGateConfig = {
  anonKey: string;
  roomParam: string;
  privateRoom?: string;
  publicRoom: string;
};

export type CloudSyncTabsGateTimeoutApi = {
  setTimeoutFn: (handler: () => void, ms: number) => TimeoutHandleLike;
  clearTimeoutFn: (id: TimeoutHandleLike) => void;
};

export const SITE2_TABS_ROOM_SUFFIX = '::tabsGate';
export const SITE2_TABS_LOCAL_OPEN_KEY = 'wp_site2_tabs_gate_open';
export const SITE2_TABS_LOCAL_UNTIL_KEY = 'wp_site2_tabs_gate_until';
export const SITE2_TABS_TTL_MS = 90 * 60 * 1000;

export function resolveCloudSyncTabsGateBaseRoom(args: {
  App: AppContainer;
  cfg: CloudSyncTabsGateConfig;
  getGateBaseRoom?: () => string;
}): string {
  const { App, cfg, getGateBaseRoom } = args;
  try {
    if (typeof getGateBaseRoom === 'function') {
      const explicit = String(getGateBaseRoom() || '').trim();
      if (explicit) return explicit;
    }
  } catch (error) {
    _cloudSyncReportNonFatal(App, 'site2TabsGate.getBaseRoom', error, { throttleMs: 8000 });
  }
  const urlRoom = getRoomFromUrl(App, cfg.roomParam);
  if (urlRoom) return urlRoom;
  return cfg.publicRoom;
}

export function isCloudSyncTabsGateController(App: AppContainer): boolean {
  return !isExplicitSite2Bundle(App);
}
