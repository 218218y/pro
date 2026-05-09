import type { AppContainer, RemovedDoorsMap, UnknownRecord } from '../../../types/index.js';
import { readModeStateFromApp } from '../runtime/root_state_access.js';
import { MODES } from '../runtime/api.js';

import type { CornerBuildUI, CornerConfigRecord } from './corner_state_normalize_contracts.js';
import { asRecord, isRecord } from './corner_geometry_plan.js';

export function isAppContainer(value: unknown): value is AppContainer {
  return isRecord(value);
}

export function asApp(App: unknown): AppContainer | null {
  return isAppContainer(App) ? App : null;
}

export function asCornerBuildUI(value: unknown): CornerBuildUI {
  return isRecord(value) ? value : {};
}

export function asRemovedDoorsMap(value: unknown): RemovedDoorsMap {
  if (!isRecord(value)) return {};
  const next: RemovedDoorsMap = {};
  for (const [key, raw] of Object.entries(value)) {
    if (isRemovedDoorToggleValue(raw)) next[key] = raw;
  }
  return next;
}

export function asCornerConfigRecord(value: unknown): CornerConfigRecord | null {
  return isRecord(value) ? value : null;
}

export function isRemovedDoorToggleValue(value: unknown): value is RemovedDoorsMap[string] {
  return value === true || value === false || value === null || value === 1 || value === 0;
}

export function readFiniteNumber(v: unknown): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

export function readPositiveCm(v: unknown): number {
  const n = readFiniteNumber(v);
  return n != null && n > 0 ? n : NaN;
}

export function readBool(obj: CornerBuildUI, key: keyof CornerBuildUI): boolean {
  return typeof obj[key] !== 'undefined' ? !!obj[key] : false;
}

export function readStringValue(obj: UnknownRecord, key: string, defaultValue = ''): string {
  const v = obj[key];
  return v == null ? defaultValue : String(v);
}

export function readModeConstant(name: string, defaultMode: string): string {
  const rec = asRecord(MODES);
  const v = rec[name];
  return typeof v === 'string' && v ? v : defaultMode;
}

export function ensureCornerConfigRecord(src: unknown): CornerConfigRecord {
  const srcRec = asCornerConfigRecord(src);
  const rec: CornerConfigRecord = srcRec ? { ...srcRec } : {};
  const customData: NonNullable<CornerConfigRecord['customData']> = isRecord(rec.customData)
    ? { ...rec.customData }
    : {};
  if (!Array.isArray(customData.shelves)) customData.shelves = [];
  if (!Array.isArray(customData.rods)) customData.rods = [];
  if (typeof customData.storage !== 'boolean') customData.storage = false;
  rec.customData = customData;
  if (!Array.isArray(rec.intDrawersList)) rec.intDrawersList = [];
  return rec;
}

export function resolveCornerPrimaryMode(App: unknown): string {
  let primaryMode = readModeConstant('NONE', 'none');
  try {
    const appRec = asApp(App);
    const modeState = appRec ? readModeStateFromApp(appRec) : null;
    if (modeState && typeof modeState.primary === 'string' && modeState.primary) {
      primaryMode = modeState.primary;
    }
  } catch {
    // keep default
  }
  return primaryMode;
}
