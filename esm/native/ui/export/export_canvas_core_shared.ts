// WardrobePro — Export canvas low-level callable/object helpers (Native ESM)

import type { UnknownCallable } from '../../../../types/common.js';

type CallableLike = UnknownCallable;
type ConstructorLike<TInstance = unknown> = new (...args: readonly unknown[]) => TInstance;

export function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asRecord(v: unknown): Record<string, unknown> {
  return isRecord(v) ? v : {};
}

export function isObjectLike(v: unknown): v is object | CallableLike {
  return !!v && (typeof v === 'object' || typeof v === 'function');
}

function isCallableLike<T extends CallableLike = CallableLike>(value: unknown): value is T {
  return typeof value === 'function';
}

function isFunctionSurface<T>(value: unknown): value is T {
  return typeof value === 'function';
}

export function isConstructorLike<T = unknown>(value: unknown): value is ConstructorLike<T> {
  return typeof value === 'function';
}

export function asObject(v: unknown): Record<string, unknown> {
  if (!isObjectLike(v)) return {};
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(Object(v))) out[key] = Reflect.get(v, key);
  return out;
}

export function getProp(v: unknown, key: string): unknown {
  if (!isObjectLike(v)) return undefined;
  try {
    return Reflect.get(v, key);
  } catch {
    return undefined;
  }
}

export function getFn<T extends CallableLike = CallableLike>(v: unknown, key: string): T | null {
  const fn = getProp(v, key);
  return isCallableLike<T>(fn) ? fn : null;
}

function getTypedFn<Args extends readonly unknown[] = readonly unknown[], T = unknown>(
  v: unknown,
  key: string
): UnknownCallable<Args, T> | null {
  const fn = getProp(v, key);
  if (typeof fn !== 'function') return null;
  return (...invokeArgs: Args) => {
    const result: T = Reflect.apply(fn, v, invokeArgs);
    return result;
  };
}

export function getArrayProp(v: unknown, key: string): unknown[] {
  const arr = getProp(v, key);
  return Array.isArray(arr) ? arr : [];
}

export function callFn<Args extends readonly unknown[] = readonly unknown[], T = unknown>(
  ctx: unknown,
  key: string,
  ...args: Args
): T | undefined {
  const fn = getTypedFn<Args, T>(ctx, key);
  return fn ? fn(...args) : undefined;
}

export function getCtor<T>(v: unknown, key: string): T | null {
  const ctor = getProp(v, key);
  return isConstructorLike(ctor) && isFunctionSurface<T>(ctor) ? ctor : null;
}

export function getNumberArray(v: unknown): number[] | null {
  if (!Array.isArray(v)) return null;
  const out: number[] = [];
  for (let i = 0; i < v.length; i += 1) {
    const value = v[i];
    if (typeof value !== 'number') return null;
    out.push(value);
  }
  return out;
}

export function isPromiseLike<T = unknown>(v: unknown): v is PromiseLike<T> {
  return (
    !!v && (typeof v === 'object' || typeof v === 'function') && typeof getProp(v, 'then') === 'function'
  );
}

export function getNumberProp(v: unknown, key: string, fallback: number): number {
  const x = getProp(v, key);
  const n = typeof x === 'number' ? x : Number(x);
  return Number.isFinite(n) ? n : fallback;
}

export function getBooleanProp(v: unknown, key: string): boolean | undefined {
  const x = getProp(v, key);
  return typeof x === 'undefined' ? undefined : !!x;
}

export function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

export function _toNumber(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}
