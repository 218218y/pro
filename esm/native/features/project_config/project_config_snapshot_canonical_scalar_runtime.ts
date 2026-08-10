import {
  normalizeColorSwatchesOrder,
  normalizeSavedColorsList,
} from '../../../shared/maps_access_collections_shared.js';
import { normalizeDoorMountThicknessCm } from '../../../shared/dimensions/door_mount_thickness_policy.js';
import { cloneComparableProjectConfigValue } from './project_config_snapshot_canonical_shared.js';
import type { ProjectConfigSnapshotCanonicalizationOptions } from './project_config_snapshot_canonical_shared.js';

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
};

export function normalizeProjectConfigScalarEntry(
  key: string,
  value: unknown,
  options?: Pick<ProjectConfigSnapshotCanonicalizationOptions, 'savedColorsMode'>
): unknown {
  const normalize = PROJECT_CONFIG_SCALAR_NORMALIZERS[key];
  return normalize ? normalize(value, options) : cloneComparableProjectConfigValue(value);
}
