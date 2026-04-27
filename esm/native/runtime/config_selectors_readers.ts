import { readConfigStateFromStore } from './root_state_access.js';
import type { UnknownRecord } from '../../../types/index.js';
import type { ReadConfigArray } from './config_selectors_shared.js';
import { getCfgRecord } from './config_selectors_shared.js';
import { readConfigStateFromApp } from './config_selectors_scalars.js';
import { asRecord as asUnknownRecord } from './record.js';

/** Read a boolean config key (supports legacy string values). */
export function readConfigBoolFromSnapshot(cfg: unknown, key: string, fallback: boolean): boolean {
  const value = getCfgRecord(cfg)[key];
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return !!value;
  const s = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!s) return fallback;
  if (s === 'true' || s === '1' || s === 'yes' || s === 'on') return true;
  if (s === 'false' || s === '0' || s === 'no' || s === 'off') return false;
  return !!value;
}

export function readConfigBoolFromStore(store: unknown, key: string, fallback: boolean): boolean {
  const c = readConfigStateFromStore(store);
  return readConfigBoolFromSnapshot(c, key, fallback);
}

export function readConfigBoolFromApp(App: unknown, key: string, fallback: boolean): boolean {
  const c = readConfigStateFromApp(App);
  return readConfigBoolFromSnapshot(c, key, fallback);
}

/** Read an enum-like string key with an allow-list + fallback. */
export function readConfigEnumFromSnapshot<T extends string>(
  cfg: unknown,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  const raw = getCfgRecord(cfg)[key];
  const s = typeof raw === 'string' ? raw : typeof raw === 'number' ? String(raw) : '';
  const vv = s.trim();
  return allowed.find(a => a === vv) ?? fallback;
}

export function readConfigEnumFromStore<T extends string>(
  store: unknown,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  const c = readConfigStateFromStore(store);
  return readConfigEnumFromSnapshot(c, key, allowed, fallback);
}

export function readConfigEnumFromApp<T extends string>(
  App: unknown,
  key: string,
  allowed: readonly T[],
  fallback: T
): T {
  const c = readConfigStateFromApp(App);
  return readConfigEnumFromSnapshot(c, key, allowed, fallback);
}

/** Read a string key (empty string counts as missing and falls back). */
export function readConfigStringFromSnapshot(cfg: unknown, key: string, fallback: string): string {
  const value = getCfgRecord(cfg)[key];
  const s = typeof value === 'string' ? value : '';
  return s && s.trim() ? s : fallback;
}

/** Read a nullable string key ('' counts as null). */
export function readConfigNullableStringFromSnapshot(
  cfg: unknown,
  key: string,
  fallback: string | null
): string | null {
  const value = getCfgRecord(cfg)[key];
  if (value === null) return null;
  const s = typeof value === 'string' ? value.trim() : '';
  return s ? s : fallback;
}

/** Convenience: read common config containers with normalization. */
export const readConfigArrayFromSnapshot: ReadConfigArray = (
  cfg: unknown,
  key: string,
  fallback: unknown[] = []
): unknown[] => {
  const value = getCfgRecord(cfg)[key];
  if (!Array.isArray(value)) return fallback;
  return Array.from(value);
};

export function readConfigMapFromSnapshot(
  cfg: unknown,
  key: string,
  fallback: UnknownRecord = {}
): UnknownRecord {
  const value = getCfgRecord(cfg)[key];
  return asUnknownRecord(value) ?? fallback;
}
