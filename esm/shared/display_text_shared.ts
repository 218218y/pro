export type DisplayScalar = string | number | boolean | bigint | null | undefined;

export function readDisplayScalar(value: unknown): DisplayScalar {
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return value;
  }
  return null;
}

export function formatDisplayScalar(value: DisplayScalar, defaultText = ''): string {
  if (value === null || typeof value === 'undefined') return defaultText;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value.toString() : defaultText;
  return value.toString();
}
