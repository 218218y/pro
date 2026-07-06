export type AdhesiveGlassKind = 'black_glass' | 'frosted_glass';

export const DOOR_SPECIAL_BLACK_GLASS: AdhesiveGlassKind = 'black_glass';
export const DOOR_SPECIAL_FROSTED_GLASS: AdhesiveGlassKind = 'frosted_glass';

export function resolveAdhesiveGlassKind(value: unknown): AdhesiveGlassKind | null {
  const raw = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (raw === DOOR_SPECIAL_BLACK_GLASS) return DOOR_SPECIAL_BLACK_GLASS;
  if (raw === DOOR_SPECIAL_FROSTED_GLASS) return DOOR_SPECIAL_FROSTED_GLASS;
  return null;
}

export function isAdhesiveGlassValue(value: unknown): value is AdhesiveGlassKind {
  return resolveAdhesiveGlassKind(value) != null;
}

export function isDoorSpecialSurfaceValue(value: unknown): value is 'mirror' | 'glass' | AdhesiveGlassKind {
  return value === 'mirror' || value === 'glass' || isAdhesiveGlassValue(value);
}
