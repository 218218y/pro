import { asRecord } from '../runtime/record.js';
import type { RecordMap } from './canvas_picking_sketch_module_stack_commit_contracts.js';

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function ensureRecord(record: RecordMap, key: string): RecordMap {
  const current = asRecord(record[key]);
  if (current) return current;
  const next: RecordMap = {};
  record[key] = next;
  return next;
}

export function ensureRecordList(record: RecordMap, key: string): RecordMap[] {
  const current = record[key];
  if (Array.isArray(current) && current.every(isRecord)) return current;
  const next = Array.isArray(current) ? current.filter(isRecord) : [];
  record[key] = next;
  return next;
}

export function createRandomId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}${Date.now().toString(36)}`;
}
