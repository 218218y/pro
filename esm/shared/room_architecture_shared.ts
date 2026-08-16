import type { RoomArchitectureConfigLike, RoomArchitecturePatch, UnknownRecord } from '../../types/index.js';

export const DEFAULT_ROOM_ARCHITECTURE: Readonly<RoomArchitectureConfigLike> = Object.freeze({
  backWall: Object.freeze({
    enabled: false,
    widthCm: 400,
    heightCm: 280,
    wardrobeOffsetLeftCm: 50,
  }),
  column: Object.freeze({
    enabled: false,
    offsetLeftCm: 180,
    widthCm: 30,
    depthCm: 20,
    heightCm: 280,
    bottomOffsetCm: 0,
  }),
  surfacesHidden: false,
});

function asRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function finiteNumber(value: unknown, defaultValue: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundCm(value: number): number {
  return Math.round(value * 10) / 10;
}

export function normalizeRoomArchitecture(value: unknown): RoomArchitectureConfigLike {
  const root = asRecord(value) || {};
  const wallRaw = asRecord(root.backWall) || {};
  const columnRaw = asRecord(root.column) || {};
  const defaults = DEFAULT_ROOM_ARCHITECTURE;

  const wallWidthCm = roundCm(clamp(finiteNumber(wallRaw.widthCm, defaults.backWall.widthCm), 50, 2000));
  const wallHeightCm = roundCm(clamp(finiteNumber(wallRaw.heightCm, defaults.backWall.heightCm), 50, 1000));
  const wardrobeOffsetLeftCm = roundCm(
    clamp(finiteNumber(wallRaw.wardrobeOffsetLeftCm, defaults.backWall.wardrobeOffsetLeftCm), 0, wallWidthCm)
  );

  const columnWidthCm = roundCm(
    clamp(finiteNumber(columnRaw.widthCm, defaults.column.widthCm), 1, wallWidthCm)
  );
  const columnOffsetLeftCm = roundCm(
    clamp(
      finiteNumber(columnRaw.offsetLeftCm, defaults.column.offsetLeftCm),
      0,
      Math.max(0, wallWidthCm - columnWidthCm)
    )
  );
  const bottomOffsetCm = roundCm(
    clamp(finiteNumber(columnRaw.bottomOffsetCm, defaults.column.bottomOffsetCm), 0, wallHeightCm - 1)
  );
  const columnHeightCm = roundCm(
    clamp(
      finiteNumber(columnRaw.heightCm, defaults.column.heightCm),
      1,
      Math.max(1, wallHeightCm - bottomOffsetCm)
    )
  );
  const columnDepthCm = roundCm(clamp(finiteNumber(columnRaw.depthCm, defaults.column.depthCm), 1, 300));

  return {
    backWall: {
      enabled: wallRaw.enabled === true,
      widthCm: wallWidthCm,
      heightCm: wallHeightCm,
      wardrobeOffsetLeftCm,
    },
    column: {
      enabled: columnRaw.enabled === true,
      offsetLeftCm: columnOffsetLeftCm,
      widthCm: columnWidthCm,
      depthCm: columnDepthCm,
      heightCm: columnHeightCm,
      bottomOffsetCm,
    },
    surfacesHidden: root.surfacesHidden === true,
  };
}

export function patchRoomArchitecture(
  current: unknown,
  patch: RoomArchitecturePatch
): RoomArchitectureConfigLike {
  const base = normalizeRoomArchitecture(current);
  return normalizeRoomArchitecture({
    ...base,
    ...patch,
    backWall: { ...base.backWall, ...patch.backWall },
    column: { ...base.column, ...patch.column },
  });
}
