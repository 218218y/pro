import type { AppContainer, ActionMetaLike, ConfigStateLike, UnknownRecord } from '../../../types';

import { getActions } from '../runtime/actions_access_core.js';
import { getInternalGridMap } from '../runtime/cache_access.js';
import { metaMerge, metaRestore } from '../runtime/meta_profiles_access.js';
import { getStorageServiceMaybe } from '../runtime/storage_access.js';
import { reportServiceNonFatal } from './service_error_observability.js';

export type AppLike = AppContainer | UnknownRecord | null | undefined;
export type StorageLike = {
  KEYS?: { SAVED_COLORS?: unknown } & UnknownRecord;
  getString?: (key: string) => string | null | undefined;
  getJSON?: (key: string, defaultValue: unknown[]) => unknown;
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

export function reportBootSeedNonFatal(
  App: AppLike,
  op: string,
  error: unknown,
  consoleOutput = false
): void {
  reportServiceNonFatal(
    asAppContainer(App),
    error,
    { where: 'native/services/boot_seeds_part02', op },
    { consoleOutput }
  );
}

export function createBootSeedRestoreMeta(
  App: AppLike,
  meta: Record<string, unknown> | null | undefined,
  source: string
): ActionMetaLike {
  const next = isRecord(meta) ? { ...meta } : {};
  if (!next.source) next.source = source;

  try {
    return metaRestore(App, next, source);
  } catch (error) {
    reportBootSeedNonFatal(App, `metadata.restore:${source}`, error);
  }

  try {
    return metaMerge(App, next, undefined, undefined);
  } catch (error) {
    reportBootSeedNonFatal(App, `metadata.merge:${source}`, error);
    return next;
  }
}

export function getCfgSafe(
  App: AppLike,
  readCfgStore: (App: AppContainer) => ConfigStateLike,
  op = 'config.read'
): ConfigStateLike {
  try {
    const app = asAppContainer(App);
    return app ? readCfgStore(app) : {};
  } catch (error) {
    reportBootSeedNonFatal(App, op, error);
    return {};
  }
}

export function cloneUnknownArray(value: unknown[], defaultValue: unknown[]): unknown[] {
  try {
    if (typeof structuredClone === 'function') {
      const cloned = structuredClone(value);
      return Array.isArray(cloned) ? cloned : defaultValue;
    }
  } catch {
    // Structured cloning is optional here; JSON cloning remains the secondary copy path.
  }
  try {
    const cloned = JSON.parse(JSON.stringify(value));
    return Array.isArray(cloned) ? cloned : defaultValue;
  } catch {
    // Non-serializable saved data falls back to the caller-provided detached value.
    return defaultValue;
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
