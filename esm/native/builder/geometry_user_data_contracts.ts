// Internal geometry userData contracts (Pure ESM)
//
// These helpers are intentionally strict: render-created Mesh/Group metadata is an
// internal geometry contract, not a UI/import boundary.  Numeric strings must not
// be silently accepted here, because doing so hides stale runtime state and makes
// downstream placement code depend on accidental coercion.

export type GeometryUserDataRecord = Record<string, unknown>;

export type DoorLeafRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function asGeometryUserData(value: unknown): GeometryUserDataRecord | null {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    ? (value as GeometryUserDataRecord)
    : null;
}

export function readGeometryUserDataNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function readGeometryUserDataPositiveNumber(value: unknown): number | null {
  const n = readGeometryUserDataNumber(value);
  return n != null && n > 0 ? n : null;
}

export function readGeometryUserDataNumberKey(
  userData: GeometryUserDataRecord | null | undefined,
  key: string
): number | null {
  if (!userData || !Object.prototype.hasOwnProperty.call(userData, key)) return null;
  return readGeometryUserDataNumber(userData[key]);
}

export function readGeometryUserDataPositiveNumberKey(
  userData: GeometryUserDataRecord | null | undefined,
  key: string
): number | null {
  const n = readGeometryUserDataNumberKey(userData, key);
  return n != null && n > 0 ? n : null;
}

export function readGeometryUserDataSign(value: unknown, defaultValue: 1 | -1 | null = null): 1 | -1 | null {
  if (value === 1 || value === -1) return value;
  return defaultValue;
}

export function readGeometryUserDataSignKey(
  userData: GeometryUserDataRecord | null | undefined,
  key: string,
  defaultValue: 1 | -1 | null = null
): 1 | -1 | null {
  if (!userData || !Object.prototype.hasOwnProperty.call(userData, key)) return defaultValue;
  return readGeometryUserDataSign(userData[key], defaultValue);
}

export function readDoorLeafRectFromGeometryUserData(
  userData: GeometryUserDataRecord | null | undefined,
  options: { offsetKeys?: readonly string[] } = {}
): DoorLeafRect | null {
  const width = readGeometryUserDataPositiveNumberKey(userData, '__doorWidth');
  const height = readGeometryUserDataPositiveNumberKey(userData, '__doorHeight');
  if (width == null || height == null) return null;

  const offsetKeys = options.offsetKeys || ['__doorMeshOffsetX'];
  let offsetX = 0;
  for (let i = 0; i < offsetKeys.length; i += 1) {
    const candidate = readGeometryUserDataNumberKey(userData, offsetKeys[i]);
    if (candidate != null) {
      offsetX = candidate;
      break;
    }
  }

  return {
    minX: offsetX - width / 2,
    maxX: offsetX + width / 2,
    minY: -height / 2,
    maxY: height / 2,
  };
}

export function readExplicitDoorRectFromGeometryUserData(
  userData: GeometryUserDataRecord | null | undefined
): DoorLeafRect | null {
  const minX = readGeometryUserDataNumberKey(userData, '__doorRectMinX');
  const maxX = readGeometryUserDataNumberKey(userData, '__doorRectMaxX');
  const minY = readGeometryUserDataNumberKey(userData, '__doorRectMinY');
  const maxY = readGeometryUserDataNumberKey(userData, '__doorRectMaxY');
  if (minX == null || maxX == null || minY == null || maxY == null) return null;
  if (!(maxX > minX) || !(maxY > minY)) return null;
  return { minX, maxX, minY, maxY };
}
