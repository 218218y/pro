// Native Builder materials factory (ESM)
//
// Goals:
// - Real ESM (no IIFE, no implicit side-effects on import)
// - No `js/**` imports on the ESM path
// - Installer binds onto App.services.builder.materials (no App.builder* globals)
// - Keeps caches stable through canonical render cache/meta seams

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { ensureBuilderDepsNamespace } from '../runtime/builder_deps_access.js';
import {
  ensureMaterialsFactoryApp,
  ensureMaterialsRuntime,
  isValueRecord,
} from './materials_factory_shared.js';
import { getDataURLTexture, generateTexture } from './materials_factory_texture_runtime.js';
import { getMaterial } from './materials_factory_material_policy.js';

import type { AppContainer, BuilderMaterialsServiceLike } from '../../../types';

export { getDataURLTexture, generateTexture, getMaterial };

type InstallableBuilderMaterialsService = BuilderMaterialsServiceLike & Record<string, unknown>;
type MaterialsFactoryInstallContext = {
  App: AppContainer;
};

type MaterialsFactoryCallableKey = 'getDataURLTexture' | 'generateTexture' | 'getMaterial';

const MATERIALS_FACTORY_CANONICAL_KEYS: Record<MaterialsFactoryCallableKey, string> = {
  getDataURLTexture: '__wpBuilderMaterialsGetDataURLTexture',
  generateTexture: '__wpBuilderMaterialsGenerateTexture',
  getMaterial: '__wpBuilderMaterialsGetMaterial',
};

const materialsFactoryInstallContexts = new WeakMap<object, MaterialsFactoryInstallContext>();

function createMaterialsFactoryInstallContext(App: AppContainer): MaterialsFactoryInstallContext {
  return { App };
}

function refreshMaterialsFactoryInstallContext(
  context: MaterialsFactoryInstallContext,
  App: AppContainer
): MaterialsFactoryInstallContext {
  context.App = App;
  return context;
}

function resolveMaterialsFactoryInstallContext(
  materials: InstallableBuilderMaterialsService,
  App: AppContainer
): MaterialsFactoryInstallContext {
  let context = materialsFactoryInstallContexts.get(materials);
  if (!context) {
    context = createMaterialsFactoryInstallContext(App);
    materialsFactoryInstallContexts.set(materials, context);
    return context;
  }
  return refreshMaterialsFactoryInstallContext(context, App);
}

function clearLegacyInstalledMaterialsFactoryDrift(materials: InstallableBuilderMaterialsService): void {
  if (materials.__esm_materials_factory_v1 !== true) return;
  const keys = Object.keys(MATERIALS_FACTORY_CANONICAL_KEYS) as MaterialsFactoryCallableKey[];
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const stableKey = MATERIALS_FACTORY_CANONICAL_KEYS[key];
    if (typeof materials[stableKey] !== 'function') {
      delete materials[key];
    }
  }
}

export function installBuilderMaterialsFactory(appIn: unknown) {
  const runtime = ensureMaterialsRuntime(ensureMaterialsFactoryApp(appIn));
  const { App } = runtime;
  const builder = ensureBuilderService(App, 'native/builder/materials_factory');
  const materials: InstallableBuilderMaterialsService = (builder.materials = isValueRecord(builder.materials)
    ? builder.materials
    : {});
  const context = resolveMaterialsFactoryInstallContext(materials, App);

  clearLegacyInstalledMaterialsFactoryDrift(materials);

  installStableSurfaceMethod(
    materials,
    'getDataURLTexture',
    MATERIALS_FACTORY_CANONICAL_KEYS.getDataURLTexture,
    () => {
      return (dataUrl: unknown) => getDataURLTexture(context.App, dataUrl);
    }
  );
  installStableSurfaceMethod(
    materials,
    'generateTexture',
    MATERIALS_FACTORY_CANONICAL_KEYS.generateTexture,
    () => {
      return (colorHex: unknown, type: unknown) => generateTexture(context.App, colorHex, type);
    }
  );
  installStableSurfaceMethod(materials, 'getMaterial', MATERIALS_FACTORY_CANONICAL_KEYS.getMaterial, () => {
    return (color: unknown, type: unknown, useCustomTexture?: unknown, customTextureDataURL?: unknown) =>
      getMaterial(context.App, color, type, useCustomTexture, customTextureDataURL);
  });

  try {
    const deps = ensureBuilderDepsNamespace(App, 'materials');
    if (deps.getMaterial !== materials.getMaterial) deps.getMaterial = materials.getMaterial;
    if (deps.generateTexture !== materials.generateTexture) deps.generateTexture = materials.generateTexture;
    if (deps.getDataURLTexture !== materials.getDataURLTexture)
      deps.getDataURLTexture = materials.getDataURLTexture;
  } catch {}

  try {
    materials.__esm_materials_factory_v1 = true;
  } catch {}

  return materials;
}
