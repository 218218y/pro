import type { AppContainer, BuildReactionsServiceLike } from '../../../types';

import { resolveInstallContext, type InstallContext } from '../runtime/install_context.js';
import { ensureBuildReactionsService } from '../runtime/build_reactions_access.js';
import { installStableSurfaceMethod } from '../runtime/stable_surface_methods.js';

import { updateCameraAfterBuild } from './build_reactions_camera.js';
import { updateLightsAfterBuild } from './build_reactions_lights.js';
import { reportBuildReactionsSoftError } from './build_reactions_shared.js';

type BuildReactionsServiceWithCanonical = BuildReactionsServiceLike & {
  __wpAfterBuild?: BuildReactionsServiceLike['afterBuild'];
};

const buildReactionsInstallContexts = new WeakMap<object, InstallContext<AppContainer>>();

function createCanonicalAfterBuild(
  context: InstallContext<AppContainer>
): NonNullable<BuildReactionsServiceLike['afterBuild']> {
  return (_ok?: boolean) => {
    try {
      updateLightsAfterBuild(context.App);
    } catch (error) {
      reportBuildReactionsSoftError(context.App, 'updateLightsAfterBuild', error);
    }
    try {
      updateCameraAfterBuild(context.App);
    } catch (error) {
      reportBuildReactionsSoftError(context.App, 'updateCameraAfterBuild', error);
    }
  };
}

export function installBuildReactionsService(App: AppContainer): BuildReactionsServiceLike {
  if (!App || typeof App !== 'object') throw new Error('installBuildReactionsService(App): App is required');

  const service: BuildReactionsServiceWithCanonical = ensureBuildReactionsService(App);
  const context = resolveInstallContext(buildReactionsInstallContexts, service, App);
  installStableSurfaceMethod(service, 'afterBuild', '__wpAfterBuild', () =>
    createCanonicalAfterBuild(context)
  );

  service.__esm_v1 = true;
  return service;
}
