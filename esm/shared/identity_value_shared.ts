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

/**
 * Normalize the structural creation order persisted for sketch-box dividers.
 */
export function normalizeSketchBoxDividerStructuralOrder(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || !Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

/**
 * Older generated sketch-box divider ids contain the creation timestamp after
 * their seven-character random token. Recover it so saved legacy projects can
 * use creation-order partition semantics without an eager data migration.
 */
export function inferLegacySketchBoxDividerStructuralOrder(id: unknown): number | null {
  if (typeof id !== 'string') return null;
  const match = /^sb[dh]_([a-z0-9]{7})([a-z0-9]+)$/i.exec(id);
  if (!match) return null;
  const encodedTimestamp = match[2];
  if (!encodedTimestamp) return null;
  const timestamp = Number.parseInt(encodedTimestamp, 36);
  return Number.isSafeInteger(timestamp) && timestamp > 0 ? timestamp : null;
}

export function resolveSketchBoxDividerStructuralOrder(order: unknown, id?: unknown): number | null {
  return normalizeSketchBoxDividerStructuralOrder(order) ?? inferLegacySketchBoxDividerStructuralOrder(id);
}
