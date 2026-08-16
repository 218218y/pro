import type {
  RoomArchitectureConfigLike,
  RoomArchitecturePatch,
  UnknownRecord,
} from '../../../../types/index.js';
import {
  normalizeColorSwatchesOrder,
  normalizeSavedColorsList,
} from '../../../shared/maps_access_collections_shared.js';
import { normalizeDoorMountThicknessCm } from '../../../shared/dimensions/door_mount_thickness_policy.js';
import { cloneComparableProjectConfigValue } from './project_config_snapshot_canonical_shared.js';
import type { ProjectConfigSnapshotCanonicalizationOptions } from './project_config_snapshot_canonical_shared.js';

const DEFAULT_PROJECT_ROOM_ARCHITECTURE: Readonly<RoomArchitectureConfigLike> = Object.freeze({
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

export function patchProjectRoomArchitecture(
  current: unknown,
  patch: RoomArchitecturePatch
): RoomArchitectureConfigLike {
  const base = normalizeProjectRoomArchitecture(current);
  return normalizeProjectRoomArchitecture({
    ...base,
    ...patch,
    backWall: { ...base.backWall, ...patch.backWall },
    column: { ...base.column, ...patch.column },
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
