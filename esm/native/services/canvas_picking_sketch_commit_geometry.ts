export type SketchCommitRecord = Record<string, unknown>;

export function isSketchCommitRecord(value: unknown): value is SketchCommitRecord {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function asSketchCommitRecord(value: unknown): SketchCommitRecord | null {
  return isSketchCommitRecord(value) ? value : null;
}

export function readSketchCommitNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readSketchCommitPositiveNumber(value: unknown): number | null {
  const n = readSketchCommitNumber(value);
  return n != null && n > 0 ? n : null;
}

export function readSketchCommitNonNegativeNumber(value: unknown): number | null {
  const n = readSketchCommitNumber(value);
  return n != null && n >= 0 ? n : null;
}

export function readSketchCommitInteger(value: unknown): number | null {
  const n = readSketchCommitNumber(value);
  return n != null && Number.isInteger(n) ? n : null;
}

export function clampSketchCommitUnitNumber(value: unknown, fallback: number): number {
  const n = readSketchCommitNumber(value) ?? readSketchCommitNumber(fallback) ?? 0.5;
  return Math.max(0, Math.min(1, n));
}

export function writeSketchCommitNumber(target: SketchCommitRecord, key: string, value: unknown): boolean {
  const n = readSketchCommitNumber(value);
  if (n == null) return false;
  target[key] = n;
  return true;
}

export function writeSketchCommitPositiveNumber(
  target: SketchCommitRecord,
  key: string,
  value: unknown
): boolean {
  const n = readSketchCommitPositiveNumber(value);
  if (n == null) return false;
  target[key] = n;
  return true;
}

export function writeSketchCommitNonNegativeNumber(
  target: SketchCommitRecord,
  key: string,
  value: unknown
): boolean {
  const n = readSketchCommitNonNegativeNumber(value);
  if (n == null) return false;
  target[key] = n;
  return true;
}

export function writeSketchCommitClampedUnitNumber(
  target: SketchCommitRecord,
  key: string,
  value: unknown,
  fallback: number
): number {
  const n = clampSketchCommitUnitNumber(value, fallback);
  target[key] = n;
  return n;
}

export function writeSketchCommitOptionalClampedUnitNumber(
  target: SketchCommitRecord,
  key: string,
  value: unknown
): boolean {
  const n = readSketchCommitNumber(value);
  if (n == null) return false;
  target[key] = Math.max(0, Math.min(1, n));
  return true;
}

export function ensureSketchCommitRecord(target: SketchCommitRecord, key: string): SketchCommitRecord {
  const existing = asSketchCommitRecord(target[key]);
  if (existing) return existing;
  const next: SketchCommitRecord = {};
  target[key] = next;
  return next;
}

export function normalizeSketchCommitRecordList(value: unknown): SketchCommitRecord[] {
  return Array.isArray(value) ? value.filter(isSketchCommitRecord) : [];
}

export function ensureSketchCommitRecordList(target: SketchCommitRecord, key: string): SketchCommitRecord[] {
  const current = target[key];
  if (Array.isArray(current) && current.every(isSketchCommitRecord)) return current;
  const next = normalizeSketchCommitRecordList(current);
  target[key] = next;
  return next;
}
