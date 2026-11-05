export type CorniceType = 'classic' | 'wave' | 'straight';

export function normalizeCorniceType(value: unknown, fallback: CorniceType = 'classic'): CorniceType {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return type === 'classic' || type === 'wave' || type === 'straight' ? type : fallback;
}
