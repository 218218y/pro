import type { UnknownRecord } from '../../../types';
import { asRecord, getProp, getRecordProp } from '../runtime/record.js';
import { getSpecialDims } from '../features/special_dims/index.js';
import { __asNum } from './canvas_picking_core_helpers.js';

export type DoorRuntimeRef = {
  group?: { userData?: UnknownRecord } | null;
  isOpen?: boolean;
};

export function __isDoorRuntimeRef(v: unknown): v is DoorRuntimeRef {
  const r = asRecord(v);
  if (!r) return false;
  const g = r.group;
  if (g != null && typeof g !== 'object') return false;
  return true;
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readSpecialDimsRecord(value: unknown): UnknownRecord | null {
  const sd = getSpecialDims(value);
  return sd ?? null;
}

export function readUiRaw(ui: unknown): UnknownRecord {
  return getRecordProp(ui, 'raw') ?? {};
}

export function readUiNumber(ui: unknown, key: string, fallback: number): number {
  return __asNum(getProp(ui, key), fallback);
}

export function readRawNumber(raw: unknown, key: string, fallback: number): number {
  return __asNum(getProp(raw, key), fallback);
}
