// Preview-render numeric contracts (Pure ESM)
//
// Preview payloads are a render-operation boundary: callers may pass numbers or
// non-empty numeric strings, but booleans, nulls, arrays, objects, and empty
// strings are not numbers for placement math.

export function readPreviewNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function readPreviewPositiveNumber(value: unknown): number | null {
  const n = readPreviewNumber(value);
  return n != null && n > 0 ? n : null;
}

export function readPreviewNumberOr(value: unknown, defaultValue: number): number {
  const n = readPreviewNumber(value);
  return n != null ? n : defaultValue;
}

export function readPreviewPositiveNumberOr(value: unknown, defaultValue: number): number {
  const n = readPreviewPositiveNumber(value);
  return n != null ? n : defaultValue;
}
