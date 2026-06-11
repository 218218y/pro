export function asFiniteNumber(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : fallback;
}

export function asFiniteInt(v: unknown, fallback: number): number {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

export function asOptionalNumber(v: unknown): number | '' {
  if (v === null || v === undefined || v === '') return '';
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : '';
}
