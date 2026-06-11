// Native Builder materials application (ESM)
//
// Legacy source: `js/builder/pro_builder_materials_apply.js`
//
// Goals:
// - Real ESM (no IIFE, no implicit side-effects on import)
// - No legacy `js/**` imports on the ESM path
// - Installer binds onto App.services.builder.materials + renderOps (no App.builder* globals).

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { getWardrobeGroup } from '../runtime/render_access.js';
import {
  ensureBuilderService,
  getBuilderService,
  refreshBuilderHandles,
} from '../runtime/builder_service_access.js';
import { getBuilderMirrorMaterial } from './materials_apply_mirror.js';
import {
  readPartId,
  readStackKey,
  resolveMaterialsApplyColorContext,
} from './materials_apply_color_policy.js';
import { applyMaterialsToWardrobeTree } from './materials_apply_traversal.js';
import {
  asObject,
  ensureMaterialsApplySurface,
  maybeMaterialsApplyApp,
  pickMaterialsApplyApp,
  reportMaterialsApplySoft,
  type MirrorMaterialOpts,
  type MaterialsApplyRenderOpsLike,
  type MaterialsApplyService,
  type WardrobeMeshLike,
} from './materials_apply_shared.js';

export function getMirrorMaterial(appIn: unknown, opts?: MirrorMaterialOpts) {
  const App = ensureMaterialsApplySurface(
    pickMaterialsApplyApp(appIn, 'native/builder/materials_apply.getMirrorMaterial')
  );
  return getBuilderMirrorMaterial(App, opts);
}

export function applyMaterials(appIn: unknown) {
  const maybeApp = maybeMaterialsApplyApp(appIn);
  if (!maybeApp) return false;

  const App = ensureMaterialsApplySurface(maybeApp);
  const wardrobeGroup = asObject<WardrobeMeshLike>(getWardrobeGroup(App));
  if (!wardrobeGroup) return false;

  const materialsService = getBuilderService(App)?.materials || null;
  const getMaterial =
    materialsService && typeof materialsService.getMaterial === 'function'
      ? materialsService.getMaterial
      : null;
  if (typeof getMaterial !== 'function') return false;

  const colorContext = resolveMaterialsApplyColorContext({ App, getMaterial });
  if (!colorContext) return false;

  const changed = applyMaterialsToWardrobeTree({
    wardrobeGroup,
    getPartMat: colorContext.getPartMat,
    readPartId,
    readStackKey,
  });

  if (!changed) return true;

  try {
    refreshBuilderHandles(App, { triggerRender: true, updateShadows: false });
  } catch (error) {
    reportMaterialsApplySoft(App, 'applyMaterials.refreshHandles', error);
  }
  return true;
}

function hasStableCallable(surface: object, stableKey: string): boolean {
  return typeof Reflect.get(surface, stableKey) === 'function';
}

const MATERIALS_GET_MIRROR_CANONICAL_KEY = '__wpBuilderMaterialsGetMirrorMaterial';
const MATERIALS_APPLY_CANONICAL_KEY = '__wpBuilderMaterialsApplyMaterials';
const MATERIALS_RENDER_GET_MIRROR_CANONICAL_KEY = '__wpBuilderRenderGetMirrorMaterial';
const MATERIALS_RENDER_APPLY_CANONICAL_KEY = '__wpBuilderRenderApplyMaterials';

export function installBuilderMaterialsApply(appIn: unknown) {
  const App = ensureMaterialsApplySurface(
    pickMaterialsApplyApp(appIn, 'native/builder/materials_apply.install')
  );
  const builder = ensureBuilderService(App, 'native/builder/materials_apply.install');
  const materials = (builder.materials = asObject<MaterialsApplyService>(builder.materials) || {});
  const renderOps = (builder.renderOps = asObject<MaterialsApplyRenderOpsLike>(builder.renderOps) || {});
  if (materials.__esm_materials_apply_v1) {
    if (!hasStableCallable(materials, MATERIALS_GET_MIRROR_CANONICAL_KEY)) delete materials.getMirrorMaterial;
    if (!hasStableCallable(materials, MATERIALS_APPLY_CANONICAL_KEY)) delete materials.applyMaterials;
    if (!hasStableCallable(renderOps, MATERIALS_RENDER_GET_MIRROR_CANONICAL_KEY))
      delete renderOps.getMirrorMaterial;
    if (!hasStableCallable(renderOps, MATERIALS_RENDER_APPLY_CANONICAL_KEY)) delete renderOps.applyMaterials;
  }

  installStableSurfaceMethod(materials, 'getMirrorMaterial', MATERIALS_GET_MIRROR_CANONICAL_KEY, () => {
    return (opts?: MirrorMaterialOpts) => getMirrorMaterial(App, opts);
  });
  installStableSurfaceMethod(materials, 'applyMaterials', MATERIALS_APPLY_CANONICAL_KEY, () => {
    return () => applyMaterials(App);
  });

  installStableSurfaceMethod(
    renderOps,
    'getMirrorMaterial',
    MATERIALS_RENDER_GET_MIRROR_CANONICAL_KEY,
    () => {
      return (args?: unknown) => {
        const safeArgs = asObject<MirrorMaterialOpts>(args) || {};
        return getMirrorMaterial(App, { THREE: safeArgs.THREE || null });
      };
    }
  );
  installStableSurfaceMethod(renderOps, 'applyMaterials', MATERIALS_RENDER_APPLY_CANONICAL_KEY, () => {
    return () => materials.applyMaterials?.();
  });

  try {
    materials.__esm_materials_apply_v1 = true;
  } catch (error) {
    reportMaterialsApplySoft(App, 'installBuilderMaterialsApply.markInstalled', error);
  }

  return materials;
}
