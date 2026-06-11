import type { UnknownRecord } from '../../../types';

import { ensureDepsRootSlot, getDepsRootSlotMaybe } from './app_roots_access.js';
import { asRecord, createNullRecord } from './record.js';

type DepsRecord = UnknownRecord;

function isPresent<T>(value: unknown): value is T {
  return value != null;
}

function createDepsRecord(): DepsRecord {
  return createNullRecord<DepsRecord>();
}

function readDepsRecord(value: unknown): DepsRecord | null {
  return asRecord<DepsRecord>(value);
}

export function getDepsRootMaybe(App: unknown): DepsRecord | null {
  return readDepsRecord(getDepsRootSlotMaybe(App));
}

export function ensureDepsRoot(App: unknown): DepsRecord {
  const current = readDepsRecord(getDepsRootSlotMaybe(App));
  if (current) return current;
  return readDepsRecord(ensureDepsRootSlot(App)) || createDepsRecord();
}

export function getDepMaybe<T = unknown>(App: unknown, key: string): T | null {
  const deps = getDepsRootMaybe(App);
  if (!deps || !key) return null;
  const value = deps[key];
  return isPresent<T>(value) ? value : null;
}

export function hasDep(App: unknown, key: string): boolean {
  const deps = getDepsRootMaybe(App);
  return !!(deps && key && Object.prototype.hasOwnProperty.call(deps, key) && deps[key] != null);
}

export function setDep(App: unknown, key: string, value: unknown): boolean {
  if (!key) return false;
  try {
    const deps = ensureDepsRoot(App);
    deps[key] = value;
    return true;
  } catch {
    return false;
  }
}

export function getDepsNamespaceMaybe<T extends UnknownRecord = UnknownRecord>(
  App: unknown,
  key: string
): T | null {
  if (!key) return null;
  return asRecord<T>(getDepMaybe(App, key));
}

export function ensureDepsNamespace<T extends UnknownRecord = UnknownRecord>(App: unknown, key: string): T {
  const deps = ensureDepsRoot(App);
  const current = asRecord<T>(deps[key]);
  if (current) return current;
  const next = createNullRecord<T>();
  deps[key] = next;
  return next;
}
