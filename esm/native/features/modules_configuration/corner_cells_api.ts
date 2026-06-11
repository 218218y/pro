// Corner-related modulesConfiguration helpers (pure / runtime-safe).
// Public owner stays thin while focused seams own contracts, patch/list policy, and stack snapshots.

export type {
  CornerCellConfigLike,
  CornerConfigurationLike,
  CornerCustomDataLike,
  NormalizedCornerConfigurationLike,
  NormalizedCornerCustomDataLike,
  NormalizedLowerCornerConfigurationLike,
  UnknownRecord,
} from './corner_cells_contracts.js';

export {
  resolveTopCornerCellDefaultLayout,
  resolveTopCornerCellDefaultLayoutFromUi,
} from './corner_cells_ui_defaults.js';

export type { NormalizeCornerCellForPatchOptions } from './corner_cells_patch.js';
export {
  createDefaultTopCornerCellNormalizer,
  normalizeCornerCellForPatch,
  patchCornerCellListAtForPatch,
  patchLowerCornerCellListAtForPatch,
  patchNormalizedCornerCellListAtForPatch,
  sanitizeCornerCellListForPatch,
  sanitizeLowerCornerCellListForPatch,
} from './corner_cells_patch.js';

export type { CornerStackKey } from './corner_cells_snapshot.js';
export {
  cloneCornerConfigurationForLowerSnapshot,
  cloneCornerConfigurationListsSnapshot,
  cloneCornerConfigurationSnapshot,
  createDefaultLowerCornerConfiguration,
  ensureCornerConfigurationCellForStack,
  ensureCornerConfigurationForStack,
  normalizeLowerCornerConfigurationSnapshot,
  patchCornerConfigurationCellForStack,
  patchCornerConfigurationForStack,
  readCornerConfigurationCellForStack,
  readCornerConfigurationCellListForStack,
  readCornerConfigurationFromConfigSnapshot,
  readCornerConfigurationSnapshotForStack,
  sanitizeCornerConfigurationForPatch,
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationSnapshot,
  sanitizeLowerCornerConfigurationForPatch,
} from './corner_cells_snapshot.js';
