import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';
import { buildPresetBackedCustomData } from '../features/interior_layout_presets/api.js';
import type {
  CustomDataLike,
  ModuleKey,
  SketchConfigLike,
  SketchExtrasLike,
} from './canvas_picking_sketch_direct_hit_workflow_contracts.js';

export { asRecord };

function isRecord(v: unknown): v is UnknownRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function isSketchExtrasLike(value: unknown): value is SketchExtrasLike {
  return isRecord(value);
}

function isCustomDataLike(value: unknown): value is CustomDataLike {
  return isRecord(value);
}

function isBooleanArray(value: unknown): value is boolean[] {
  return Array.isArray(value) && value.every(v => typeof v === 'boolean');
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(v => typeof v === 'string');
}

export function readRecordString(record: unknown, key: string): string {
  const rec = asRecord(record);
  const value = rec ? rec[key] : undefined;
  return value != null ? String(value) : '';
}

export function readRecordNumber(record: unknown, key: string): number | null {
  const rec = asRecord(record);
  if (!rec) return null;
  const value = rec[key];
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function readRecordBoolean(record: unknown, key: string): boolean {
  const rec = asRecord(record);
  return !!(rec && rec[key]);
}

export function readRecordArray(record: unknown, key: string): unknown[] | null {
  const rec = asRecord(record);
  const value = rec ? rec[key] : null;
  return Array.isArray(value) ? value : null;
}

export function ensureArray(parent: UnknownRecord, key: string): unknown[] {
  const current = readRecordArray(parent, key);
  if (current) return current;
  const next: unknown[] = [];
  parent[key] = next;
  return next;
}

export function readSketchExtras(cfg: SketchConfigLike): SketchExtrasLike | null {
  const extra = cfg.sketchExtras;
  return isSketchExtrasLike(extra) ? extra : null;
}

export function ensureSketchExtras(cfg: SketchConfigLike): SketchExtrasLike {
  const current = readSketchExtras(cfg);
  if (current) return current;
  const next: SketchExtrasLike = {};
  cfg.sketchExtras = next;
  return next;
}

export function ensureCustomData(cfg: SketchConfigLike): CustomDataLike {
  const current = cfg.customData;
  if (isCustomDataLike(current)) return current;
  const next: CustomDataLike = { shelves: [], rods: [], storage: false };
  cfg.customData = next;
  return next;
}

export function ensureBooleanArray(parent: UnknownRecord, key: string): boolean[] {
  const current = isBooleanArray(parent[key]) ? [...parent[key]] : null;
  if (current) {
    parent[key] = current;
    return current;
  }
  const next: boolean[] = [];
  parent[key] = next;
  return next;
}

export function ensureStringArray(parent: UnknownRecord, key: string): string[] {
  const current = isStringArray(parent[key]) ? [...parent[key]] : null;
  if (current) {
    parent[key] = current;
    return current;
  }
  const next: string[] = [];
  parent[key] = next;
  return next;
}

export function readGridDivisions(gridMap: UnknownRecord | null, mapKey: ModuleKey): number {
  const key = mapKey != null ? String(mapKey) : '';
  const info = key && gridMap ? asRecord(gridMap[key]) : null;
  const divisions = info ? readRecordNumber(info, 'gridDivisions') : null;
  return typeof divisions === 'number' && Number.isFinite(divisions) && divisions > 1 ? divisions : 6;
}

function seedShelfPreset(cfg: SketchConfigLike, divs: number): void {
  const customData: CustomDataLike = buildPresetBackedCustomData(cfg.layout, divs);
  cfg.customData = customData;
  cfg.braceShelves = Array.isArray(cfg.braceShelves) ? cfg.braceShelves : [];
}

export function prepareShelfToggleConfig(
  cfg: SketchConfigLike,
  divs: number,
  topY: number,
  bottomY: number
): CustomDataLike {
  const wasCustom = readRecordBoolean(cfg, 'isCustom');
  cfg.isCustom = true;
  cfg.gridDivisions = divs;
  if (typeof topY === 'number' && typeof bottomY === 'number') cfg.savedDims = { top: topY, bottom: bottomY };
  if (!wasCustom) seedShelfPreset(cfg, divs);
  const customData = ensureCustomData(cfg);
  const shelves = ensureBooleanArray(customData, 'shelves');
  while (shelves.length < divs - 1) shelves.push(false);
  ensureBooleanArray(customData, 'rods');
  if (typeof customData.storage !== 'boolean') customData.storage = false;
  ensureStringArray(customData, 'shelfVariants');
  return customData;
}
