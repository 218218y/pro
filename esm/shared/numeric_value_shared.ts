export type NumericInput = string | number | null | undefined;

export function readNumericInput(value: unknown): NumericInput {
  return typeof value === 'string' || typeof value === 'number' ? value : null;
}

export function readFiniteNumber(value: NumericInput): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readInteger(value: NumericInput): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!/^[+-]?\d+$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function readPositiveInteger(value: NumericInput): number | null {
  const parsed = readInteger(value);
  return parsed != null && parsed > 0 ? parsed : null;
}
