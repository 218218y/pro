import type { UiStateLike, UnknownRecord } from '../../../../../types';

import type { FloorStyle, SettingsVisualFloorType, WallColor } from './settings_visual_shared_contracts.js';

export function isRecord(value: unknown): value is UnknownRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): UnknownRecord | null {
  return isRecord(value) ? value : null;
}

export function getString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function getBool(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

export function asFiniteNumber(value: unknown, defaultValue: number): number {
  const next = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN;
  return Number.isFinite(next) ? next : defaultValue;
}

export function normalizeFloorStyle(value: unknown): FloorStyle | null {
  const rec = asRecord(value);
  if (!rec) return null;

  const id = getString(rec.id) || '';
  if (!id) return null;

  const rawSize = rec.size;
  const size =
    typeof rawSize === 'number' ? rawSize : typeof rawSize === 'string' ? parseFloat(rawSize) : NaN;

  return {
    id,
    name: getString(rec.name) || undefined,
    color: getString(rec.color) || undefined,
    color1: getString(rec.color1) || undefined,
    color2: getString(rec.color2) || undefined,
    lines: getString(rec.lines) || undefined,
    size: Number.isFinite(size) && size > 0 ? size : undefined,
  };
}

export function normalizeWallColor(value: unknown): WallColor | null {
  const rec = asRecord(value);
  if (!rec) return null;

  const id = getString(rec.id) || '';
  const val = getString(rec.val) || '';
  if (!id || !val) return null;

  return {
    id,
    val,
    name: getString(rec.name) || undefined,
  };
}

export function getFloorTypeFromUi(ui: UiStateLike): SettingsVisualFloorType {
  const value = ui.currentFloorType;
  return value === 'parquet' || value === 'tiles' || value === 'none' ? value : 'parquet';
}
