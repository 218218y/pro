// Render-operation numeric contracts (Pure ESM)
//
// Render ops are already builder-produced runtime payloads. Numeric fields at
// this boundary must be real finite numbers; string/boolean/null coercion would
// hide a broken op producer and make geometry failures harder to trace.

export function readRenderOpNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readRenderOpNumberOr(value: unknown, defaultValue: number): number {
  const n = readRenderOpNumber(value);
  return n != null ? n : defaultValue;
}

export function readRenderOpPositiveNumber(value: unknown): number | null {
  const n = readRenderOpNumber(value);
  return n != null && n > 0 ? n : null;
}
