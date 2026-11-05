// Runtime counterpart of cornice_type.ts for direct .js module consumers.
// Keep the persisted discriminator normalization identical in both modules.
export function normalizeCorniceType(value, fallback = 'classic') {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return type === 'classic' || type === 'wave' || type === 'straight' ? type : fallback;
}
