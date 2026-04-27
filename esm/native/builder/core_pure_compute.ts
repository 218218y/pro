// Builder core pure computations.
//
// Extracted from core_pure.ts so the public owner can focus on service binding
// while this module owns the canonical DOM-free computation surface.

import { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';
export { computeInteriorPresetOps } from '../features/interior_layout_presets/api.js';

import { normalizeModulesConfiguration, computeModuleLayout } from './core_layout_compute.js';
import {
  computeHingedDoorPivotMap,
  computeSlidingDoorSpecs,
  computeSlidingDoorOps,
} from './core_doors_compute.js';
import {
  computeExternalDrawersOpsForModule,
  computeInteriorCustomOps,
  computeInternalDrawersOpsForSlot,
} from './core_storage_compute.js';
import { computeCarcassOps } from './core_carcass_compute.js';

export { normalizeModulesConfiguration, computeModuleLayout } from './core_layout_compute.js';
export {
  computeHingedDoorPivotMap,
  computeSlidingDoorSpecs,
  computeSlidingDoorOps,
} from './core_doors_compute.js';
export {
  computeExternalDrawersOpsForModule,
  computeInteriorCustomOps,
  computeInternalDrawersOpsForSlot,
} from './core_storage_compute.js';
export { computeCarcassOps } from './core_carcass_compute.js';

export const builderCorePure = {
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
