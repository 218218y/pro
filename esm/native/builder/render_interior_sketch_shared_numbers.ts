export function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function toPositiveNumber(value: unknown): number | null {
  const num = toFiniteNumber(value);
  return num != null && num > 0 ? num : null;
}

export function toNormalizedUnit(value: unknown, defaultValue = 0.5): number {
  const num = toFiniteNumber(value);
  if (num == null) return defaultValue;
  return Math.max(0, Math.min(1, num));
}
