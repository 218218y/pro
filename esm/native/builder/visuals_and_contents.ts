// Native Builder Visuals + Contents (ESM)
//
// Installer/public surface for builder visuals and contents.
// Heavy door-visual geometry lives in ./visuals_and_contents_door_visual.ts.

import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';
import { createInternalDrawerBox, buildChestOnly } from './visuals_chest_mode.js';
import { addHangingClothes, addFoldedClothes, addRealisticHanger } from './visuals_contents.js';
import { createDoorVisual } from './visuals_and_contents_door_visual.js';
import {
  __ensureApp,
  __ensureBuilderModulesSlot,
  __ensureBuilderContentsSlot,
} from './visuals_and_contents_shared.js';
import {
  ensureBuilderService,
  getBuilderContentsService,
  getBuilderModulesService,
} from '../runtime/builder_service_access.js';

import type {
  AppContainer,
  BuilderAddFoldedClothesFn,
  BuilderAddHangingClothesFn,
  BuilderAddRealisticHangerFn,
  BuilderBuildChestOnlyFn,
  BuilderCreateDoorVisualFn,
  BuilderCreateInternalDrawerBoxFn,
  BuilderContentsSurfaceLike,
  BuilderModulesSurfaceLike,
} from '../../../types/index.js';

export {
  createDoorVisual,
  createInternalDrawerBox,
  buildChestOnly,
  addHangingClothes,
  addFoldedClothes,
  addRealisticHanger,
};

type InstallableBuilderModulesSurface = BuilderModulesSurfaceLike & Record<string, unknown>;
type InstallableBuilderContentsSurface = BuilderContentsSurfaceLike & Record<string, unknown>;
type VisualsAndContentsInstallContext = {
  App: AppContainer;
};

type BuilderModulesCallableKey = 'createDoorVisual' | 'createInternalDrawerBox' | 'buildChestOnly';
type BuilderContentsCallableKey = 'addHangingClothes' | 'addFoldedClothes' | 'addRealisticHanger';

const BUILDER_MODULES_CANONICAL_KEYS: Record<BuilderModulesCallableKey, string> = {
  createDoorVisual: '__wpBuilderModulesCreateDoorVisual',
  createInternalDrawerBox: '__wpBuilderModulesCreateInternalDrawerBox',
  buildChestOnly: '__wpBuilderModulesBuildChestOnly',
};

const BUILDER_CONTENTS_CANONICAL_KEYS: Record<BuilderContentsCallableKey, string> = {
  addHangingClothes: '__wpBuilderContentsAddHangingClothes',
  addFoldedClothes: '__wpBuilderContentsAddFoldedClothes',
  addRealisticHanger: '__wpBuilderContentsAddRealisticHanger',
};

const BUILDER_MODULES_CALLABLE_KEYS: readonly BuilderModulesCallableKey[] = [
  'createDoorVisual',
  'createInternalDrawerBox',
  'buildChestOnly',
];

const BUILDER_CONTENTS_CALLABLE_KEYS: readonly BuilderContentsCallableKey[] = [
  'addHangingClothes',
  'addFoldedClothes',
  'addRealisticHanger',
];

const visualsAndContentsInstallContexts = new WeakMap<object, VisualsAndContentsInstallContext>();

export const builderModules = {
  createDoorVisual,
  createInternalDrawerBox,
  buildChestOnly,
};

export const builderContents = {
  addHangingClothes,
  addFoldedClothes,
  addRealisticHanger,
};

function createVisualsAndContentsInstallContext(App: AppContainer): VisualsAndContentsInstallContext {
  return { App };
}

function refreshVisualsAndContentsInstallContext(
  context: VisualsAndContentsInstallContext,
  App: AppContainer
): VisualsAndContentsInstallContext {
  context.App = App;
  return context;
}

function resolveVisualsAndContentsInstallContext(
  surface: InstallableBuilderModulesSurface | InstallableBuilderContentsSurface,
  App: AppContainer
): VisualsAndContentsInstallContext {
  let context = visualsAndContentsInstallContexts.get(surface);
  if (!context) {
    context = createVisualsAndContentsInstallContext(App);
    visualsAndContentsInstallContexts.set(surface, context);
    return context;
  }
  return refreshVisualsAndContentsInstallContext(context, App);
}

function clearLegacyInstalledVisualsDrift(modules: InstallableBuilderModulesSurface): void {
  if (modules.__esm_visuals_v1 !== true) return;
  for (const key of BUILDER_MODULES_CALLABLE_KEYS) {
    const stableKey = BUILDER_MODULES_CANONICAL_KEYS[key];
    if (typeof modules[stableKey] !== 'function') {
      delete modules[key];
    }
  }
}

function clearLegacyInstalledContentsDrift(contents: InstallableBuilderContentsSurface): void {
  if (contents.__esm_contents_v1 !== true) return;
  for (const key of BUILDER_CONTENTS_CALLABLE_KEYS) {
    const stableKey = BUILDER_CONTENTS_CANONICAL_KEYS[key];
    if (typeof contents[stableKey] !== 'function') {
      delete contents[key];
    }
  }
}

function __bindWithApp<TArgs extends unknown[], TResult>(
  context: VisualsAndContentsInstallContext,
  fn: (App: AppContainer, ...args: TArgs) => TResult
): (...args: TArgs) => TResult {
  return (...args: TArgs) => fn(context.App, ...args);
}

export function installBuilderVisualsAndContents(App: AppContainer) {
  App = __ensureApp(App);

  const B = ensureBuilderService(App, 'native/builder/visuals_and_contents.install');
  const M = __ensureBuilderModulesSlot(B);
  const C = __ensureBuilderContentsSlot(B);
  const modulesContext = resolveVisualsAndContentsInstallContext(M, App);
  const contentsContext = resolveVisualsAndContentsInstallContext(C, App);

  clearLegacyInstalledVisualsDrift(M);
  clearLegacyInstalledContentsDrift(C);

  installStableSurfaceMethod(M, 'createDoorVisual', BUILDER_MODULES_CANONICAL_KEYS.createDoorVisual, () => {
    return __bindWithApp<Parameters<BuilderCreateDoorVisualFn>, ReturnType<BuilderCreateDoorVisualFn>>(
      modulesContext,
      createDoorVisual
    );
  });
  installStableSurfaceMethod(
    M,
    'createInternalDrawerBox',
    BUILDER_MODULES_CANONICAL_KEYS.createInternalDrawerBox,
    () => {
      return __bindWithApp<
        Parameters<BuilderCreateInternalDrawerBoxFn>,
        ReturnType<BuilderCreateInternalDrawerBoxFn>
      >(modulesContext, createInternalDrawerBox);
    }
  );
  installStableSurfaceMethod(M, 'buildChestOnly', BUILDER_MODULES_CANONICAL_KEYS.buildChestOnly, () => {
    return __bindWithApp<Parameters<BuilderBuildChestOnlyFn>, ReturnType<BuilderBuildChestOnlyFn>>(
      modulesContext,
      buildChestOnly
    );
  });

  installStableSurfaceMethod(
    C,
    'addHangingClothes',
    BUILDER_CONTENTS_CANONICAL_KEYS.addHangingClothes,
    () => {
      return __bindWithApp<Parameters<BuilderAddHangingClothesFn>, ReturnType<BuilderAddHangingClothesFn>>(
        contentsContext,
        addHangingClothes
      );
    }
  );
  installStableSurfaceMethod(C, 'addFoldedClothes', BUILDER_CONTENTS_CANONICAL_KEYS.addFoldedClothes, () => {
    return __bindWithApp<Parameters<BuilderAddFoldedClothesFn>, ReturnType<BuilderAddFoldedClothesFn>>(
      contentsContext,
      addFoldedClothes
    );
  });
  installStableSurfaceMethod(
    C,
    'addRealisticHanger',
    BUILDER_CONTENTS_CANONICAL_KEYS.addRealisticHanger,
    () => {
      return __bindWithApp<Parameters<BuilderAddRealisticHangerFn>, ReturnType<BuilderAddRealisticHangerFn>>(
        contentsContext,
        addRealisticHanger
      );
    }
  );

  try {
    M.__esm_visuals_v1 = true;
  } catch {}
  try {
    C.__esm_contents_v1 = true;
  } catch {}

  return { builderModules: M, builderContents: C };
}

export function getBuilderModules(App: AppContainer) {
  App = __ensureApp(App);
  return getBuilderModulesService(App) || {};
}

export function getBuilderContents(App: AppContainer) {
  App = __ensureApp(App);
  return getBuilderContentsService(App) || {};
}
