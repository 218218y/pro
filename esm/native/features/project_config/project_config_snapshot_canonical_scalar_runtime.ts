import {
  normalizeColorSwatchesOrder,
  normalizeSavedColorsList,
} from '../../../shared/maps_access_collections_shared.js';
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
  const grooveLinesCount = Number(value);
  return value == null || value === ''
    ? null
    : Number.isFinite(grooveLinesCount)
      ? Math.max(1, Math.floor(grooveLinesCount))
      : null;
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
  isLibraryMode: value => !!value,
  isMultiColorMode: value => !!value,
  showDimensions: value => !!value,
  isManualWidth: value => !!value,
  wardrobeType: value => (value == null ? '' : String(value)),
  boardMaterial: value => (value == null ? '' : String(value)),
  globalHandleType: value => (value == null ? '' : String(value)),
  customUploadedDataURL: value => (value == null ? null : String(value)),
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
