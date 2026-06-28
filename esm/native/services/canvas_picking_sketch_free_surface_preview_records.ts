import { asRecord } from '../runtime/record.js';

export function readRecordValue(record: unknown, key: string): unknown {
  return asRecord(record)?.[key];
}

export function readRecordString(record: unknown, key: string): string | null {
  const value = readRecordValue(record, key);
  return value == null ? null : String(value);
}

export function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
}
