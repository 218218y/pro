import type { RecordMap } from './canvas_picking_sketch_box_stack_preview_contracts.js';

export function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): RecordMap | null {
  return isRecord(value) ? value : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  return null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}

export function readRecordArray(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}
