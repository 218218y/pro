import type { AppContainer, ActionMetaLike, ConfigStateLike, UnknownRecord } from '../../../types';

import { getActions } from '../runtime/actions_access_core.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';

export type AppLike = AppContainer | UnknownRecord | null | undefined;
export type StorageLike = {
  KEYS?: { SAVED_COLORS?: unknown } & UnknownRecord;
  getString?: (key: string) => string | null | undefined;
  getJSON?: (key: string, fallback: unknown[]) => unknown;
};
export type ColorsActionsLike = { setMultiMode?: (next: boolean, meta?: ActionMetaLike) => void };
export type RoomActionsLike = {
  setWardrobeType?: (next: string, meta?: ActionMetaLike) => void;
  setManualWidth?: (next: boolean, meta?: ActionMetaLike) => void;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isAppContainer(App: AppLike): App is AppContainer {
  return !!App && typeof App === 'object';
}

export function asAppContainer(App: AppLike): AppContainer | null {
  return isAppContainer(App) ? App : null;
}

export function getCfgSafe(
  App: AppLike,
  readCfgStore: (App: AppContainer) => ConfigStateLike
): ConfigStateLike {
  try {
    const app = asAppContainer(App);
    return app ? readCfgStore(app) : {};
  } catch (_) {
    return {};
  }
}

export function cloneUnknownArray(value: unknown[], fallback: unknown[]): unknown[] {
  try {
    if (typeof structuredClone === 'function') {
      const cloned = structuredClone(value);
      return Array.isArray(cloned) ? cloned : fallback;
    }
  } catch {
    // ignore
  }
  try {
    const cloned = JSON.parse(JSON.stringify(value));
    return Array.isArray(cloned) ? cloned : fallback;
  } catch {
    return fallback;
  }
}

export function isColorsActionsLike(value: unknown): value is ColorsActionsLike {
  return isRecord(value);
}

export function isRoomActionsLike(value: unknown): value is RoomActionsLike {
  return isRecord(value);
}

export function isStorageLike(value: unknown): value is StorageLike {
  return isRecord(value);
}

export function getColorsActions(App: AppLike): ColorsActionsLike | null {
  const app = asAppContainer(App);
  const actions = app ? getActions(app) : null;
  const colors = isRecord(actions) ? actions.colors : null;
  return isColorsActionsLike(colors) ? colors : null;
}

export function getRoomActions(App: AppLike): RoomActionsLike | null {
  const app = asAppContainer(App);
  const actions = app ? getActions(app) : null;
  const room = isRecord(actions) ? actions.room : null;
  return isRoomActionsLike(room) ? room : null;
}

export function getStorage(App: AppLike): StorageLike | null {
  const app = asAppContainer(App);
  const storage = app ? getStorageServiceMaybe(app) : null;
  return isStorageLike(storage) ? storage : null;
}

export function seedInternalGridMap(App: AppLike): void {
  if (!App || typeof App !== 'object') return;
  getInternalGridMap(App, false);
}
