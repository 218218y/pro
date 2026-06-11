export type RecordMap = Record<string, unknown>;

export function isRecord(value: unknown): value is RecordMap {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asRecord(value: unknown): RecordMap | null {
  return isRecord(value) ? value : null;
}

export function readNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readRecordValue(record: unknown, key: string): unknown {
  const rec = asRecord(record);
  return rec ? rec[key] : null;
}

export function readRecordNumber(record: unknown, key: string): number | null {
  return readNumber(readRecordValue(record, key));
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
