// Pure ESM API surface for Builder "core_pure" computations.
//
// IMPORTANT:
// This module must be safe to import at any time.
// It MUST NOT depend on "install()" having been called elsewhere.
//
// Therefore we export the real implementations directly from the native ESM module,
// instead of re-exporting a lazily-initialized wrapper (which can be undefined until installed).

import {
  builderCorePure as builderCorePureObject,
  normalizeModulesConfiguration,
  computeModuleLayout,
  computeHingedDoorPivotMap,
  computeSlidingDoorSpecs,
  computeSlidingDoorOps,
  computeExternalDrawersOpsForModule,
  computeInteriorCustomOps,
  computeInternalDrawersOpsForSlot,
  computeCarcassOps,
} from './core_pure.js';
import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';

// Named export of the object form for callers that prefer a namespace object.
export const corePure = builderCorePureObject;

// Named exports (preferred): pure computation helpers.
export {
  normalizeModulesConfiguration,
  computeModuleLayout,
  computeHingedDoorPivotMap,
  computeSlidingDoorSpecs,
  computeSlidingDoorOps,
  computeExternalDrawersOpsForModule,
  computeInteriorPresetOps,
  computeInteriorCustomOps,
  computeInternalDrawersOpsForSlot,
  computeCarcassOps,
};
