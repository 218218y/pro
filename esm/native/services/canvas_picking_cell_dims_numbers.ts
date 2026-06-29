export function readCanonicalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readCanonicalNumberOr(value: unknown, defaultValue: number): number {
  const n = readCanonicalNumber(value);
  return n != null ? n : defaultValue;
}

export function readCanonicalPositiveNumberOr(value: unknown, defaultValue: number): number {
  const n = readCanonicalNumber(value);
  return n != null && n > 0 ? n : defaultValue;
}

export function readCanonicalIntOr(value: unknown, defaultValue: number): number {
  const n = readCanonicalNumber(value);
  if (n == null) return defaultValue;
  const i = n < 0 ? Math.ceil(n) : Math.floor(n);
  return Number.isFinite(i) ? i : defaultValue;
}
