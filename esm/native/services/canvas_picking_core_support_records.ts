// Focused canvas-picking support owner for local record coercion and corner-cell
// default-shape detection.

import type { AppContainer, UnknownRecord } from '../../../types';

import { __wp_toFiniteNumber } from './canvas_picking_core_support_numbers.js';

export function __wp_isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function __wp_asRecord(v: unknown): UnknownRecord | null {
  return __wp_isRecord(v) ? v : null;
}

export function __wp_readRecordValue(rec: UnknownRecord | null | undefined, key: string): unknown {
  return rec ? rec[key] : undefined;
}

export function __wp_readRecordArray(rec: UnknownRecord | null | undefined, key: string): unknown[] {
  const value = __wp_readRecordValue(rec, key);
  return Array.isArray(value) ? value : [];
}

export function __wp_readRecordBoolean(rec: UnknownRecord | null | undefined, key: string): boolean {
  return !!__wp_readRecordValue(rec, key);
}

export function __wp_readRecordNumber(rec: UnknownRecord | null | undefined, key: string): number | null {
  return __wp_toFiniteNumber(__wp_readRecordValue(rec, key));
}

export function __wp_readRecordString(rec: UnknownRecord | null | undefined, key: string): string | null {
  const value = __wp_readRecordValue(rec, key);
  return typeof value === 'string' ? value : null;
}

export function __wp_isDefaultCornerCellCfgLike(cfg0: unknown): boolean {
  try {
    const cfg = __wp_asRecord(cfg0) || {};

    const __parseIntSafe = (v: unknown, fb: number): number => {
      const n = parseInt(String(v ?? ''), 10);
      return Number.isFinite(n) ? n : fb;
    };

    const layout = __wp_readRecordString(cfg, 'layout') || 'shelves';
    const ext = __parseIntSafe(__wp_readRecordValue(cfg, 'extDrawersCount'), 0);
    const shoe = __wp_readRecordBoolean(cfg, 'hasShoeDrawer');
    const list = __wp_readRecordArray(cfg, 'intDrawersList');
    const isCustom = __wp_readRecordBoolean(cfg, 'isCustom');
    const gd = __parseIntSafe(__wp_readRecordValue(cfg, 'gridDivisions'), 6);

    const cd = __wp_asRecord(__wp_readRecordValue(cfg, 'customData')) || {};
    const shelves = __wp_readRecordArray(cd, 'shelves');
    const rods = __wp_readRecordArray(cd, 'rods');
    const storage = __wp_readRecordBoolean(cd, 'storage');

    const allFalse = (arr: unknown[]): boolean => {
      for (let i = 0; i < arr.length; i++) if (!!arr[i]) return false;
      return true;
    };

    return (
      (layout === 'shelves' || layout === '' || layout == null) &&
      ext === 0 &&
      shoe === false &&
      list.length === 0 &&
      isCustom === false &&
      gd === 6 &&
      storage === false &&
      allFalse(shelves) &&
      allFalse(rods)
    );
  } catch {
    return true;
  }
}

function __wp_isAppContainer(app: unknown): app is AppContainer {
  return !!app && typeof app === 'object';
}

export function __wp_getApp(app: unknown): AppContainer | null {
  return __wp_isAppContainer(app) ? app : null;
}
