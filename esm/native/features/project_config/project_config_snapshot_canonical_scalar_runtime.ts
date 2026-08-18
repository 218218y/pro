import type {
  RoomArchitectureConfigLike,
  RoomArchitecturePatch,
  RoomOpeningKind,
  RoomWallId,
  RoomWallOpeningLike,
  UnknownRecord,
} from '../../../../types/index.js';
import {
  normalizeColorSwatchesOrder,
  normalizeSavedColorsList,
} from '../../../shared/maps_access_collections_shared.js';
import { normalizeDoorMountThicknessCm } from '../../../shared/dimensions/door_mount_thickness_policy.js';
import { cloneComparableProjectConfigValue } from './project_config_snapshot_canonical_shared.js';
import type { ProjectConfigSnapshotCanonicalizationOptions } from './project_config_snapshot_canonical_shared.js';

const DEFAULT_PROJECT_ROOM_ARCHITECTURE_WALL_COLOR = '#f2efe6';

const DEFAULT_PROJECT_ROOM_ARCHITECTURE: Readonly<RoomArchitectureConfigLike> = Object.freeze({
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
  wallColor: DEFAULT_PROJECT_ROOM_ARCHITECTURE_WALL_COLOR,
  surfacesHidden: false,
});

function asRoomArchitectureRecord(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function finiteRoomArchitectureNumber(value: unknown, defaultValue: number): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : defaultValue;
}

function clampRoomArchitectureNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundRoomArchitectureCm(value: number): number {
  return Math.round(value * 10) / 10;
}

function normalizeProjectRoomArchitectureWallColor(value: unknown, defaultColor: string): string {
  if (typeof value !== 'string') return defaultColor;
  const normalized = value.trim().toLowerCase();
  return /^#[0-9a-f]{6}$/u.test(normalized) ? normalized : defaultColor;
}

function normalizeProjectRoomSideWall(
  value: unknown,
  defaults: RoomArchitectureConfigLike['leftWall']
): RoomArchitectureConfigLike['leftWall'] {
  const raw = asRoomArchitectureRecord(value) || {};
  return {
    enabled: raw.enabled === true,
    depthCm: roundRoomArchitectureCm(
      clampRoomArchitectureNumber(finiteRoomArchitectureNumber(raw.depthCm, defaults.depthCm), 20, 2000)
    ),
    heightCm: roundRoomArchitectureCm(
      clampRoomArchitectureNumber(finiteRoomArchitectureNumber(raw.heightCm, defaults.heightCm), 50, 1000)
    ),
  };
}

function normalizeProjectRoomOpeningKind(value: unknown): RoomOpeningKind | null {
  return value === 'window' || value === 'door' ? value : null;
}

function normalizeProjectRoomWallId(value: unknown): RoomWallId | null {
  return value === 'back' || value === 'left' || value === 'right' ? value : null;
}

function normalizeProjectRoomOpenings(value: unknown): RoomWallOpeningLike[] {
  if (!Array.isArray(value)) return [];
  const out: RoomWallOpeningLike[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < value.length; i += 1) {
    const raw = asRoomArchitectureRecord(value[i]);
    if (!raw) continue;
    const kind = normalizeProjectRoomOpeningKind(raw.kind);
    const wall = normalizeProjectRoomWallId(raw.wall);
    if (!kind || !wall) continue;
    const rawId = typeof raw.id === 'string' ? raw.id.trim() : '';
    let id = rawId || `room-opening-${i + 1}`;
    if (seen.has(id)) id = `${id}-${i + 1}`;
    seen.add(id);
    out.push({
      id,
      kind,
      wall,
      widthCm: roundRoomArchitectureCm(
        clampRoomArchitectureNumber(
          finiteRoomArchitectureNumber(raw.widthCm, kind === 'door' ? 90 : 120),
          20,
          1000
        )
      ),
      heightCm: roundRoomArchitectureCm(
        clampRoomArchitectureNumber(
          finiteRoomArchitectureNumber(raw.heightCm, kind === 'door' ? 210 : 100),
          20,
          1000
        )
      ),
      offsetAlongCm: roundRoomArchitectureCm(
        clampRoomArchitectureNumber(finiteRoomArchitectureNumber(raw.offsetAlongCm, 0), 0, 2000)
      ),
      bottomOffsetCm:
        kind === 'door'
          ? 0
          : roundRoomArchitectureCm(
              clampRoomArchitectureNumber(finiteRoomArchitectureNumber(raw.bottomOffsetCm, 90), 0, 1000)
            ),
    });
  }
  return out;
}

export function normalizeProjectRoomArchitecture(value: unknown): RoomArchitectureConfigLike {
  const root = asRoomArchitectureRecord(value) || {};
  const wallRaw = asRoomArchitectureRecord(root.backWall) || {};
  const columnRaw = asRoomArchitectureRecord(root.column) || {};
  const defaults = DEFAULT_PROJECT_ROOM_ARCHITECTURE;

  const wallWidthCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(wallRaw.widthCm, defaults.backWall.widthCm),
      50,
      2000
    )
  );
  const wallHeightCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(wallRaw.heightCm, defaults.backWall.heightCm),
      50,
      1000
    )
  );
  const wardrobeOffsetLeftCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(wallRaw.wardrobeOffsetLeftCm, defaults.backWall.wardrobeOffsetLeftCm),
      0,
      wallWidthCm
    )
  );

  const columnWidthCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(columnRaw.widthCm, defaults.column.widthCm),
      1,
      wallWidthCm
    )
  );
  const columnOffsetLeftCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(columnRaw.offsetLeftCm, defaults.column.offsetLeftCm),
      0,
      Math.max(0, wallWidthCm - columnWidthCm)
    )
  );
  const bottomOffsetCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(columnRaw.bottomOffsetCm, defaults.column.bottomOffsetCm),
      0,
      wallHeightCm - 1
    )
  );
  const columnHeightCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(columnRaw.heightCm, defaults.column.heightCm),
      1,
      Math.max(1, wallHeightCm - bottomOffsetCm)
    )
  );
  const columnDepthCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(
      finiteRoomArchitectureNumber(columnRaw.depthCm, defaults.column.depthCm),
      1,
      300
    )
  );

  return {
    backWall: {
      enabled: wallRaw.enabled === true,
      widthCm: wallWidthCm,
      heightCm: wallHeightCm,
      wardrobeOffsetLeftCm,
    },
    leftWall: normalizeProjectRoomSideWall(root.leftWall, defaults.leftWall),
    rightWall: normalizeProjectRoomSideWall(root.rightWall, defaults.rightWall),
    column: {
      enabled: columnRaw.enabled === true,
      offsetLeftCm: columnOffsetLeftCm,
      widthCm: columnWidthCm,
      depthCm: columnDepthCm,
      heightCm: columnHeightCm,
      bottomOffsetCm,
    },
    openings: normalizeProjectRoomOpenings(root.openings),
    wallColor: normalizeProjectRoomArchitectureWallColor(root.wallColor, defaults.wallColor),
    surfacesHidden: root.surfacesHidden === true,
  };
}

export function constrainProjectRoomArchitectureToWardrobeWidth(
  config: RoomArchitectureConfigLike,
  wardrobeWidthCm: number
): RoomArchitectureConfigLike {
  const resolvedWardrobeWidthCm = roundRoomArchitectureCm(
    Math.max(0, finiteRoomArchitectureNumber(wardrobeWidthCm, 0))
  );
  if (!(resolvedWardrobeWidthCm > 0)) return config;

  const wallWidthCm = roundRoomArchitectureCm(Math.max(config.backWall.widthCm, resolvedWardrobeWidthCm));
  const maxWardrobeOffsetLeftCm = Math.max(0, wallWidthCm - resolvedWardrobeWidthCm);
  const wardrobeOffsetLeftCm = roundRoomArchitectureCm(
    clampRoomArchitectureNumber(config.backWall.wardrobeOffsetLeftCm, 0, maxWardrobeOffsetLeftCm)
  );

  if (
    wallWidthCm === config.backWall.widthCm &&
    wardrobeOffsetLeftCm === config.backWall.wardrobeOffsetLeftCm
  ) {
    return config;
  }

  return {
    ...config,
    backWall: {
      ...config.backWall,
      widthCm: wallWidthCm,
      wardrobeOffsetLeftCm,
    },
  };
}

export function patchProjectRoomArchitecture(
  current: unknown,
  patch: RoomArchitecturePatch
): RoomArchitectureConfigLike {
  const base = normalizeProjectRoomArchitecture(current);
  return normalizeProjectRoomArchitecture({
    ...base,
    ...patch,
    backWall: { ...base.backWall, ...patch.backWall },
    leftWall: { ...base.leftWall, ...patch.leftWall },
    rightWall: { ...base.rightWall, ...patch.rightWall },
    column: { ...base.column, ...patch.column },
    openings: patch.openings ?? base.openings,
  });
}

function normalizeSavedColorsSnapshot(value: unknown): Array<Record<string, unknown> | string> {
  const out: Array<Record<string, unknown> | string> = [];
  for (const entry of normalizeSavedColorsList(value)) {
    out.push(entry && typeof entry === 'object' && !Array.isArray(entry) ? { ...entry } : entry);
  }
  return out;
}

function normalizeSavedColorObjectsSnapshot(value: unknown): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const entry of normalizeSavedColorsList(value)) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) out.push({ ...entry });
  }
  return out;
}

function normalizeColorSwatchesOrderSnapshot(value: unknown): string[] {
  return normalizeColorSwatchesOrder(value);
}

function normalizeGrooveLinesCount(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return null;
  return Math.max(1, Math.floor(value));
}

function normalizeBooleanScalar(value: unknown): boolean {
  return value === true;
}

function normalizeWardrobeType(value: unknown): 'hinged' | 'sliding' | '' {
  return value === 'hinged' || value === 'sliding' ? value : '';
}

function normalizeBoardMaterial(value: unknown): 'sandwich' | 'melamine' | '' {
  return value === 'sandwich' || value === 'melamine' ? value : '';
}

function normalizeDoorMountMode(value: unknown): 'overlay' | 'inset' | '' {
  return value === 'overlay' || value === 'inset' ? value : '';
}

function normalizeDrawerRunnerType(value: unknown): 'roller' | 'blum' | '' {
  return value === 'roller' || value === 'blum' ? value : '';
}

function normalizeGlobalHandleType(value: unknown): 'standard' | 'edge' | 'none' | '' {
  return value === 'standard' || value === 'edge' || value === 'none' ? value : '';
}

function normalizeCustomUploadedDataUrl(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

type ProjectConfigScalarNormalizer = (
  value: unknown,
  options?: Pick<ProjectConfigSnapshotCanonicalizationOptions, 'savedColorsMode'>
) => unknown;

const PROJECT_CONFIG_SCALAR_NORMALIZERS: Record<string, ProjectConfigScalarNormalizer> = {
  savedColors: (value, options) =>
    options?.savedColorsMode === 'mixed'
      ? normalizeSavedColorsSnapshot(value)
      : normalizeSavedColorObjectsSnapshot(value),
  colorSwatchesOrder: normalizeColorSwatchesOrderSnapshot,
  savedNotes: value => cloneComparableProjectConfigValue(Array.isArray(value) ? value : []),
  preChestState: value => cloneComparableProjectConfigValue(value !== undefined ? value : null),
  isLibraryMode: normalizeBooleanScalar,
  isMultiColorMode: normalizeBooleanScalar,
  showDimensions: normalizeBooleanScalar,
  isManualWidth: normalizeBooleanScalar,
  wardrobeType: normalizeWardrobeType,
  boardMaterial: normalizeBoardMaterial,
  doorMountMode: normalizeDoorMountMode,
  drawerRunnerType: normalizeDrawerRunnerType,
  overlayFrameThicknessCm: normalizeDoorMountThicknessCm,
  overlayShelfThicknessCm: normalizeDoorMountThicknessCm,
  insetFrameThicknessCm: normalizeDoorMountThicknessCm,
  insetShelfThicknessCm: normalizeDoorMountThicknessCm,
  globalHandleType: normalizeGlobalHandleType,
  customUploadedDataURL: normalizeCustomUploadedDataUrl,
  grooveLinesCount: normalizeGrooveLinesCount,
  roomArchitecture: normalizeProjectRoomArchitecture,
};

export function normalizeProjectConfigScalarEntry(
  key: string,
  value: unknown,
  options?: Pick<ProjectConfigSnapshotCanonicalizationOptions, 'savedColorsMode'>
): unknown {
  const normalize = PROJECT_CONFIG_SCALAR_NORMALIZERS[key];
  return normalize ? normalize(value, options) : cloneComparableProjectConfigValue(value);
}
