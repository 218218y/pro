import { assertTHREE } from '../runtime/api.js';
import {
  getBuilderAddOutlines,
  requireBuilderAddFoldedClothes,
  requireBuilderAddHangingClothes,
  requireBuilderAddRealisticHanger,
  requireBuilderCreateDoorVisual,
  requireBuilderCreateInternalDrawerBox,
  requireBuilderGetMaterial,
  requireBuilderRenderOps,
} from '../runtime/builder_service_access.js';

import type {
  AppContainer,
  BuilderBuildCornerWingCtxLike,
  BuilderBuildCornerWingFn,
  BuilderBuildCornerWingMaterialsLike,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
} from '../../../types';
import type { Object3DLike } from '../../../types/three_like';

type ValueRecord = Record<string, unknown>;

type CornerBuildCtx = BuilderBuildCornerWingCtxLike & ValueRecord;
type MaterialsLike = BuilderBuildCornerWingMaterialsLike;

type CornerWingInstallModules = ValueRecord & {
  buildCornerWing?: BuilderBuildCornerWingFn;
  __esm_corner_wing_v1?: boolean;
};

function isObj(v: unknown): v is ValueRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

export function asObj(v: unknown): ValueRecord | null {
  return isObj(v) ? v : null;
}

export function hasAppCtx(v: unknown): v is CornerBuildCtx {
  return isObj(v) && Object.prototype.hasOwnProperty.call(v, 'App');
}

function isObject3DLike(value: unknown): value is Object3DLike {
  return (
    isObj(value) &&
    Array.isArray(value.children) &&
    isObj(value.position) &&
    isObj(value.rotation) &&
    typeof value.add === 'function' &&
    typeof value.remove === 'function'
  );
}

export function resolveCornerWingTHREE(App: AppContainer) {
  return assertTHREE(App, 'native/builder/corner_wing.THREE');
}

export function resolveCornerWingServices(App: AppContainer) {
  const ro = requireBuilderRenderOps(App, 'native/builder/corner_wing.renderOps');
  const addOutlinesFn = getBuilderAddOutlines(App);
  const getMaterial = requireBuilderGetMaterial(App, 'native/builder/corner_wing.materials.getMaterial');
  const createDoorVisualRaw = requireBuilderCreateDoorVisual(
    App,
    'native/builder/corner_wing.modules.createDoorVisual'
  );
  const createInternalDrawerBoxRaw = requireBuilderCreateInternalDrawerBox(
    App,
    'native/builder/corner_wing.modules.createInternalDrawerBox'
  );
  const addRealisticHanger = requireBuilderAddRealisticHanger(
    App,
    'native/builder/corner_wing.contents.addRealisticHanger'
  );
  const addHangingClothes = requireBuilderAddHangingClothes(
    App,
    'native/builder/corner_wing.contents.addHangingClothes'
  );
  const addFoldedClothes = requireBuilderAddFoldedClothes(
    App,
    'native/builder/corner_wing.contents.addFoldedClothes'
  );

  function addOutlines(mesh: unknown) {
    if (addOutlinesFn) return addOutlinesFn(mesh);
  }

  const createDoorVisual: BuilderCreateDoorVisualFn = (
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
    options
  ) => {
    const out = createDoorVisualRaw(
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
      options
    );
    if (!isObject3DLike(out)) {
      throw new TypeError('[WardrobePro] createDoorVisual returned a non-Object3D value.');
    }
    return out;
  };

  const createInternalDrawerBox: BuilderCreateInternalDrawerBoxFn = (
    w,
    h,
    d,
    mat,
    drawerMat,
    outlineFunc,
    hasDivider,
    addHandle,
    options
  ) => {
    const out = createInternalDrawerBoxRaw(
      w,
      h,
      d,
      mat,
      drawerMat,
      outlineFunc,
      hasDivider,
      addHandle,
      options
    );
    if (!isObject3DLike(out)) {
      throw new TypeError('[WardrobePro] createInternalDrawerBox returned a non-Object3D value.');
    }
    return out;
  };

  return {
    ro,
    addOutlines,
    getMaterial,
    createDoorVisual,
    createInternalDrawerBox,
    addRealisticHanger,
    addHangingClothes,
    addFoldedClothes,
  };
}

export type { CornerBuildCtx, CornerWingInstallModules, MaterialsLike, ValueRecord };
