// Internal geometry runtime contracts (Pure ESM)
//
// Runtime-created geometry values are not a UI/import parsing boundary.  A
// numeric value read from Mesh/Group positions, geometry parameters, geometry
// args, or builder-created metadata must already be a finite number.

export type GeometryRuntimeRecord = Record<string, unknown>;

export type GeometryBoxDimensionKey = 'width' | 'height' | 'depth';

export function asGeometryRuntimeRecord(value: unknown): GeometryRuntimeRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GeometryRuntimeRecord)
    : null;
}

export function readGeometryRuntimeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readGeometryRuntimePositiveNumber(value: unknown): number | null {
  const n = readGeometryRuntimeNumber(value);
  return n != null && n > 0 ? n : null;
}

export function readGeometryRuntimeSign(value: unknown, defaultValue: 1 | -1 | null = null): 1 | -1 | null {
  if (value === 1 || value === -1) return value;
  return defaultValue;
}

export function readGeometryRuntimePositiveBoxDimension(
  geometry: unknown,
  index: number,
  key: GeometryBoxDimensionKey
): number | null {
  const rec = asGeometryRuntimeRecord(geometry);
  if (!rec) return null;

  const args = Array.isArray(rec.args) ? rec.args : null;
  const argValue = readGeometryRuntimePositiveNumber(args?.[index]);
  if (argValue != null) return argValue;

  const parameters = asGeometryRuntimeRecord(rec.parameters);
  return readGeometryRuntimePositiveNumber(parameters?.[key]);
}
