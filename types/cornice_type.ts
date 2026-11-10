// The persisted cornice discriminator is shared by the UI, project IO,
// renderer, and builder. Keep its normalization at the cross-layer type seam.
export type CorniceType = 'classic' | 'wave' | 'straight';

export type CorniceDimensionsCm = {
  sideCm?: number;
  frontCm?: number;
  heightCm?: number;
};

export type CorniceDimensionOverridesCm = {
  [Key in keyof CorniceDimensionsCm]-?: number | null;
};

export function normalizeCorniceType(value: unknown, fallback: CorniceType = 'classic'): CorniceType {
  const type = typeof value === 'string' ? value.trim().toLowerCase() : '';
  return type === 'classic' || type === 'wave' || type === 'straight' ? type : fallback;
}
