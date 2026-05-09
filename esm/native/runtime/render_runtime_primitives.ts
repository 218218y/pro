import type { UnknownRecord } from '../../../types';

import { createNullRecord } from './record.js';

export type MotionScalarKey = 'x' | 'y' | 'z' | 'w';
export type MotionComponentLike = UnknownRecord & {
  x?: unknown;
  y?: unknown;
  z?: unknown;
  w?: unknown;
};

export type FiniteVec3Like = {
  x: number;
  y: number;
  z: number;
};

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isRecordOf<T extends UnknownRecord>(value: unknown): value is T {
  return isRecord(value);
}

function createRecord<T extends UnknownRecord>(): T {
  return createNullRecord<T>();
}

export function asRecord<T extends UnknownRecord = UnknownRecord>(value: unknown, defaultValue?: T): T {
  const seed = typeof defaultValue === 'undefined' ? createRecord<T>() : defaultValue;
  return isRecordOf<T>(value) ? value : seed;
}

export function readRecord<T extends UnknownRecord = UnknownRecord>(value: unknown): T | null {
  return isRecordOf<T>(value) ? value : null;
}

export function readFiniteNumber(value: unknown, defaultValue: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : defaultValue;
}

export function readFiniteNumberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function hasFiniteVec3(value: unknown): value is FiniteVec3Like {
  const rec = readRecord(value);
  return (
    !!rec &&
    readFiniteNumberOrNull(rec.x) !== null &&
    readFiniteNumberOrNull(rec.y) !== null &&
    readFiniteNumberOrNull(rec.z) !== null
  );
}

export function readMotionComponent(value: unknown): MotionComponentLike | null {
  return readRecord<MotionComponentLike>(value);
}

export function readMotionNumberPart(value: MotionComponentLike | null, key: MotionScalarKey): number {
  return readFiniteNumberOrNull(value?.[key]) ?? Number.NaN;
}

export function readMethod<TArgs extends unknown[]>(
  owner: unknown,
  key: string
): ((...args: TArgs) => unknown) | null {
  const rec = readRecord(owner);
  const fn = rec ? rec[key] : undefined;
  return typeof fn === 'function' ? (...args: TArgs) => Reflect.apply(fn, owner, args) : null;
}
