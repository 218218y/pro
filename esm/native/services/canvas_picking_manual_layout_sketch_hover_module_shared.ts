import type { UnknownRecord } from '../../../types';
import { asRecord } from '../runtime/record.js';

export type RecordMap = Record<string, unknown>;
export type SketchDividerTargetBoxLike = UnknownRecord;
export type CornerLikeRecord = RecordMap & {
  modulesConfiguration?: RecordMap[];
  stackSplitLower?: RecordMap & { modulesConfiguration?: RecordMap[] };
};

export function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordList(record: unknown, key: string): RecordMap[] {
  const value = readRecordValue(record, key);
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function asRecordList(value: unknown): RecordMap[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

export function readNum(obj: unknown, key: string): number | null {
  const v = readRecordValue(obj, key);
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readFiniteNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

export function readSketchDividerTargetBox(value: unknown): SketchDividerTargetBoxLike | null {
  return isRecord(value) ? value : null;
}
