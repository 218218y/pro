import { readRenderOpNumber } from './render_ops_number_contracts.js';
import type { InteriorValueRecord } from './render_interior_ops_contracts.js';

export type InteriorShelfVariant = 'double' | 'glass' | 'brace' | 'regular';

const MAX_SAFE_INTEGER_TEXT = String(Number.MAX_SAFE_INTEGER);

function isRecord(value: unknown): value is InteriorValueRecord {
  return !!value && typeof value === 'object';
}

export function readInteriorRenderInteger(value: unknown, defaultValue: number): number {
  const n = readRenderOpNumber(value);
  return n != null ? Math.trunc(n) : defaultValue;
}

export function readInteriorRenderGridIndex(value: unknown): number | null {
  const n = readRenderOpNumber(value);
  return n != null ? Math.trunc(n) : null;
}

export function readInteriorRenderGridDivisions(value: unknown, defaultValue = 6): number {
  const gridDivisions = readInteriorRenderInteger(value, defaultValue);
  return gridDivisions >= 1 ? gridDivisions : defaultValue;
}

export function readInteriorRenderObjectIndexKey(key: string): number | null {
  if (!/^(0|[1-9]\d*)$/.test(key)) return null;
  if (key.length > MAX_SAFE_INTEGER_TEXT.length) return null;
  if (key.length === MAX_SAFE_INTEGER_TEXT.length && key > MAX_SAFE_INTEGER_TEXT) return null;

  let index = 0;
  for (let i = 0; i < key.length; i += 1) {
    index = index * 10 + (key.charCodeAt(i) - 48);
  }
  return Number.isSafeInteger(index) ? index : null;
}

export function buildInteriorRenderIndexSet(values: unknown): Record<number, true> {
  const indexSet: Record<number, true> = Object.create(null);
  if (!Array.isArray(values)) return indexSet;
  for (let i = 0; i < values.length; i += 1) {
    const index = readInteriorRenderGridIndex(values[i]);
    if (index != null) indexSet[index] = true;
  }
  return indexSet;
}

export function readInteriorShelfVariant(value: unknown): InteriorShelfVariant | null {
  const variant = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return variant === 'double' || variant === 'glass' || variant === 'brace' || variant === 'regular'
    ? variant
    : null;
}

export function buildInteriorShelfVariantByIndex(value: unknown): Record<number, InteriorShelfVariant> {
  const shelfVariantByIndex: Record<number, InteriorShelfVariant> = Object.create(null);
  const shelfVariants = isRecord(value) && !Array.isArray(value) ? value : null;
  if (!shelfVariants) return shelfVariantByIndex;

  for (const key of Object.keys(shelfVariants)) {
    const index = readInteriorRenderObjectIndexKey(key);
    if (index == null) continue;
    const variant = readInteriorShelfVariant(shelfVariants[key]);
    if (variant) shelfVariantByIndex[index] = variant;
  }
  return shelfVariantByIndex;
}
