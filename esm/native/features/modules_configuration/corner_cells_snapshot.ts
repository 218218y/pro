// Corner snapshot public seam.
// Focused owners now keep normalization/defaults and stack-aware mutation policy separate.

export type { CornerStackKey } from './corner_cells_snapshot_stack.js';

export {
  cloneCornerConfigurationForLowerSnapshot,
  ensureCornerConfigurationCellForStack,
  ensureCornerConfigurationForStack,
  patchCornerConfigurationCellForStack,
  patchCornerConfigurationForStack,
  readCornerConfigurationCellForStack,
  readCornerConfigurationCellListForStack,
  readCornerConfigurationSnapshotForStack,
} from './corner_cells_snapshot_stack.js';

export {
  cloneCornerConfigurationListsSnapshot,
  cloneCornerConfigurationSnapshot,
  normalizeLowerCornerConfigurationSnapshot,
  readCornerConfigurationFromConfigSnapshot,
  sanitizeCornerConfigurationForPatch,
  sanitizeCornerConfigurationListsOnly,
  sanitizeCornerConfigurationSnapshot,
  sanitizeLowerCornerConfigurationForPatch,
} from './corner_cells_snapshot_normalize.js';

export { createDefaultLowerCornerConfiguration } from './corner_cells_snapshot_shared.js';
