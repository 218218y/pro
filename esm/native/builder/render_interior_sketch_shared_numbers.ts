export function toFiniteNumber(value: unknown): number | null {
  const num = typeof value === 'number' ? value : value != null ? Number(value) : NaN;
  return Number.isFinite(num) ? num : null;
}

export function toPositiveNumber(value: unknown): number | null {
  const num = toFiniteNumber(value);
  return num != null && num > 0 ? num : null;
}

export function toNormalizedUnit(value: unknown, fallback = 0.5): number {
  const num = toFiniteNumber(value);
  if (num == null) return fallback;
  return Math.max(0, Math.min(1, num));
}
