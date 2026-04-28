// Builder deps resolver (Pure ESM)
//
// Centralizes extraction + minimal validation of App.deps.builder surfaces
// so core.js can stay focused on orchestration.

import { assertTHREE } from '../runtime/api.js';
import { getPlatformPruneCachesSafe } from '../runtime/platform_access.js';

import type {
  UnknownRecord,
  AppContainer,
  BuilderDepsResolvedLike,
  BuilderDepsRootLike,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderBuildChestOnlyFn,
  BuilderBuildCornerWingFn,
  BuilderCalculateModuleStructureFn,
  BuilderRebuildDrawerMetaFn,
  BuilderGetMaterialFn,
  BuilderAddHangingClothesFn,
  BuilderAddFoldedClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderOutlineFn,
  BuilderCallable,
  BuilderArgs,
} from '../../../types';

export type ResolveBuilderDepsRequest = {
  App: AppContainer;
  builderDeps: BuilderDepsRootLike;
  label?: string;
};

/**
 * Resolve and validate builder dependencies from the canonical builder deps surface.
 *
 * This is the single fail-fast entry point for live builder orchestration deps.
 * Missing critical deps throw here instead of letting downstream pipelines limp
 * forward with null/no-op behavior.
 */
export function resolveBuilderDepsOrThrow(
  request: ResolveBuilderDepsRequest | null | undefined
): BuilderDepsResolvedLike {
  const App = request?.App;
  const B = request?.builderDeps;
  const label = request?.label || 'native/builder/deps';

  if (!App) throw new Error('[WardrobePro] Builder requires App');
  if (!B || typeof B !== 'object') throw new Error('[WardrobePro] builder deps missing: deps.builder');

  const util = readBuilderDepsSection(B.util) || {};
  const materials = readBuilderDepsSection(B.materials) || {};
  const modules = readBuilderDepsSection(B.modules) || {};
  const contents = readBuilderDepsSection(B.contents) || {};
  const notes = readBuilderDepsSection(B.notes) || {};
  const render = readBuilderDepsSection(B.render) || {};

  const cleanGroup = bindCallable(util, 'cleanGroup');
  const getMaterial = bindGetMaterialFn(materials, 'getMaterial');
  if (!cleanGroup) throw new Error('Builder tools missing: util.cleanGroup');
  if (!getMaterial) throw new Error('Builder tools missing: materials.getMaterial');

  const createDoorVisual = bindCreateDoorVisualFn(modules, 'createDoorVisual');
  if (!createDoorVisual) throw new Error('Builder tools missing: modules.createDoorVisual');

  // Pure ESM: THREE is injected via App.deps.THREE (not via builder deps).
  const THREE = assertTHREE(App, label);

  // Ensure render group exists (integration guard)
  // Canonical: builderDeps.render.ensureWardrobeGroup (no App.builder.* reach-through)
  const ensureGroup = bindCallable(render, 'ensureWardrobeGroup');
  if (!ensureGroup) {
    throw new Error('Builder render helper missing: builderDeps.render.ensureWardrobeGroup');
  }
  try {
    ensureGroup(THREE);
  } catch (e: unknown) {
    const msg = readErrorMessage(e) || String(e);
    throw new Error('[WardrobePro] render.ensureWardrobeGroup failed: ' + msg);
  }

  const pruneCachesSafe = getPlatformPruneCachesSafe(App) || bindCallable(util, 'pruneCachesSafe');

  return {
    THREE,
    cleanGroup,
    pruneCachesSafe,
    triggerRender: bindCallable(render, 'triggerRender'),
    showToast: bindCallable(render, 'showToast'),
    getMaterial,
    addOutlines: bindOutlineFn(materials, 'addOutlines'),
    calculateModuleStructure: bindCalculateModuleStructureFn(modules, 'calculateModuleStructure'),
    createDoorVisual,
    createInternalDrawerBox: bindCreateInternalDrawerBoxFn(modules, 'createInternalDrawerBox'),
    buildChestOnly: bindBuildChestOnlyFn(modules, 'buildChestOnly'),
    buildCornerWing: bindBuildCornerWingFn(modules, 'buildCornerWing'),
    rebuildDrawerMeta: bindRebuildDrawerMetaFn(modules, '__rebuildDrawerMeta'),
    addDimensionLine: bindCallable(contents, 'addDimensionLine'),
    addHangingClothes: bindAddHangingClothesFn(contents, 'addHangingClothes'),
    addFoldedClothes: bindAddFoldedClothesFn(contents, 'addFoldedClothes'),
    addRealisticHanger: bindAddRealisticHangerFn(contents, 'addRealisticHanger'),
    getNotesForSave: bindCallable(notes, 'getNotesForSave'),
    restoreNotesFromSave: bindCallable(notes, 'restoreNotesFromSave'),
  };
}

function readBuilderDepsSection(value: unknown): UnknownRecord | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as UnknownRecord) : null;
}

function bindKnownFunction<Fn>(owner: UnknownRecord, key: string): Fn | null {
  const fn = owner[key];
  if (typeof fn !== 'function') return null;
  const bound = (...args: BuilderArgs): unknown => Reflect.apply(fn, owner, args);
  return bound as Fn;
}

function bindCallable(owner: UnknownRecord, key: string): BuilderCallable | null {
  return bindKnownFunction<BuilderCallable>(owner, key);
}

function bindGetMaterialFn(owner: UnknownRecord, key: string): BuilderGetMaterialFn | null {
  return bindKnownFunction<BuilderGetMaterialFn>(owner, key);
}

function bindOutlineFn(owner: UnknownRecord, key: string): BuilderOutlineFn | null {
  return bindKnownFunction<BuilderOutlineFn>(owner, key);
}

function bindCalculateModuleStructureFn(
  owner: UnknownRecord,
  key: string
): BuilderCalculateModuleStructureFn | null {
  return bindKnownFunction<BuilderCalculateModuleStructureFn>(owner, key);
}

function bindCreateDoorVisualFn(owner: UnknownRecord, key: string): BuilderCreateDoorVisualFn | null {
  return bindKnownFunction<BuilderCreateDoorVisualFn>(owner, key);
}

function bindCreateInternalDrawerBoxFn(
  owner: UnknownRecord,
  key: string
): BuilderCreateInternalDrawerBoxFn | null {
  return bindKnownFunction<BuilderCreateInternalDrawerBoxFn>(owner, key);
}

function bindBuildChestOnlyFn(owner: UnknownRecord, key: string): BuilderBuildChestOnlyFn | null {
  return bindKnownFunction<BuilderBuildChestOnlyFn>(owner, key);
}

function bindBuildCornerWingFn(owner: UnknownRecord, key: string): BuilderBuildCornerWingFn | null {
  return bindKnownFunction<BuilderBuildCornerWingFn>(owner, key);
}

function bindRebuildDrawerMetaFn(owner: UnknownRecord, key: string): BuilderRebuildDrawerMetaFn | null {
  return bindKnownFunction<BuilderRebuildDrawerMetaFn>(owner, key);
}

function bindAddHangingClothesFn(owner: UnknownRecord, key: string): BuilderAddHangingClothesFn | null {
  return bindKnownFunction<BuilderAddHangingClothesFn>(owner, key);
}

function bindAddFoldedClothesFn(owner: UnknownRecord, key: string): BuilderAddFoldedClothesFn | null {
  return bindKnownFunction<BuilderAddFoldedClothesFn>(owner, key);
}

function bindAddRealisticHangerFn(owner: UnknownRecord, key: string): BuilderAddRealisticHangerFn | null {
  return bindKnownFunction<BuilderAddRealisticHangerFn>(owner, key);
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : '';
  }
  return '';
}
