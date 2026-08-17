import type {
  RoomArchitectureConfigLike,
  RoomArchitecturePatch,
  RoomOpeningKind,
  RoomWallId,
  RoomWallOpeningLike,
  UnknownRecord,
} from '../../types/index.js';

export const DEFAULT_ROOM_ARCHITECTURE_WALL_COLOR = '#f2efe6';

export const DEFAULT_ROOM_ARCHITECTURE: Readonly<RoomArchitectureConfigLike> = Object.freeze({
  backWall: Object.freeze({
    enabled: false,
    widthCm: 400,
    heightCm: 280,
    wardrobeOffsetLeftCm: 50,
  }),
  leftWall: Object.freeze({
    enabled: false,
    depthCm: 300,
    heightCm: 280,
  }),
  rightWall: Object.freeze({
    enabled: false,
    depthCm: 300,
    heightCm: 280,
  }),
  column: Object.freeze({
    enabled: false,
    offsetLeftCm: 180,
    widthCm: 30,
    depthCm: 20,
    heightCm: 280,
    bottomOffsetCm: 0,
  }),
  openings: Object.freeze([]) as unknown as RoomWallOpeningLike[],
  wallColor: DEFAULT_ROOM_ARCHITECTURE_WALL_COLOR,
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

function normalizeWallColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(normalized) ? normalized : fallback;
}

function normalizeSideWall(
  value: unknown,
  defaults: RoomArchitectureConfigLike['leftWall']
): RoomArchitectureConfigLike['leftWall'] {
  const raw = asRecord(value) || {};
  return {
    enabled: raw.enabled === true,
    depthCm: roundCm(clamp(finiteNumber(raw.depthCm, defaults.depthCm), 20, 2000)),
    heightCm: roundCm(clamp(finiteNumber(raw.heightCm, defaults.heightCm), 50, 1000)),
  };
}

function normalizeRoomOpeningKind(value: unknown): RoomOpeningKind | null {
  return value === 'window' || value === 'door' ? value : null;
}

function normalizeRoomWallId(value: unknown): RoomWallId | null {
  return value === 'back' || value === 'left' || value === 'right' ? value : null;
}

function normalizeRoomOpenings(value: unknown): RoomWallOpeningLike[] {
  if (!Array.isArray(value)) return [];
  const out: RoomWallOpeningLike[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i += 1) {
    const raw = asRecord(value[i]);
    if (!raw) continue;
    const kind = normalizeRoomOpeningKind(raw.kind);
    const wall = normalizeRoomWallId(raw.wall);
    if (!kind || !wall) continue;
    const fallbackId = `room-opening-${i + 1}`;
    const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
    let id = rawId || fallbackId;
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    out.push({
      id,
      kind,
      wall,
      widthCm: roundCm(clamp(finiteNumber(raw.widthCm, kind === 'door' ? 90 : 120), 20, 1000)),
      heightCm: roundCm(clamp(finiteNumber(raw.heightCm, kind === 'door' ? 210 : 100), 20, 1000)),
      offsetAlongCm: roundCm(clamp(finiteNumber(raw.offsetAlongCm, 0), 0, 2000)),
      bottomOffsetCm: kind === 'door' ? 0 : roundCm(clamp(finiteNumber(raw.bottomOffsetCm, 90), 0, 1000)),
    });
  }
  return out;
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
    leftWall: normalizeSideWall(root.leftWall, defaults.leftWall),
    rightWall: normalizeSideWall(root.rightWall, defaults.rightWall),
    column: {
      enabled: columnRaw.enabled === true,
      offsetLeftCm: columnOffsetLeftCm,
      widthCm: columnWidthCm,
      depthCm: columnDepthCm,
      heightCm: columnHeightCm,
      bottomOffsetCm,
    },
    openings: normalizeRoomOpenings(root.openings),
    wallColor: normalizeWallColor(root.wallColor, defaults.wallColor),
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
    leftWall: { ...base.leftWall, ...patch.leftWall },
    rightWall: { ...base.rightWall, ...patch.rightWall },
    column: { ...base.column, ...patch.column },
    openings: patch.openings ?? base.openings,
  });
}
