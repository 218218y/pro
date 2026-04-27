import type {
  AppContainer,
  UnknownRecord,
  UiStateLike,
  ToolsNamespaceLike,
  DrawersOpenIdLike,
  ActionMetaLike,
} from '../../../types';

import { readUiRawIntFromSnapshot } from '../runtime/ui_raw_selectors.js';
import { readUiStateFromStore, readModeStateFromStore } from '../runtime/root_state_access.js';
import { getStoreSurfaceMaybe } from '../runtime/store_surface_access.js';
import { asRecord } from '../runtime/record.js';
import { getTools } from '../runtime/service_access.js';
import { getMetaActionFn } from '../runtime/actions_access_domains.js';
import { getDimsMFromPlatform } from '../runtime/platform_access.js';
import { getDocumentMaybe } from '../runtime/api.js';

export type AppLike = AppContainer | UnknownRecord | null | undefined;

export type ModeConstantsLike = {
  NONE?: string;
  PAINT?: unknown;
  LAYOUT?: unknown;
  MANUAL_LAYOUT?: unknown;
  BRACE_SHELVES?: unknown;
  INT_DRAWER?: unknown;
  DIVIDER?: unknown;
};

export type DrawerToolsLike = Pick<
  ToolsNamespaceLike,
  'getDrawersOpenId' | 'setDrawersOpenId' | 'setPaintColor' | 'setInteriorManualTool'
> & {
  setDrawersOpenId?: (id: DrawersOpenIdLike, meta?: ActionMetaLike) => unknown;
};

export function asApp(App: AppLike): AppContainer | null {
  return asRecord<AppContainer>(App);
}

export function getModes(MODES: unknown): ModeConstantsLike {
  return asRecord<ModeConstantsLike>(MODES) || {};
}

export function getNoneMode(modes: ModeConstantsLike): string {
  return typeof modes.NONE === 'string' && modes.NONE ? modes.NONE : 'none';
}

export function readPreviousMode(App: AppContainer, noneMode: string): string {
  try {
    const modeState = readModeStateFromStore(getStoreSurfaceMaybe(App));
    return typeof modeState.primary === 'string' ? modeState.primary : noneMode;
  } catch {
    return noneMode;
  }
}

export function asDrawerOpenId(value: unknown): string | number | null {
  if (value == null) return null;
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

export function readPreviousOpenDrawerId(tools: DrawerToolsLike | null): string | number | null {
  try {
    if (typeof tools?.getDrawersOpenId !== 'function') return null;
    return asDrawerOpenId(tools.getDrawersOpenId());
  } catch {
    return null;
  }
}

export function buildDimsSyncMeta(App: AppContainer): UnknownRecord {
  const transient = getMetaActionFn<(meta?: ActionMetaLike, source?: string) => UnknownRecord>(
    App,
    'transient'
  );
  if (typeof transient === 'function') {
    try {
      return transient(undefined, 'ui:dimsSync');
    } catch {
      // ignore
    }
  }
  return { source: 'ui:dimsSync' };
}

export function readWardrobeUiSnapshot(App: AppContainer): {
  safeUi: UiStateLike;
  raw: UnknownRecord;
  dims: ReturnType<typeof getDimsMFromPlatform>;
  doors: number | null;
} {
  const ui = readUiStateFromStore(getStoreSurfaceMaybe(App));
  const safeUi: UiStateLike = ui || {};
  const raw = asRecord<UnknownRecord>(safeUi.raw) || asRecord<UnknownRecord>(safeUi) || {};
  const dims = getDimsMFromPlatform(App, safeUi);

  let doors: number | null = null;
  try {
    const nextDoors = readUiRawIntFromSnapshot(safeUi, 'doors', -999);
    if (Number.isFinite(nextDoors) && nextDoors !== -999) doors = nextDoors;
  } catch {
    doors = null;
  }

  return { safeUi, raw, dims, doors };
}

function readActiveElementAttr(value: unknown, name: string): string {
  if (!value || typeof value !== 'object') return '';
  const getAttribute = Reflect.get(value, 'getAttribute');
  if (typeof getAttribute !== 'function') return '';
  try {
    const raw = Reflect.apply(getAttribute, value, [name]);
    return typeof raw === 'string' ? raw : '';
  } catch {
    return '';
  }
}

export function readActiveDimensionEditId(App: AppContainer): string {
  try {
    const doc = getDocumentMaybe(App);
    const activeElement = doc?.activeElement;
    const activeId = readActiveElementAttr(activeElement, 'data-wp-active-id');
    return activeId.trim();
  } catch {
    return '';
  }
}

export function getEditStateTools(App: AppContainer): DrawerToolsLike | null {
  return getTools(App);
}
