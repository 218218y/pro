import type {
  AppContainer,
  RuntimeMetaActionsAccessLike,
  RuntimeActionsAccessLike,
  UnknownRecord,
} from '../../../types';

import { MODES } from './api.js';
import { getActionNamespace } from './actions_access_core.js';

export type AppLike = AppContainer;
export type ValueRecord = Record<string, unknown>;

export type ActionsNamespaceLike = {
  meta?: RuntimeMetaActionsAccessLike | null;
  runtime?: RuntimeActionsAccessLike | null;
};

export type ModeSliceLike = {
  primary?: string | null;
  opts?: UnknownRecord | null;
};

export type DoorUserDataLike = UnknownRecord & {
  partId?: string | number;
  __wpDoorOpenDirSign?: unknown;
  __wpDoorOpenZSign?: unknown;
  __handleZSign?: unknown;
  __wpCornerPentDoor?: unknown;
  __wpCornerPentDoorPair?: unknown;
  __wpCornerPentFront?: unknown;
  __wpCornerPentagon?: unknown;
  __wpSketchExtDrawer?: unknown;
  __wpSketchBoxDoor?: unknown;
  __wpSketchFreePlacement?: unknown;
  noGlobalOpen?: unknown;
  __invertSwing?: unknown;
  __wpType?: unknown;
  moduleIndex?: unknown;
};

export function isRecord(v: unknown): v is ValueRecord {
  return !!v && typeof v === 'object';
}

export function readRecord(v: unknown): ValueRecord | null {
  return isRecord(v) ? v : null;
}

export function readString(obj: ValueRecord | null, key: string): string | null {
  const value = obj ? obj[key] : null;
  return typeof value === 'string' && value ? value : null;
}

export function readNumber(obj: ValueRecord | null, key: string, fallback = 0): number {
  const value = obj ? obj[key] : null;
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function isInvalidNumber(value: unknown): boolean {
  return typeof value !== 'number' || Number.isNaN(value);
}

export function doorsRuntimeNow(): number {
  try {
    return Date.now();
  } catch {
    return 0;
  }
}

export function getActionsNamespace(App: AppLike): ActionsNamespaceLike | null {
  const actions = getActionNamespace(App, '');
  return isRecord(actions) ? actions : null;
}

export function getModeConst(key: 'NONE' | 'MANUAL_LAYOUT', fallback: string): string {
  const modes = readRecord(MODES);
  if (!modes) return fallback;
  const value = modes[key];
  return typeof value === 'string' && value ? value : fallback;
}

export function normalizeModuleKey(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && value) return value;
  return null;
}

export function vecCopy(dst: unknown, src: unknown): void {
  if (isRecord(dst) && typeof dst.copy === 'function') {
    dst.copy(src);
    return;
  }

  if (isRecord(dst) && isRecord(src)) {
    if (Number.isFinite(src.x)) dst.x = src.x;
    if (Number.isFinite(src.y)) dst.y = src.y;
    if (Number.isFinite(src.z)) dst.z = src.z;
  }
}
