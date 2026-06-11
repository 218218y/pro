// Native BuilderCorePure (ESM)
//
// Public owner for the builder core pure surface. Heavy DOM-free computations
// live in core_pure_compute.ts; this file keeps the canonical install/get seams.

import { assertApp } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';

import {
  builderCorePure,
  computeCarcassOps,
  computeExternalDrawersOpsForModule,
  computeHingedDoorPivotMap,
  computeInteriorCustomOps,
  computeInteriorPresetOps,
  computeInternalDrawersOpsForSlot,
  computeModuleLayout,
  computeSlidingDoorOps,
  computeSlidingDoorSpecs,
  normalizeModulesConfiguration,
} from './core_pure_compute.js';

import type { UnknownRecord } from '../../../types';

function _isObject(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object';
}

function _asObject(x: unknown): UnknownRecord | null {
  return _isObject(x) ? x : null;
}

export {
  computeCarcassOps,
  computeExternalDrawersOpsForModule,
  computeHingedDoorPivotMap,
  computeInteriorCustomOps,
  computeInteriorPresetOps,
  computeInternalDrawersOpsForSlot,
  computeModuleLayout,
  computeSlidingDoorOps,
  computeSlidingDoorSpecs,
  normalizeModulesConfiguration,
  builderCorePure,
};

export function getBuilderCorePure(App: unknown) {
  // Non-throwing getter: prefer installed corePure, else fall back to local pure implementation.
  try {
    const A = assertApp(App, 'native/builder/core_pure.get');
    const B = ensureBuilderService(A, 'native/builder/core_pure.get');
    const cur = _asObject(B.corePure);
    return cur || builderCorePure;
  } catch (_e) {
    return builderCorePure;
  }
}

export function installBuilderCorePure(App: unknown) {
  const A = assertApp(App, 'native/builder/core_pure.install');
  const B = ensureBuilderService(A, 'native/builder/core_pure.install');
  const existing = _asObject(B.corePure);
  const C: UnknownRecord = { ...(existing || {}) };
  B.corePure = C;
  if (C.__esm_v1) return C;

  // Fill missing keys only: installed surfaces remain owner-provided, local pure ops fill gaps.
  const core = _asObject(builderCorePure) || {};
  for (const k of Object.keys(core)) {
    if (typeof C[k] === 'undefined') C[k] = core[k];
  }
  try {
    C.__esm_v1 = true;
  } catch (_) {}
  return C;
}
