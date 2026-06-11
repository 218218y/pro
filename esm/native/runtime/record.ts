// Small runtime helpers for working with unknown objects safely.
// Keep these tiny and dependency-free; used across kernel/builder/platform boundaries.

import type { UnknownCallable, UnknownRecord } from '../../../types/index.js';

type CallableLike = UnknownCallable;
type RecordSeed<T extends object> = T | (() => T);

type AsRecord = {
  <T extends object = UnknownRecord>(v: unknown): T | null;
  <T extends object>(v: unknown, seed: RecordSeed<T>): T | null;
};

type GetRecordProp = {
  <T extends object = UnknownRecord>(obj: unknown, key: string): T | null;
  <T extends object>(obj: unknown, key: string, seed: RecordSeed<T>): T | null;
};

type CloneRecord = {
  <T extends object = UnknownRecord>(obj: unknown): T;
  <T extends object>(obj: unknown, seed: RecordSeed<T>): T;
};

function makeSeed<T extends object>(seed: RecordSeed<T>): T {
  return typeof seed === 'function' ? seed() : seed;
}

function cloneSeed<T extends object>(seed: RecordSeed<T>): T {
  const value = makeSeed(seed);
  return isRecord(value) ? Object.assign({}, value) : value;
}

function clonePlainRecord<T extends object>(value: T): T {
  return Object.assign({}, value);
}

export function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function createNullRecord<T extends object = UnknownRecord>(): T {
  return Object.create(null);
}

function isRecordOf<T extends object>(v: unknown): v is T {
  return isRecord(v);
}

function isCallableOf<T extends CallableLike>(v: unknown): v is T {
  return typeof v === 'function';
}

export const asRecord: AsRecord = <T extends object = UnknownRecord>(v: unknown, seed?: RecordSeed<T>) => {
  if (!isRecordOf<T>(v)) return null;
  return seed ? Object.assign(cloneSeed(seed), v) : v;
};

export function getProp(obj: unknown, key: string): unknown {
  const r = asRecord(obj);
  return r ? r[key] : undefined;
}

export const getRecordProp: GetRecordProp = <T extends object = UnknownRecord>(
  obj: unknown,
  key: string,
  seed?: RecordSeed<T>
) => {
  const value = getProp(obj, key);
  return seed ? asRecord(value, seed) : asRecord<T>(value);
};

export function getFn<T extends CallableLike = CallableLike>(obj: unknown, key: string): T | null {
  const v = getProp(obj, key);
  return isCallableOf<T>(v) ? v : null;
}

export const cloneRecord: CloneRecord = <T extends object = UnknownRecord>(
  obj: unknown,
  seed?: RecordSeed<T>
) => {
  const r = asRecord(obj);
  if (!seed) return r ? clonePlainRecord(r) : {};
  return Object.assign(cloneSeed(seed), r ?? {});
};
