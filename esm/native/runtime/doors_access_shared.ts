import type {
  DoorsRuntimeAccessLike,
  DrawerRuntimeAccessLike,
  DoorsServiceAccessLike,
  DrawerServiceAccessLike,
  UnknownRecord,
} from '../../../types';
import { asRecord, createNullRecord } from './record.js';

export type MutableRecord = UnknownRecord;
export type RuntimeHolder = MutableRecord & { runtime?: unknown };
export type DoorsServiceLike = DoorsServiceAccessLike & RuntimeHolder;
export type DrawerServiceLike = DrawerServiceAccessLike & RuntimeHolder;
export type DrawerRuntimeLike = DrawerRuntimeAccessLike & MutableRecord;
export type DoorsRuntimeLike = DoorsRuntimeAccessLike & MutableRecord;
export type UnknownMethod = (...args: never[]) => unknown;

export function asFiniteNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function asKey(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return null;
}

export function createNullProtoRecord<T extends object = MutableRecord>(): T {
  return createNullRecord<T>();
}

export function asDoorsService(value: unknown): DoorsServiceLike | null {
  return asRecord<DoorsServiceLike>(value);
}

export function asDrawerService(value: unknown): DrawerServiceLike | null {
  return asRecord<DrawerServiceLike>(value);
}

export function isMethod<T extends UnknownMethod>(value: unknown): value is T {
  return typeof value === 'function';
}

export function readRuntimeRecord<T extends MutableRecord>(runtime: unknown): T | null {
  return asRecord<T>(runtime);
}

export function ensureRuntimeRecord<T extends MutableRecord>(owner: RuntimeHolder): T {
  const runtime = readRuntimeRecord<T>(owner.runtime);
  if (runtime) return runtime;
  const next = createNullProtoRecord<T>();
  owner.runtime = next;
  return next;
}
