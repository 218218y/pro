export type IdentityValue = string | number;

export function readIdentityValue(value: unknown): IdentityValue | null {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return null;
}

export function formatIdentityValue(value: IdentityValue | null | undefined): string {
  if (typeof value === 'string') return value;
  return typeof value === 'number' && Number.isFinite(value) ? String(value) : '';
}
