import type { UnknownRecord } from '../../../../types/index.js';

import { asProjectConfigRecord } from './project_config_lists_shared.js';
import {
  canonicalizeProjectConfigStructuralPatch,
  canonicalizeProjectConfigStructuralSnapshot,
  omitStructuralProjectConfigKeys,
  pickStructuralProjectConfigLists,
  type CanonicalProjectConfigStructuralPatch,
  type CanonicalProjectConfigStructuralSnapshot,
} from './project_config_lists_runtime.js';
import {
  STRUCTURAL_PROJECT_CONFIG_KEYS,
  isKnownProjectConfigMapKey,
} from './project_config_snapshot_canonical_shared.js';
import type { ProjectConfigSnapshotCanonicalizationOptions } from './project_config_snapshot_canonical_shared.js';
import { normalizeKnownProjectConfigMap } from './project_config_snapshot_canonical_map_runtime.js';
import { normalizeProjectConfigScalarEntry } from './project_config_snapshot_canonical_scalar_runtime.js';

function canonicalizeComparableProjectConfigEntries(
  src: UnknownRecord,
  options: ProjectConfigSnapshotCanonicalizationOptions | undefined
): UnknownRecord {
  const out: UnknownRecord = {};

  for (const [key, value] of Object.entries(src)) {
    if (STRUCTURAL_PROJECT_CONFIG_KEYS.has(key)) continue;
    out[key] = isKnownProjectConfigMapKey(key)
      ? normalizeKnownProjectConfigMap(key, value)
      : normalizeProjectConfigScalarEntry(key, value, options);
  }

  return out;
}

function pickPresentStructuralProjectConfigPatch(
  source: CanonicalProjectConfigStructuralPatch<UnknownRecord>
): Partial<CanonicalProjectConfigStructuralSnapshot<UnknownRecord>> {
  const out: Partial<CanonicalProjectConfigStructuralSnapshot<UnknownRecord>> = {};
  if (Object.prototype.hasOwnProperty.call(source, 'modulesConfiguration')) {
    out.modulesConfiguration = source.modulesConfiguration;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'stackSplitLowerModulesConfiguration')) {
    out.stackSplitLowerModulesConfiguration = source.stackSplitLowerModulesConfiguration;
  }
  if (Object.prototype.hasOwnProperty.call(source, 'cornerConfiguration')) {
    out.cornerConfiguration = source.cornerConfiguration;
  }
  return out;
}

export { normalizeProjectConfigScalarEntry } from './project_config_snapshot_canonical_scalar_runtime.js';

export type CanonicalComparableProjectConfigSnapshot = UnknownRecord &
  CanonicalProjectConfigStructuralSnapshot<UnknownRecord>;

export type CanonicalComparableProjectConfigPatch = UnknownRecord &
  CanonicalProjectConfigStructuralPatch<UnknownRecord>;

export function canonicalizeComparableProjectConfigSnapshot(
  source: UnknownRecord | null | undefined,
  options?: ProjectConfigSnapshotCanonicalizationOptions
): CanonicalComparableProjectConfigSnapshot {
  const src = asProjectConfigRecord(source);
  const structural = canonicalizeProjectConfigStructuralSnapshot(src, options);
  return {
    ...canonicalizeComparableProjectConfigEntries(omitStructuralProjectConfigKeys(src), options),
    ...pickStructuralProjectConfigLists(structural),
  };
}

export function canonicalizeComparableProjectConfigPatch(
  patchLike: UnknownRecord | null | undefined,
  options?: ProjectConfigSnapshotCanonicalizationOptions
): CanonicalComparableProjectConfigPatch {
  const src = asProjectConfigRecord(patchLike);
  if (!Object.keys(src).length) return {};
  const structural = canonicalizeProjectConfigStructuralPatch(src, options);
  return {
    ...canonicalizeComparableProjectConfigEntries(omitStructuralProjectConfigKeys(src), options),
    ...pickPresentStructuralProjectConfigPatch(structural),
  };
}
