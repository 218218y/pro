// Runtime snapshot selectors (ESM)
//
// Pure snapshot readers and typed normalization. Store/App access lives in the
// store owner so selector policy is testable without root-state wiring.

import type { RuntimeScalarKey, RuntimeScalarValueMap } from '../../../types/index.js';
import { getRuntimeScalarDefault, readRuntimeValue } from './runtime_selectors_shared.js';
import {
  isRuntimeScalarValue,
  readBooleanLike,
  readFiniteNullableNumberLike,
  readFiniteNumberLike,
  RUNTIME_SCALAR_NORMALIZERS,
} from './runtime_selectors_normalizers.js';

/** Read a typed runtime scalar from a runtime snapshot. */
export function readRuntimeScalarFromSnapshot<K extends RuntimeScalarKey>(
  rt: unknown,
  key: K
): RuntimeScalarValueMap[K] | undefined {
  try {
    const value = readRuntimeValue(rt, key);
    return typeof value === 'undefined' || !isRuntimeScalarValue(key, value) ? undefined : value;
  } catch {
    return undefined;
  }
}

/** Read a boolean runtime key (supports persisted string values). */
export function readRuntimeBoolFromSnapshot(rt: unknown, key: string, defaultValue: boolean): boolean {
  try {
    return readBooleanLike(readRuntimeValue(rt, key), defaultValue);
  } catch {
    return defaultValue;
  }
}

/** Read a finite number runtime key (supports numeric strings). */
export function readRuntimeNumberFromSnapshot(rt: unknown, key: string, defaultValue: number): number {
  try {
    return readFiniteNumberLike(readRuntimeValue(rt, key), defaultValue);
  } catch {
    return defaultValue;
  }
}

/** Read a nullable finite number runtime key (supports numeric strings). */
export function readRuntimeNullableNumberFromSnapshot(
  rt: unknown,
  key: string,
  defaultValue: number | null
): number | null {
  try {
    return readFiniteNullableNumberLike(readRuntimeValue(rt, key), defaultValue);
  } catch {
    return defaultValue;
  }
}

/** Convenience: read scalar keys with safe defaults (typed). */
export function readRuntimeScalarOrDefault<K extends RuntimeScalarKey>(
  rt: unknown,
  key: K,
  defaultValue?: RuntimeScalarValueMap[K]
): RuntimeScalarValueMap[K] {
  const def = getRuntimeScalarDefault(key, defaultValue);
  const rawValue = readRuntimeValue(rt, key);
  if (typeof rawValue === 'undefined') return def;
  return RUNTIME_SCALAR_NORMALIZERS[key](rawValue, def);
}
