import type { UnknownRecord } from '../../../types/index.js';

import { INTERIOR_SHELF_GEOMETRY_POLICY } from '../../shared/dimensions/interior_fittings_policy.js';
import { INTERIOR_STORAGE_GRID_POLICY } from '../../shared/dimensions/interior_storage_policy.js';
import { MATERIAL_THICKNESS_POLICY } from '../../shared/dimensions/material_thickness_policy.js';
import { asRecord } from '../runtime/record.js';

export type RecordMap = UnknownRecord;
export type ManualFreeContentKind = 'shelf_grid' | 'rod' | 'storage';

export type ManualLayoutFreeBoxShelfGridPlan = {
  shelfYs: number[];
  shelfYNorms: number[];
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  depthM: number;
  blockedReason: string | null;
};

export type PresetLayoutFreeBoxPlan = {
  layoutType: string;
  shelfYs: number[];
  shelfYNorms: number[];
  rodYs: number[];
  rodYNorms: number[];
  storageBarrier: { y: number; h: number; z: number } | null;
  storageYNorm: number | null;
  cellXNormMin: number;
  cellXNormMax: number;
  cellYNormMin: number;
  cellYNormMax: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  shelfDepthM: number;
  blockedReason: string | null;
};

export type BraceShelvesFreeBoxPlan = {
  shelfId: string | null;
  shelfIdx: number;
  shelfY: number;
  shelfYNorm: number;
  contentXNorm: number;
  previewX: number;
  previewW: number;
  previewInternalZ: number;
  previewInnerD: number;
  previewWoodThick: number;
  currentVariant: 'regular' | 'double' | 'glass' | 'brace';
  nextVariant: 'regular' | 'brace';
  nextDepthM: number;
};

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readString(value: unknown): string | null {
  return typeof value === 'string' && value ? value : null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export function readRecordNumberArray(record: unknown, key: string): number[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.map(readNumber).filter((n): n is number => n != null) : [];
}

export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function normalizeGridDivisions(value: unknown): number {
  const parsed = readNumber(value);
  return parsed != null && parsed >= 2 && parsed <= 8
    ? Math.round(parsed)
    : INTERIOR_STORAGE_GRID_POLICY.gridDivisionsDefault;
}

export function normalizeShelfVariant(value: unknown): 'regular' | 'double' | 'glass' | 'brace' {
  return value === 'double' || value === 'glass' || value === 'brace' ? value : 'regular';
}

export function shelfThicknessForVariant(variant: unknown, woodThick: number): number {
  const normalized = normalizeShelfVariant(variant);
  if (normalized === 'glass') return MATERIAL_THICKNESS_POLICY.glassShelf.thicknessM;
  if (normalized === 'double') {
    return Math.max(woodThick, woodThick * INTERIOR_SHELF_GEOMETRY_POLICY.doubleThicknessMultiplier);
  }
  return woodThick;
}

export function resolveShelfDepth(args: { variant: string; innerD: number; woodThick: number }): number {
  if (args.variant === 'brace') return args.innerD;
  return Math.min(args.innerD, Math.max(args.woodThick, INTERIOR_SHELF_GEOMETRY_POLICY.regularDepthM));
}

export function normalizeBetween(value: unknown, min: number, max: number, defaultValue: number): number {
  const parsed = readNumber(value);
  if (parsed == null) return defaultValue;
  const lo = Math.min(min, max);
  const hi = Math.max(min, max);
  return Math.max(lo, Math.min(hi, parsed));
}

export function resolveManualToolContentKind(tool: string): ManualFreeContentKind | null {
  if (tool === 'shelf') return 'shelf_grid';
  if (tool === 'rod') return 'rod';
  if (tool === 'storage') return 'storage';
  return null;
}

export function readContentItemXNorm(item: unknown): number | null {
  const raw = readRecordValue(item, 'xNorm');
  const xNorm = readRecordNumber(item, 'xNorm');
  if (raw != null && xNorm == null) return null;
  return clampUnit(xNorm ?? 0.5);
}
