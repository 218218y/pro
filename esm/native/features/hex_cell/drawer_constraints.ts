import type { UnknownRecord } from '../../../../types/index.js';

import { moduleHasHexCell } from './hex_cell.js';

export const HEX_CELL_DRAWER_ADD_BLOCKED_MESSAGE =
  'אי אפשר לבנות מגירות בתא משושה. תא משושה אינו תומך במגירות חיצוניות או פנימיות.';

export const HEX_CELL_WITH_DRAWERS_BLOCKED_MESSAGE =
  'אי אפשר לשנות תא עם מגירות לתא משושה. הסר קודם את המגירות החיצוניות או הפנימיות מהתא.';

function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function readRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

function readPositiveCount(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function hasNonEmptyArray(value: unknown): boolean {
  return Array.isArray(value) && value.length > 0;
}

function hasDrawerBagContent(bag: UnknownRecord | null): boolean {
  if (!bag) return false;
  if (hasNonEmptyArray(bag.drawers) || hasNonEmptyArray(bag.extDrawers)) return true;

  const boxes = Array.isArray(bag.boxes) ? bag.boxes : [];
  for (const box of boxes) {
    const rec = readRecord(box);
    if (!rec) continue;
    if (hasNonEmptyArray(rec.drawers) || hasNonEmptyArray(rec.extDrawers)) return true;
  }

  return false;
}

function hasSavedDrawerPerCellContent(value: unknown): boolean {
  const rec = readRecord(value);
  if (!rec) return false;
  return Object.values(rec).some(entry => {
    if (Array.isArray(entry)) return entry.length > 0;
    if (typeof entry === 'boolean') return entry;
    return readPositiveCount(entry) > 0;
  });
}

export function moduleHasDrawerContent(cfgMod: unknown): boolean {
  const cfg = readRecord(cfgMod);
  if (!cfg) return false;

  if (readPositiveCount(cfg.extDrawersCount) > 0) return true;
  if (cfg.hasShoeDrawer === true) return true;

  const savedExternalDrawers = cfg.extDrawers;
  if (savedExternalDrawers === 'shoe') return true;
  if (readPositiveCount(savedExternalDrawers) > 0) return true;

  if (hasDrawerBagContent(readRecord(cfg.sketchExtras))) return true;
  if (hasNonEmptyArray(cfg.drawers) || hasNonEmptyArray(cfg.extDrawers)) return true;
  if (hasNonEmptyArray(cfg.regularExtDrawers)) return true;
  if (hasSavedDrawerPerCellContent(cfg.drawersPerCell)) return true;

  return false;
}

export function shouldBlockDrawerBuildInHexCell(cfgMod: unknown): boolean {
  return moduleHasHexCell(cfgMod);
}

export function shouldBlockHexCellApplyOverDrawers(cfgMod: unknown): boolean {
  return moduleHasDrawerContent(cfgMod);
}
