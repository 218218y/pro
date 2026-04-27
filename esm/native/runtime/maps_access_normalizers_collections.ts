import type { SavedColorLike } from '../../../types';

import { normalizeColorSwatchesOrder, normalizeSavedColorsList } from './maps_access_shared.js';

export function normalizeSavedColorsSnapshot(value: unknown): Array<SavedColorLike | string> {
  return normalizeSavedColorsList(value);
}

export function normalizeSavedColorObjectsSnapshot(value: unknown): SavedColorLike[] {
  const out: SavedColorLike[] = [];
  for (const entry of normalizeSavedColorsList(value)) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) out.push({ ...entry });
  }
  return out;
}

export function normalizeColorSwatchesOrderSnapshot(value: unknown): string[] {
  return normalizeColorSwatchesOrder(value);
}
