import { readConfigStateFromStore } from './root_state_access.js';
import type { UnknownRecord } from '../../../types/index.js';
import type { ReadConfigArray } from './config_selectors_shared.js';
import { getCfgRecord } from './config_selectors_shared.js';
import { readConfigStateFromApp } from './config_selectors_scalars.js';
import { asRecord as asUnknownRecord } from './record.js';

/** Read a boolean config key (supports persisted string values). */
export function readConfigBoolFromSnapshot(cfg: unknown, key: string, defaultValue: boolean): boolean {
  const value = getCfgRecord(cfg)[key];
  if (value === undefined || value === null) return defaultValue;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!s) return defaultValue;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return !!value;
}

export function readConfigBoolFromStore(store: unknown, key: string, defaultValue: boolean): boolean {
  const c = readConfigStateFromStore(store);
  return readConfigBoolFromSnapshot(c, key, defaultValue);
}

export function readConfigBoolFromApp(App: unknown, key: string, defaultValue: boolean): boolean {
  const c = readConfigStateFromApp(App);
  return readConfigBoolFromSnapshot(c, key, defaultValue);
}

/** Read an enum-like string key with an allow-list + default. */
export function readConfigEnumFromSnapshot<T extends string>(
  cfg: unknown,
  key: string,
  allowed: readonly T[],
  defaultValue: T
): T {
  const raw = getCfgRecord(cfg)[key];
  const s = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '';
  const vv = s.trim();
  return allowed.find(a => a === vv) ?? defaultValue;
}

export function readConfigEnumFromStore<T extends string>(
  store: unknown,
  key: string,
  allowed: readonly T[],
  defaultValue: T
): T {
  const c = readConfigStateFromStore(store);
  return readConfigEnumFromSnapshot(c, key, allowed, defaultValue);
}

export function readConfigEnumFromApp<T extends string>(
  App: unknown,
  key: string,
  allowed: readonly T[],
  defaultValue: T
): T {
  const c = readConfigStateFromApp(App);
  return readConfigEnumFromSnapshot(c, key, allowed, defaultValue);
}

/** Read a string key (empty string counts as missing and returns the default). */
export function readConfigStringFromSnapshot(cfg: unknown, key: string, defaultValue: string): string {
  const value = getCfgRecord(cfg)[key];
  const s = typeof value === 'string' ? value : '';
  return s && s.trim() ? s : defaultValue;
}

/** Read a nullable string key ('' counts as null). */
export function readConfigNullableStringFromSnapshot(
  cfg: unknown,
  key: string,
  defaultValue: string | null
): string | null {
  const value = getCfgRecord(cfg)[key];
  if (value === null) return null;
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : defaultValue;
}

/** Convenience: read common config containers with normalization. */
export const readConfigArrayFromSnapshot: ReadConfigArray = (
  cfg: unknown,
  key: string,
  defaultValue: unknown[] = []
): unknown[] => {
  const value = getCfgRecord(cfg)[key];
  if (!Array.isArray(value)) return defaultValue;
  return Array.from(value);
};

export function readConfigMapFromSnapshot(
  cfg: unknown,
  key: string,
  defaultValue: UnknownRecord = {}
): UnknownRecord {
  const value = getCfgRecord(cfg)[key];
  return asUnknownRecord(value) ?? defaultValue;
}
