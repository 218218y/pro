import type { UnknownRecord } from '../../../types';

export type ShoeDrawerBaseType = 'plinth' | 'legs' | 'none';

export const SHOE_DRAWER_AUTO_BASE_PREVIOUS_TYPE_KEY = 'shoeDrawerAutoBasePreviousType';

export const SHOE_DRAWER_BASE_BLOCKED_MESSAGE =
  'אי אפשר לבחור צוקל או רגליים כאשר קיימות מגירות נעליים. הסר קודם את מגירות הנעליים, ואז אפשר לשנות בסיס.';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function normalizeShoeDrawerBaseType(value: unknown): ShoeDrawerBaseType {
  const raw = normalizeString(value);
  if (raw === 'legs' || raw === 'none') return raw;
  return 'plinth';
}

export function isBlockingShoeDrawerBaseType(value: unknown): boolean {
  return normalizeShoeDrawerBaseType(value) !== 'none';
}

export function getShoeDrawerBaseTypeLabel(value: unknown): string {
  switch (normalizeShoeDrawerBaseType(value)) {
    case 'legs':
      return 'רגליים';
    case 'none':
      return 'ללא צוקל וללא רגליים';
    case 'plinth':
    default:
      return 'צוקל';
  }
}

function recordHasShoeDrawerFlag(record: UnknownRecord): boolean {
  if (record.hasShoeDrawer === true) return true;
  if (record.hasShoe === true) return true;
  if (record.shoeDrawer === true) return true;
  if (normalizeString(record.extDrawers) === 'shoe') return true;
  if (normalizeString(record.extDrawersType) === 'shoe') return true;
  return false;
}

function valueHasShoeDrawers(value: unknown, seen: Set<object>, depth: number): boolean {
  if (value == null || depth > 24) return false;

  if (Array.isArray(value)) {
    if (seen.has(value)) return false;
    seen.add(value);
    for (const item of value) {
      if (valueHasShoeDrawers(item, seen, depth + 1)) return true;
    }
    return false;
  }

  if (!isRecord(value)) return false;
  if (seen.has(value)) return false;
  seen.add(value);

  if (recordHasShoeDrawerFlag(value)) return true;

  for (const [key, next] of Object.entries(value)) {
    if (key === 'preChestState') continue;
    if (valueHasShoeDrawers(next, seen, depth + 1)) return true;
  }
  return false;
}

export function configHasShoeDrawers(config: unknown): boolean {
  return valueHasShoeDrawers(config, new Set<object>(), 0);
}
