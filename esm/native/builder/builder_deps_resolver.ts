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
  BuilderAddHangingClothesFn,
  BuilderAddFoldedClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderOutlineFn,
  BuilderCallable,
} from '../../../types';

/** @typedef {import('../../../types').AppContainer} AppContainer */
/** @typedef {import('../../../types').BuilderDepsRootLike} BuilderDepsRootLike */
/** @typedef {import('../../../types').BuilderDepsResolvedLike} BuilderDepsResolvedLike */

function _isRecord(x: unknown): x is UnknownRecord {
  return !!x && typeof x === 'object' && !Array.isArray(x);
}

function _obj(x: unknown): UnknownRecord | null {
  return _isRecord(x) ? x : null;
}

function readErrorMessage(e: unknown): string | null {
  if (e instanceof Error) return e.message;
  const rec = _obj(e);
  return rec && typeof rec.message === 'string' ? rec.message : null;
}

function bindCallable(owner: UnknownRecord, key: string): BuilderCallable | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (...args) => Reflect.apply(value, owner, args);
}

function bindOutlineFn(owner: UnknownRecord, key: string): BuilderOutlineFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return mesh => Reflect.apply(value, owner, [mesh]);
}

function bindCreateDoorVisualFn(owner: UnknownRecord, key: string): BuilderCreateDoorVisualFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (
    w,
    h,
    thickness,
    mat,
    style,
    hasGrooves,
    isMirror,
    curtainType,
    baseMaterial,
    frontFaceSign,
    forceCurtainFix,
    mirrorLayout,
    groovePartId
  ) =>
    Reflect.apply(value, owner, [
      w,
      h,
      thickness,
      mat,
      style,
      hasGrooves,
      isMirror,
      curtainType,
      baseMaterial,
      frontFaceSign,
      forceCurtainFix,
      mirrorLayout,
      groovePartId,
    ]);
}

function bindCreateInternalDrawerBoxFn(
  owner: UnknownRecord,
  key: string
): BuilderCreateInternalDrawerBoxFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle) =>
    Reflect.apply(value, owner, [w, h, d, mat, drawerMat, outlineFunc, hasDivider, addHandle]);
}

function bindCalculateModuleStructureFn(
  owner: UnknownRecord,
  key: string
): BuilderCalculateModuleStructureFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (doorsCount, singlePos, structureSelectValue, wardrobeType, app) =>
    Reflect.apply(value, owner, [doorsCount, singlePos, structureSelectValue, wardrobeType, app]);
}

function bindBuildChestOnlyFn(owner: UnknownRecord, key: string): BuilderBuildChestOnlyFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (...args) => Reflect.apply(value, owner, args);
}

function bindBuildCornerWingFn(owner: UnknownRecord, key: string): BuilderBuildCornerWingFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (mainW, mainH, mainD, woodThick, startY, materials, metaOrCtx, ctxMaybe) =>
    Reflect.apply(value, owner, [mainW, mainH, mainD, woodThick, startY, materials, metaOrCtx, ctxMaybe]);
}

function bindRebuildDrawerMetaFn(owner: UnknownRecord, key: string): BuilderRebuildDrawerMetaFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return () => Reflect.apply(value, owner, []);
}

function bindAddHangingClothesFn(owner: UnknownRecord, key: string): BuilderAddHangingClothesFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (
    rodX,
    rodY,
    rodZ,
    width,
    parentGroup,
    maxHeight,
    isRestrictedDepth,
    showContentsOverride,
    doorStyleOverride
  ) =>
    Reflect.apply(value, owner, [
      rodX,
      rodY,
      rodZ,
      width,
      parentGroup,
      maxHeight,
      isRestrictedDepth,
      showContentsOverride,
      doorStyleOverride,
    ]);
}

function bindAddFoldedClothesFn(owner: UnknownRecord, key: string): BuilderAddFoldedClothesFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth) =>
    Reflect.apply(value, owner, [shelfX, shelfY, shelfZ, width, parentGroup, maxHeight, maxDepth]);
}

function bindAddRealisticHangerFn(owner: UnknownRecord, key: string): BuilderAddRealisticHangerFn | null {
  const value = owner[key];
  if (typeof value !== 'function') return null;
  return (rodX, rodY, rodZ, parentGroup, moduleWidth, enabledOverride) =>
    Reflect.apply(value, owner, [rodX, rodY, rodZ, parentGroup, moduleWidth, enabledOverride]);
}

/**
 * Resolve and validate builder dependencies from the canonical builder deps surface.
 *
 * NOTE: This function is fail-fast (throws) for missing critical deps.
 *
 * @param {{ App: AppContainer, builderDeps: BuilderDepsRootLike, label?:string }} args
 * @returns {BuilderDepsResolvedLike}
 */
export function resolveBuilderDepsOrThrow(args: {
  App: AppContainer;
  builderDeps: BuilderDepsRootLike;
  label?: string;
}): BuilderDepsResolvedLike {
  const App = args && args.App;
  const B = args && args.builderDeps;
  const label = (args && args.label) || 'native/builder/deps';

  if (!App) throw new Error('[WardrobePro] Builder requires App');
  if (!B || typeof B !== 'object') throw new Error('[WardrobePro] builder deps missing: deps.builder');

  const util = _obj(B.util) || {};
  const materials = _obj(B.materials) || {};
  const modules = _obj(B.modules) || {};
  const contents = _obj(B.contents) || {};
  const notes = _obj(B.notes) || {};
  const render = _obj(B.render) || {};

  const cleanGroup = bindCallable(util, 'cleanGroup');
  const getMaterial = bindCallable(materials, 'getMaterial');
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
