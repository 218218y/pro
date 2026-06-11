import { assertApp } from '../runtime/api.js';
import { ensureBuilderService } from '../runtime/builder_service_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

import { buildCornerWing } from './corner_wing.js';
import { asObj } from './corner_wing_runtime.js';

import type { AppContainer, BuilderBuildCornerWingFn } from '../../../types';
import type { CornerWingInstallModules } from './corner_wing_runtime.js';

const CORNER_WING_BUILD_CANONICAL_KEY = '__wpBuilderBuildCornerWing';

type CornerWingInstallContext = {
  App: AppContainer;
};

type CornerWingInstallSurface = CornerWingInstallModules & {
  [CORNER_WING_BUILD_CANONICAL_KEY]?: BuilderBuildCornerWingFn;
  __installContext?: CornerWingInstallContext;
};

function readInstallContext(modules: CornerWingInstallSurface): CornerWingInstallContext {
  const current = modules.__installContext;
  return current && current.App ? current : { App: assertApp(null, 'native/builder/corner_wing.install') };
}

function updateInstallContext(modules: CornerWingInstallSurface, App: AppContainer): void {
  modules.__installContext = { App };
}

function shouldInvalidateLegacyCornerWingSurface(modules: CornerWingInstallSurface): boolean {
  return (
    modules.__esm_corner_wing_v1 === true && typeof modules[CORNER_WING_BUILD_CANONICAL_KEY] !== 'function'
  );
}

export function installBuilderCornerWing(App: unknown) {
  const A = assertApp(App, 'native/builder/corner_wing.install');

  const builder = ensureBuilderService(A, 'native/builder/corner_wing.install');
  const builderRec = asObj(builder) ?? {};

  const rawModules = asObj(builderRec.modules);
  const modules: CornerWingInstallSurface = (rawModules ?? {}) as CornerWingInstallSurface;
  if (!rawModules) builderRec.modules = modules;

  updateInstallContext(modules, A);

  if (shouldInvalidateLegacyCornerWingSurface(modules)) {
    delete modules.buildCornerWing;
  }

  installStableSurfaceMethod(modules, 'buildCornerWing', CORNER_WING_BUILD_CANONICAL_KEY, () => {
    const stableBuildCornerWing: BuilderBuildCornerWingFn = (
      mainW,
      mainH,
      mainD,
      woodThick,
      startY,
      materials,
      metaOrCtx,
      ctxMaybe
    ) => {
      const installContext = readInstallContext(modules);
      return buildCornerWing(
        mainW,
        mainH,
        mainD,
        woodThick,
        startY,
        materials,
        metaOrCtx,
        ctxMaybe ?? { App: installContext.App }
      );
    };
    return stableBuildCornerWing;
  });

  modules.__esm_corner_wing_v1 = true;
  return A;
}
